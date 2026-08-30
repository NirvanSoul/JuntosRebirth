import type {
  ImportMerchantRuleSyncGateway,
  ImportMerchantRuleSyncPayload,
} from '@/features/import/types';
import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import { apiClient } from '@/services/api/juntossApiClient';

/** Sustituye la RPC `sync_import_merchant_rules`. */
export function createJuntossMerchantRuleGateway(): ImportMerchantRuleSyncGateway {
  return {
    async syncMerchantRules(
      payload: ImportMerchantRuleSyncPayload,
    ): Promise<number> {
      const userId = await getAuthenticatedUserId();
      if (!userId) {
        throw new Error('Debes iniciar sesión antes de sincronizar');
      }
      if (userId !== payload.userId) {
        throw new Error('La sesión cambió antes de sincronizar las reglas');
      }
      if (payload.rules.length === 0) return 0;

      const response = await apiClient.post<{ data: { ruleCount: number } }>(
        '/v1/sync/merchant-rules',
        {
          installationId: payload.installationId,
          rules: payload.rules.map((rule) => ({
            local_id: rule.id,
            space_local_id: rule.spaceLocalId,
            category_local_id: rule.categoryLocalId,
            normalized_merchant: rule.normalizedMerchant,
            confirmations: rule.confirmations,
            source: rule.source,
            last_used_at: rule.lastUsedAt ?? null,
            created_at: rule.createdAt,
            updated_at: rule.updatedAt,
          })),
        },
      );

      if (!Number.isSafeInteger(response.data?.ruleCount)) {
        throw new Error('No pudimos sincronizar tus reglas de importación');
      }
      return response.data.ruleCount;
    },
  };
}
