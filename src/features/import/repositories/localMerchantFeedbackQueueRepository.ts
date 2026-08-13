import { randomUUID } from 'expo-crypto';

import type { MerchantFeedbackQueueEntry } from '@/features/import/types';
import { getLocalDatabase } from '@/lib/storage/localDatabase';

type QueueRow = {
  id: string;
  import_item_id: string;
  canonical_category_key: string;
  created_at: string;
  updated_at: string;
};

/**
 * Encola un voto comunitario para un ítem ya confirmado e importado. No lo
 * envía todavía: `syncLocalMerchantFeedback` solo lo hace una vez el ítem
 * está sincronizado en Supabase con su categoría final (Bible §54).
 */
export async function enqueueMerchantFeedback(input: {
  importItemId: string;
  canonicalCategoryKey: string;
}): Promise<void> {
  if (!input.importItemId || !input.canonicalCategoryKey) return;
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO merchant_feedback_queue (
       id, import_item_id, canonical_category_key, status, created_at, updated_at
     ) VALUES (?, ?, ?, 'pending', ?, ?)
     ON CONFLICT (import_item_id) DO NOTHING`,
    randomUUID(),
    input.importItemId,
    input.canonicalCategoryKey,
    now,
    now,
  );
}

/**
 * Ítems pendientes cuyo import_item ya terminó de sincronizarse (única
 * condición bajo la que `record_merchant_feedback` puede resolverlos en el
 * servidor). Los marca `syncing` para evitar un doble envío concurrente.
 */
export async function prepareLocalMerchantFeedbackSync(): Promise<
  readonly MerchantFeedbackQueueEntry[]
> {
  const database = await getLocalDatabase();
  const rows = await database.getAllAsync<QueueRow>(
    `SELECT q.id, q.import_item_id, q.canonical_category_key, q.created_at, q.updated_at
       FROM merchant_feedback_queue q
       JOIN import_items i ON i.id = q.import_item_id
      WHERE q.status = 'pending' AND i.sync_status = 'synced'`,
  );
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const placeholders = ids.map(() => '?').join(', ');
  await database.runAsync(
    `UPDATE merchant_feedback_queue SET status = 'syncing'
      WHERE id IN (${placeholders})`,
    ...ids,
  );
  return rows.map((row) => ({
    id: row.id,
    importItemId: row.import_item_id,
    canonicalCategoryKey: row.canonical_category_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function completeLocalMerchantFeedbackSync(
  id: string,
): Promise<void> {
  const database = await getLocalDatabase();
  await database.runAsync(
    `UPDATE merchant_feedback_queue SET status = 'synced', updated_at = ?
      WHERE id = ? AND status = 'syncing'`,
    new Date().toISOString(),
    id,
  );
}

export async function failLocalMerchantFeedbackSync(id: string): Promise<void> {
  const database = await getLocalDatabase();
  await database.runAsync(
    `UPDATE merchant_feedback_queue SET status = 'failed', updated_at = ?
      WHERE id = ? AND status = 'syncing'`,
    new Date().toISOString(),
    id,
  );
}
