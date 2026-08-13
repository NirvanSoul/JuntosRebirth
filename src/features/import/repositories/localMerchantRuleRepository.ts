import { randomUUID } from 'expo-crypto';

import type {
  ImportMerchantRule,
  ImportMerchantRuleSyncPayload,
  ImportMerchantRuleSyncRecord,
} from '@/features/import/types';
import { getLocalDatabase } from '@/lib/storage/localDatabase';
import { getOrCreateInstallationId } from '@/lib/storage/localIdentity';

type ImportMerchantRuleRow = {
  id: string;
  space_id: string;
  normalized_merchant: string;
  category_id: string;
  confirmations: number;
  source: string;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  sync_status: string;
};

type SyncAccountRow = { user_id: string };

export type SaveLocalMerchantRuleInput = {
  spaceId: string;
  normalizedMerchant: string;
  categoryId: string;
  source?: ImportMerchantRule['source'];
};

const ruleSources = new Set<ImportMerchantRule['source']>([
  'manual',
  'import_correction',
  'system',
]);
const uploadableStatuses = "('local_only', 'pending', 'failed', 'syncing')";

function mapRule(row: ImportMerchantRuleRow): ImportMerchantRule {
  if (!ruleSources.has(row.source as ImportMerchantRule['source'])) {
    throw new Error(
      'La regla local de importación contiene valores no reconocidos',
    );
  }

  return {
    id: row.id,
    spaceId: row.space_id,
    normalizedMerchant: row.normalized_merchant,
    categoryId: row.category_id,
    confirmations: row.confirmations,
    source: row.source as ImportMerchantRule['source'],
    ...(row.last_used_at === null ? {} : { lastUsedAt: row.last_used_at }),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertRuleInput(input: SaveLocalMerchantRuleInput): void {
  if (!input.spaceId || !input.categoryId || !input.normalizedMerchant.trim()) {
    throw new Error('La regla local de importación no es válida');
  }
}

export async function listLocalMerchantRules(
  spaceId: string,
): Promise<ImportMerchantRule[]> {
  const database = await getLocalDatabase();
  const rows = await database.getAllAsync<ImportMerchantRuleRow>(
    `SELECT id, space_id, normalized_merchant, category_id, confirmations,
            source, last_used_at, created_at, updated_at, sync_status
       FROM import_merchant_rules
      WHERE space_id = ?
      ORDER BY updated_at DESC`,
    spaceId,
  );

  return rows.map(mapRule);
}

/**
 * La última corrección explícita gana. SQLite hace el upsert atómico para que
 * nunca existan dos reglas activas para el mismo comercio dentro de un espacio.
 */
export async function saveLocalMerchantRule(
  input: SaveLocalMerchantRuleInput,
): Promise<ImportMerchantRule> {
  assertRuleInput(input);
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  const normalizedMerchant = input.normalizedMerchant.trim();
  const source = input.source ?? 'import_correction';
  const id = randomUUID();

  await database.runAsync(
    `INSERT INTO import_merchant_rules (
       id, space_id, normalized_merchant, category_id, confirmations, source,
       last_used_at, sync_status, created_at, updated_at
     ) VALUES (?, ?, ?, ?, 1, ?, ?, 'local_only', ?, ?)
     ON CONFLICT (space_id, normalized_merchant) DO UPDATE SET
       category_id = excluded.category_id,
       confirmations = import_merchant_rules.confirmations + 1,
       source = excluded.source,
       last_used_at = excluded.last_used_at,
       updated_at = excluded.updated_at,
       sync_status = CASE
         WHEN import_merchant_rules.sync_status = 'local_only' THEN 'local_only'
         ELSE 'pending'
       END`,
    id,
    input.spaceId,
    normalizedMerchant,
    input.categoryId,
    source,
    now,
    now,
    now,
  );

  const saved = await database.getFirstAsync<ImportMerchantRuleRow>(
    `SELECT id, space_id, normalized_merchant, category_id, confirmations,
            source, last_used_at, created_at, updated_at, sync_status
       FROM import_merchant_rules
      WHERE space_id = ? AND normalized_merchant = ?`,
    input.spaceId,
    normalizedMerchant,
  );
  if (!saved)
    throw new Error('No se pudo guardar la regla local de importación');

  return mapRule(saved);
}

async function markRuleRows(
  ids: readonly string[],
  status: 'syncing' | 'synced' | 'failed',
  onlyIfSyncing = false,
): Promise<void> {
  if (ids.length === 0) return;
  const database = await getLocalDatabase();
  const placeholders = ids.map(() => '?').join(', ');
  await database.runAsync(
    `UPDATE import_merchant_rules SET sync_status = ?
      WHERE id IN (${placeholders})${onlyIfSyncing ? " AND sync_status = 'syncing'" : ''}`,
    status,
    ...ids,
  );
}

/** Prepara las correcciones locales para el RPC tras la migración de espacios/categorías. */
export async function prepareLocalMerchantRuleSync(
  userId: string,
): Promise<ImportMerchantRuleSyncPayload> {
  if (!userId) throw new Error('La sesión autenticada no es válida');
  const database = await getLocalDatabase();
  const account = await database.getFirstAsync<SyncAccountRow>(
    'SELECT user_id FROM local_sync_account WHERE singleton_id = 1',
  );
  if (!account || account.user_id !== userId) {
    throw new Error('Las reglas locales no están asociadas a esta cuenta');
  }

  const installationId = await getOrCreateInstallationId(database);
  const rows = await database.getAllAsync<ImportMerchantRuleRow>(
    `SELECT id, space_id, normalized_merchant, category_id, confirmations,
            source, last_used_at, created_at, updated_at, sync_status
       FROM import_merchant_rules
      WHERE sync_status IN ${uploadableStatuses}`,
  );
  const rules = rows.map((row): ImportMerchantRuleSyncRecord => ({
    id: row.id,
    spaceLocalId: row.space_id,
    categoryLocalId: row.category_id,
    normalizedMerchant: row.normalized_merchant,
    confirmations: row.confirmations,
    source: mapRule(row).source,
    ...(row.last_used_at === null ? {} : { lastUsedAt: row.last_used_at }),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
  await markRuleRows(
    rules.map((rule) => rule.id),
    'syncing',
  );

  return { installationId, userId, rules };
}

export async function completeLocalMerchantRuleSync(
  payload: ImportMerchantRuleSyncPayload,
): Promise<void> {
  const database = await getLocalDatabase();
  for (const rule of payload.rules) {
    await database.runAsync(
      `UPDATE import_merchant_rules SET sync_status = 'synced'
        WHERE id = ? AND updated_at = ? AND sync_status = 'syncing'`,
      rule.id,
      rule.updatedAt,
    );
  }
}

export async function failLocalMerchantRuleSync(
  payload: ImportMerchantRuleSyncPayload,
): Promise<void> {
  await markRuleRows(
    payload.rules.map((rule) => rule.id),
    'failed',
    true,
  );
}
