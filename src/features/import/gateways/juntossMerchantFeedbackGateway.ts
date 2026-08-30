import type { MerchantFeedbackSyncGateway } from '@/features/import/types';
import { apiClient } from '@/services/api/juntossApiClient';

/**
 * Sustituye la RPC `record_merchant_feedback`. El país no viaja: la API lo
 * deduce de la región del locale del perfil.
 */
export function createJuntossMerchantFeedbackGateway(): MerchantFeedbackSyncGateway {
  return {
    async recordMerchantFeedback(entry) {
      try {
        await apiClient.post('/v1/merchant-feedback', {
          importItemId: entry.importItemId,
          canonicalCategoryKey: entry.canonicalCategoryKey,
        });
      } catch (error) {
        throw new Error(
          `No pudimos enviar tu confirmación: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
  };
}
