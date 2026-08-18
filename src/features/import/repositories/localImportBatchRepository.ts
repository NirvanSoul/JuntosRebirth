import { randomUUID } from 'expo-crypto';

import type {
  ImportIssue,
  ImportBatchSyncPayload,
  ImportBatchSyncRecord,
  ImportItemSyncRecord,
  ImportedTransactionCandidate,
  ImportSourceExtension,
  LocalImportBatch,
  LocalImportBatchStatus,
  LocalImportItemStatus,
} from '@/features/import/types';
import { getLocalDatabase } from '@/lib/storage/localDatabase';
import { getOrCreateInstallationId } from '@/lib/storage/localIdentity';
import { toImportDisplayTitle } from '@/features/import/normalization/normalizeDescription';

type SyncAccountRow = { user_id: string };
type ImportBatchSyncRow = {
  id: string;
  space_id: string;
  source_type: string;
  status: string;
  total_items: number;
  review_items: number;
  duplicate_items: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  file_hash: string | null;
};
type ImportItemSyncRow = {
  id: string;
  batch_id: string;
  final_category_id: string | null;
  duplicate_transaction_id: string | null;
  source_row: number;
  raw_description: string;
  normalized_merchant: string;
  occurred_on: string | null;
  amount_minor: number | null;
  currency: string | null;
  movement_type: string;
  duplicate_status: string;
  item_status: string;
  is_selected: number;
  issues: string;
  created_at: string;
  updated_at: string;
};

type StoredImportItemRow = {
  id: string;
  source_row: number;
  raw_description: string;
  normalized_merchant: string;
  occurred_on: string | null;
  amount_minor: number | null;
  currency: string | null;
  movement_type: ImportedTransactionCandidate['type'];
  suggested_category_id: string | null;
  final_category_id: string | null;
  duplicate_status: ImportedTransactionCandidate['duplicateStatus'];
  issues: string;
  is_selected: number;
};

export type ResumableLocalImportBatch = LocalImportBatch & {
  candidates: readonly ImportedTransactionCandidate[];
};

const sourceExtensions = new Set<ImportSourceExtension>(['xls', 'xlsx', 'csv']);
const uploadableStatuses = "('local_only', 'pending', 'failed', 'syncing')";

function needsReview(candidate: ImportedTransactionCandidate): boolean {
  return candidate.issues.length > 0 || candidate.categoryId === null;
}

function itemStatus(
  candidate: ImportedTransactionCandidate,
): LocalImportItemStatus {
  if (candidate.duplicateStatus === 'exact') return 'duplicate';
  return needsReview(candidate) ? 'pending' : 'ready';
}

function assertCandidates(
  candidates: readonly ImportedTransactionCandidate[],
): void {
  if (candidates.some((candidate) => candidate.sourceRowNumber <= 0)) {
    throw new Error('El lote local de importación contiene una fila inválida');
  }
}

function counts(candidates: readonly ImportedTransactionCandidate[]) {
  const duplicateItems = candidates.filter(
    (candidate) => candidate.duplicateStatus === 'exact',
  ).length;
  const reviewItems = candidates.filter(
    (candidate) =>
      candidate.duplicateStatus !== 'exact' && needsReview(candidate),
  ).length;
  return { duplicateItems, reviewItems };
}

export async function createLocalImportBatch(input: {
  spaceId: string;
  sourceType: ImportSourceExtension;
  candidates: readonly ImportedTransactionCandidate[];
  fileHash?: string;
}): Promise<LocalImportBatch> {
  if (!input.spaceId || !sourceExtensions.has(input.sourceType)) {
    throw new Error('El lote local de importación no es válido');
  }
  assertCandidates(input.candidates);

  const database = await getLocalDatabase();
  const id = randomUUID();
  const now = new Date().toISOString();
  const { duplicateItems, reviewItems } = counts(input.candidates);
  const status: LocalImportBatchStatus =
    reviewItems > 0 ? 'needs_review' : 'ready';

  await database.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync(
      `INSERT INTO import_batches (
         id, space_id, source_type, status, total_items, review_items,
         duplicate_items, sync_status, created_at, updated_at, file_hash
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 'local_only', ?, ?, ?)`,
      id,
      input.spaceId,
      input.sourceType,
      status,
      input.candidates.length,
      reviewItems,
      duplicateItems,
      now,
      now,
      input.fileHash ?? null,
    );
    for (const candidate of input.candidates) {
      await transaction.runAsync(
        `INSERT INTO import_items (
           id, batch_id, space_id, source_row, raw_description,
           normalized_merchant, occurred_on, amount_minor, currency,
           movement_type, suggested_category_id, final_category_id,
           duplicate_status, item_status, is_selected, issues, sync_status,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'local_only', ?, ?)`,
        candidate.id,
        id,
        input.spaceId,
        candidate.sourceRowNumber,
        candidate.rawDescription,
        candidate.normalizedMerchant,
        candidate.occurredOn,
        candidate.amountMinor,
        candidate.currency,
        candidate.type,
        candidate.suggestedCategoryId,
        candidate.categoryId,
        candidate.duplicateStatus,
        itemStatus(candidate),
        candidate.selected ? 1 : 0,
        JSON.stringify(candidate.issues),
        now,
        now,
      );
    }
  });

  return {
    id,
    spaceId: input.spaceId,
    sourceType: input.sourceType,
    status,
    totalItems: input.candidates.length,
    reviewItems,
    duplicateItems,
    createdAt: now,
    updatedAt: now,
    ...(input.fileHash === undefined ? {} : { fileHash: input.fileHash }),
  };
}

/**
 * Busca una importación previa (cualquier estado salvo `cancelled`) con el
 * mismo archivo en este espacio, para avisar antes de duplicar movimientos
 * (Bible §67). Nunca bloquea por sí sola: el usuario decide si continúa.
 */
export async function findLocalImportBatchByFileHash(
  spaceId: string,
  fileHash: string,
): Promise<{
  id: string;
  status: LocalImportBatchStatus;
  createdAt: string;
} | null> {
  if (!spaceId || !fileHash) return null;
  const database = await getLocalDatabase();
  const row = await database.getFirstAsync<{
    id: string;
    status: string;
    created_at: string;
  }>(
    `SELECT id, status, created_at FROM import_batches
      WHERE space_id = ? AND file_hash = ? AND status <> 'cancelled'
      ORDER BY created_at DESC LIMIT 1`,
    spaceId,
    fileHash,
  );
  if (!row) return null;
  return {
    id: row.id,
    status: row.status as LocalImportBatchStatus,
    createdAt: row.created_at,
  };
}

/** Guarda solamente el resultado normalizado de la revisión, nunca el archivo. */
export async function saveLocalImportBatchReview(
  batchId: string,
  candidates: readonly ImportedTransactionCandidate[],
): Promise<void> {
  assertCandidates(candidates);
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  const { duplicateItems, reviewItems } = counts(candidates);
  const status: LocalImportBatchStatus =
    reviewItems > 0 ? 'needs_review' : 'ready';

  await database.withExclusiveTransactionAsync(async (transaction) => {
    for (const candidate of candidates) {
      const result = await transaction.runAsync(
        `UPDATE import_items
            SET final_category_id = ?, currency = ?, duplicate_status = ?,
                item_status = ?, is_selected = ?, issues = ?, updated_at = ?,
                sync_status = CASE
                  WHEN sync_status = 'local_only' THEN 'local_only' ELSE 'pending'
                END
          WHERE id = ? AND batch_id = ?`,
        candidate.categoryId,
        candidate.currency,
        candidate.duplicateStatus,
        itemStatus(candidate),
        candidate.selected ? 1 : 0,
        JSON.stringify(candidate.issues),
        now,
        candidate.id,
        batchId,
      );
      if (result.changes !== 1) {
        throw new Error('El ítem local de importación ya no está disponible');
      }
    }
    const batchResult = await transaction.runAsync(
      `UPDATE import_batches
          SET status = ?, review_items = ?, duplicate_items = ?, updated_at = ?,
              sync_status = CASE
                WHEN sync_status = 'local_only' THEN 'local_only'
                ELSE 'pending'
              END
        WHERE id = ? AND status NOT IN ('imported', 'cancelled')`,
      status,
      reviewItems,
      duplicateItems,
      now,
      batchId,
    );
    if (batchResult.changes !== 1) {
      throw new Error('El lote local de importación ya no está disponible');
    }
  });
}

export async function completeLocalImportBatch(
  batchId: string,
  createdTransactionIdsByItemId: ReadonlyMap<string, string>,
): Promise<number> {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  let remainingCount = 0;
  await database.withExclusiveTransactionAsync(async (transaction) => {
    for (const [itemId, transactionId] of createdTransactionIdsByItemId) {
      await transaction.runAsync(
        `UPDATE import_items
            SET item_status = 'imported', created_transaction_id = ?,
                is_selected = 0, updated_at = ?,
                sync_status = CASE
                  WHEN sync_status = 'local_only' THEN 'local_only'
                  ELSE 'pending'
                END
          WHERE id = ? AND batch_id = ?`,
        transactionId,
        now,
        itemId,
        batchId,
      );
    }
    const remaining = await transaction.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM import_items
        WHERE batch_id = ? AND item_status NOT IN ('imported', 'duplicate', 'ignored')`,
      batchId,
    );
    remainingCount = remaining?.count ?? 0;
    const result = await transaction.runAsync(
      `UPDATE import_batches
          SET status = ?, completed_at = ?, updated_at = ?,
              sync_status = CASE
                WHEN sync_status = 'local_only' THEN 'local_only'
                ELSE 'pending'
              END
        WHERE id = ? AND status NOT IN ('imported', 'cancelled')`,
      remainingCount === 0 ? 'imported' : 'needs_review',
      remainingCount === 0 ? now : null,
      now,
      batchId,
    );
    if (result.changes !== 1) {
      throw new Error('El lote local de importación ya no está disponible');
    }
  });
  return remainingCount;
}

export function parseStoredImportIssues(value: string): readonly ImportIssue[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as ImportIssue[]) : [];
  } catch {
    return [];
  }
}

/** Devuelve solamente la revisión más reciente del espacio indicado. */
export async function getLatestResumableLocalImportBatch(
  spaceId: string,
): Promise<ResumableLocalImportBatch | null> {
  const batches = await listResumableLocalImportBatches(spaceId);
  return batches[0] ?? null;
}

/** Lista revisiones que aún pueden reanudarse, siempre acotadas a un espacio. */
export async function listResumableLocalImportBatches(
  spaceId: string,
): Promise<ResumableLocalImportBatch[]> {
  if (!spaceId) return [];
  const database = await getLocalDatabase();
  const batches = await database.getAllAsync<ImportBatchSyncRow>(
    `SELECT id, space_id, source_type, status, total_items, review_items,
            duplicate_items, created_at, updated_at, completed_at, file_hash
       FROM import_batches
      WHERE space_id = ? AND status IN ('needs_review', 'ready', 'failed')
      ORDER BY updated_at DESC`,
    spaceId,
  );
  const results: (ResumableLocalImportBatch | null)[] = await Promise.all(
    batches.map(async (batch) => {
      assertSyncRow(batch);
      const items = await database.getAllAsync<StoredImportItemRow>(
        `SELECT id, source_row, raw_description, normalized_merchant,
                occurred_on, amount_minor, currency, movement_type,
                suggested_category_id, final_category_id, duplicate_status,
                issues, is_selected
           FROM import_items
          WHERE batch_id = ? AND item_status <> 'imported'
          ORDER BY source_row ASC`,
        batch.id,
      );
      if (items.length === 0) return null;
      const restored: ResumableLocalImportBatch = {
        id: batch.id,
        spaceId: batch.space_id,
        sourceType: batch.source_type as ImportSourceExtension,
        status: batch.status as LocalImportBatchStatus,
        totalItems: batch.total_items,
        reviewItems: batch.review_items,
        duplicateItems: batch.duplicate_items,
        createdAt: batch.created_at,
        updatedAt: batch.updated_at,
        ...(batch.completed_at === null
          ? {}
          : { completedAt: batch.completed_at }),
        ...(batch.file_hash === null ? {} : { fileHash: batch.file_hash }),
        candidates: items.map((item) => ({
          id: item.id,
          sourceRowNumber: item.source_row,
          rawDescription: item.raw_description,
          normalizedMerchant: item.normalized_merchant,
          displayTitle: toImportDisplayTitle(item.raw_description),
          occurredOn: item.occurred_on,
          amountMinor: item.amount_minor,
          currency: item.currency as ImportedTransactionCandidate['currency'],
          type: item.movement_type,
          suggestedCategoryId: item.suggested_category_id,
          categoryId: item.final_category_id,
          duplicateStatus: item.duplicate_status,
          // Desde la normalización por día económico, una advertencia antigua
          // por ambigüedad ya no bloquea ni ensucia una revisión reanudada.
          issues: parseStoredImportIssues(item.issues).filter(
            (issue) =>
              issue.code !== 'ambiguous_date' &&
              issue.code !== 'unknown_category',
          ),
          selected: item.is_selected === 1,
        })),
      };
      return restored;
    }),
  );
  return results.filter(
    (batch): batch is ResumableLocalImportBatch => batch !== null,
  );
}

export async function cancelLocalImportBatch(batchId: string): Promise<void> {
  if (!batchId) return;
  const database = await getLocalDatabase();
  const result = await database.runAsync(
    `UPDATE import_batches
        SET status = 'cancelled', updated_at = ?,
            sync_status = CASE
              WHEN sync_status = 'local_only' THEN 'local_only'
              ELSE 'pending'
            END
      WHERE id = ? AND status IN ('needs_review', 'ready', 'failed')`,
    new Date().toISOString(),
    batchId,
  );
  if (result.changes !== 1) {
    throw new Error('La revisión local ya no está disponible');
  }
}

function assertSyncRow(row: ImportBatchSyncRow | ImportItemSyncRow): void {
  if (
    'source_type' in row &&
    !sourceExtensions.has(row.source_type as ImportSourceExtension)
  ) {
    throw new Error(
      'El lote local de importación contiene valores no reconocidos',
    );
  }
}

async function markRows(
  table: 'import_batches' | 'import_items',
  ids: readonly string[],
  status: 'syncing' | 'synced' | 'failed',
  onlyIfSyncing = false,
): Promise<void> {
  if (ids.length === 0) return;
  const database = await getLocalDatabase();
  const placeholders = ids.map(() => '?').join(', ');
  await database.runAsync(
    `UPDATE ${table} SET sync_status = ?
      WHERE id IN (${placeholders})${onlyIfSyncing ? " AND sync_status = 'syncing'" : ''}`,
    status,
    ...ids,
  );
}

export async function prepareLocalImportBatchSync(
  userId: string,
): Promise<ImportBatchSyncPayload> {
  if (!userId) throw new Error('La sesión autenticada no es válida');
  const database = await getLocalDatabase();
  const account = await database.getFirstAsync<SyncAccountRow>(
    'SELECT user_id FROM local_sync_account WHERE singleton_id = 1',
  );
  if (!account || account.user_id !== userId) {
    throw new Error('Los batches locales no están asociados a esta cuenta');
  }

  const installationId = await getOrCreateInstallationId(database);
  const batchRows = await database.getAllAsync<ImportBatchSyncRow>(
    `SELECT id, space_id, source_type, status, total_items, review_items,
            duplicate_items, created_at, updated_at, completed_at, file_hash
       FROM import_batches
      WHERE sync_status IN ${uploadableStatuses}`,
  );
  const batchIds = batchRows.map((batch) => batch.id);
  const placeholders = batchIds.map(() => '?').join(', ');
  const itemRows =
    batchIds.length === 0
      ? []
      : await database.getAllAsync<ImportItemSyncRow>(
          `SELECT id, batch_id, final_category_id, duplicate_transaction_id,
                  source_row, raw_description, normalized_merchant, occurred_on,
                  amount_minor, currency, movement_type, duplicate_status,
                  item_status, is_selected, issues, created_at, updated_at
             FROM import_items
            WHERE batch_id IN (${placeholders})`,
          ...batchIds,
        );

  batchRows.forEach(assertSyncRow);
  itemRows.forEach(assertSyncRow);
  const batches: ImportBatchSyncRecord[] = batchRows.map((batch) => ({
    id: batch.id,
    spaceLocalId: batch.space_id,
    sourceType: batch.source_type as ImportSourceExtension,
    status: batch.status as LocalImportBatchStatus,
    totalItems: batch.total_items,
    reviewItems: batch.review_items,
    duplicateItems: batch.duplicate_items,
    createdAt: batch.created_at,
    updatedAt: batch.updated_at,
    ...(batch.completed_at === null ? {} : { completedAt: batch.completed_at }),
    ...(batch.file_hash === null ? {} : { fileHash: batch.file_hash }),
  }));
  const items: ImportItemSyncRecord[] = itemRows.map((item) => ({
    id: item.id,
    batchId: item.batch_id,
    ...(item.final_category_id === null
      ? {}
      : { categoryLocalId: item.final_category_id }),
    ...(item.duplicate_transaction_id === null
      ? {}
      : { duplicateTransactionLocalId: item.duplicate_transaction_id }),
    sourceRow: item.source_row,
    rawDescription: item.raw_description,
    normalizedMerchant: item.normalized_merchant,
    ...(item.occurred_on === null ? {} : { occurredOn: item.occurred_on }),
    ...(item.amount_minor === null ? {} : { amountMinor: item.amount_minor }),
    ...(item.currency === null
      ? {}
      : { currency: item.currency as ImportItemSyncRecord['currency'] }),
    movementType: item.movement_type as ImportItemSyncRecord['movementType'],
    duplicateStatus:
      item.duplicate_status as ImportItemSyncRecord['duplicateStatus'],
    itemStatus: item.item_status as ImportItemSyncRecord['itemStatus'],
    selected: item.is_selected === 1,
    issues: parseStoredImportIssues(item.issues),
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }));

  await markRows('import_batches', batchIds, 'syncing');
  await markRows(
    'import_items',
    items.map((item) => item.id),
    'syncing',
  );
  return { installationId, userId, batches, items };
}

/** Confirma solo la revisión que no cambió durante la llamada al servidor. */
export async function completeLocalImportBatchSync(
  payload: ImportBatchSyncPayload,
): Promise<void> {
  const database = await getLocalDatabase();
  for (const batch of payload.batches) {
    await database.runAsync(
      `UPDATE import_batches SET sync_status = 'synced'
        WHERE id = ? AND updated_at = ? AND sync_status = 'syncing'`,
      batch.id,
      batch.updatedAt,
    );
  }
  for (const item of payload.items) {
    await database.runAsync(
      `UPDATE import_items SET sync_status = 'synced'
        WHERE id = ? AND updated_at = ? AND sync_status = 'syncing'`,
      item.id,
      item.updatedAt,
    );
  }
}

export async function failLocalImportBatchSync(
  payload: ImportBatchSyncPayload,
): Promise<void> {
  await markRows(
    'import_batches',
    payload.batches.map((batch) => batch.id),
    'failed',
    true,
  );
  await markRows(
    'import_items',
    payload.items.map((item) => item.id),
    'failed',
    true,
  );
}
