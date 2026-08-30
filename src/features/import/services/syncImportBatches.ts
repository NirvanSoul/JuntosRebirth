import {
  completeLocalImportBatchSync,
  failLocalImportBatchSync,
  prepareLocalImportBatchSync,
} from '@/features/import/repositories/localImportBatchRepository';
import type { ImportBatchSyncGateway } from '@/features/import/types';

export async function syncLocalImportBatches(input: {
  userId: string;
  gateway: ImportBatchSyncGateway;
}): Promise<{ batchCount: number; itemCount: number }> {
  const payload = await prepareLocalImportBatchSync(input.userId);
  try {
    const result = await input.gateway.syncImportBatches(payload);
    if (
      result.batchCount !== payload.batches.length ||
      result.itemCount !== payload.items.length
    ) {
      throw new Error('La API no confirmó todas las revisiones de importación');
    }
    await completeLocalImportBatchSync(payload);
    return result;
  } catch (error) {
    await failLocalImportBatchSync(payload);
    throw error;
  }
}
