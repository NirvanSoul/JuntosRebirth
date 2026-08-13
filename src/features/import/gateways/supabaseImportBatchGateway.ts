import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  ImportBatchSyncGateway,
  ImportBatchSyncPayload,
} from '@/features/import/types';
import { getConfiguredSupabaseClient } from '@/lib/supabase/supabaseClient';

type SyncResult = { batchCount?: unknown; itemCount?: unknown } | null;

export function createSupabaseImportBatchGateway(
  client: SupabaseClient = getConfiguredSupabaseClient(),
): ImportBatchSyncGateway {
  return {
    async syncImportBatches(payload: ImportBatchSyncPayload) {
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || !authData.user) {
        throw new Error('Debes iniciar sesión antes de sincronizar');
      }
      if (authData.user.id !== payload.userId) {
        throw new Error('La sesión cambió antes de sincronizar los lotes');
      }
      if (payload.batches.length === 0) return { batchCount: 0, itemCount: 0 };

      const { data, error } = await client.rpc('sync_import_batches', {
        p_installation_id: payload.installationId,
        p_batches: payload.batches.map((batch) => ({
          id: batch.id,
          space_local_id: batch.spaceLocalId,
          source_type: batch.sourceType,
          status: batch.status,
          total_items: batch.totalItems,
          review_items: batch.reviewItems,
          duplicate_items: batch.duplicateItems,
          created_at: batch.createdAt,
          updated_at: batch.updatedAt,
          completed_at: batch.completedAt ?? null,
          file_hash: batch.fileHash ?? null,
        })),
        p_items: payload.items.map((item) => ({
          id: item.id,
          batch_id: item.batchId,
          category_local_id: item.categoryLocalId ?? null,
          duplicate_transaction_local_id:
            item.duplicateTransactionLocalId ?? null,
          source_row: item.sourceRow,
          raw_description: item.rawDescription,
          normalized_merchant: item.normalizedMerchant,
          occurred_on: item.occurredOn ?? null,
          amount_minor: item.amountMinor ?? null,
          currency: item.currency ?? null,
          movement_type: item.movementType,
          duplicate_status: item.duplicateStatus,
          item_status: item.itemStatus,
          is_selected: item.selected,
          issues: item.issues,
          created_at: item.createdAt,
          updated_at: item.updatedAt,
        })),
      });
      const result = data as SyncResult;
      if (
        error ||
        !result ||
        !Number.isSafeInteger(result.batchCount) ||
        !Number.isSafeInteger(result.itemCount)
      ) {
        throw new Error(
          `No pudimos sincronizar tus revisiones de importación${error ? `: ${error.message}` : ''}`,
        );
      }
      return {
        batchCount: Number(result.batchCount),
        itemCount: Number(result.itemCount),
      };
    },
  };
}
