import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  ImportMerchantRuleSyncGateway,
  ImportMerchantRuleSyncPayload,
} from '@/features/import/types';
import { getConfiguredSupabaseClient } from '@/lib/supabase/supabaseClient';

export function createSupabaseMerchantRuleGateway(
  client: SupabaseClient = getConfiguredSupabaseClient(),
): ImportMerchantRuleSyncGateway {
  return {
    async syncMerchantRules(
      payload: ImportMerchantRuleSyncPayload,
    ): Promise<number> {
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || !authData.user) {
        throw new Error('Debes iniciar sesión antes de sincronizar');
      }
      if (authData.user.id !== payload.userId) {
        throw new Error('La sesión cambió antes de sincronizar las reglas');
      }
      if (payload.rules.length === 0) return 0;

      const { data, error } = await client.rpc('sync_import_merchant_rules', {
        p_installation_id: payload.installationId,
        p_rules: payload.rules.map((rule) => ({
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
      });
      if (error || !Number.isSafeInteger(data)) {
        throw new Error(
          `No pudimos sincronizar tus reglas de importación${error ? `: ${error.message}` : ''}`,
        );
      }
      return data;
    },
  };
}
