import type {
  ImportBatchSyncGateway,
  ImportBatchSyncPayload,
} from '@/features/import/types';
import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import { apiClient } from '@/services/api/juntossApiClient';

/**
 * Sube los lotes de importación pendientes de revisar. Sustituye la RPC
 * `sync_import_batches`; las filas viajan con los mismos nombres que ya
 * construía el cliente, así que solo cambia el transporte.
 */
export function createJuntossImportBatchGateway(): ImportBatchSyncGateway {
  return {
    async syncImportBatches(payload: ImportBatchSyncPayload) {
      const userId = await getAuthenticatedUserId();
      if (!userId) {
        throw new Error('Debes iniciar sesión antes de sincronizar');
      }
      if (userId !== payload.userId) {
        throw new Error('La sesión cambió antes de sincronizar los lotes');
      }
      if (payload.batches.length === 0) return { batchCount: 0, itemCount: 0 };

      const response = await apiClient.post<{
        data: { batchCount: number; itemCount: number };
      }>('/v1/sync/import-batches', {
        installationId: payload.installationId,
        batches: payload.batches.map((batch) => ({
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
        items: payload.items.map((item) => ({
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

      const result = response.data;
      if (
        !Number.isSafeInteger(result?.batchCount) ||
        !Number.isSafeInteger(result?.itemCount)
      ) {
        throw new Error('No pudimos sincronizar tus revisiones de importación');
      }
      return result;
    },
  };
}
