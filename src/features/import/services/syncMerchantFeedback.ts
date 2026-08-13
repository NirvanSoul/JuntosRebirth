import {
  completeLocalMerchantFeedbackSync,
  failLocalMerchantFeedbackSync,
  prepareLocalMerchantFeedbackSync,
} from '@/features/import/repositories/localMerchantFeedbackQueueRepository';
import type { MerchantFeedbackSyncGateway } from '@/features/import/types';

/**
 * A diferencia de las reglas personales o los batches (sincronizados como un
 * único lote atómico), cada voto se confirma por separado: uno rechazado por
 * el servidor (p. ej. el ítem todavía no tiene categoría final) no debe
 * bloquear los demás.
 */
export async function syncLocalMerchantFeedback(input: {
  gateway: MerchantFeedbackSyncGateway;
}): Promise<{ syncedCount: number; failedCount: number }> {
  const entries = await prepareLocalMerchantFeedbackSync();
  let syncedCount = 0;
  let failedCount = 0;
  for (const entry of entries) {
    try {
      await input.gateway.recordMerchantFeedback({
        importItemId: entry.importItemId,
        canonicalCategoryKey: entry.canonicalCategoryKey,
      });
      await completeLocalMerchantFeedbackSync(entry.id);
      syncedCount += 1;
    } catch {
      await failLocalMerchantFeedbackSync(entry.id);
      failedCount += 1;
    }
  }
  return { syncedCount, failedCount };
}
