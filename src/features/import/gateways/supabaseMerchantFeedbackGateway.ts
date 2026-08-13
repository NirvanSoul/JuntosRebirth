import type { SupabaseClient } from '@supabase/supabase-js';

import type { MerchantFeedbackSyncGateway } from '@/features/import/types';
import { getConfiguredSupabaseClient } from '@/lib/supabase/supabaseClient';

export function createSupabaseMerchantFeedbackGateway(
  client: SupabaseClient = getConfiguredSupabaseClient(),
): MerchantFeedbackSyncGateway {
  return {
    async recordMerchantFeedback(entry) {
      const { error } = await client.rpc('record_merchant_feedback', {
        p_import_item_id: entry.importItemId,
        p_canonical_category_key: entry.canonicalCategoryKey,
      });
      if (error) {
        throw new Error(`No pudimos enviar tu confirmación: ${error.message}`);
      }
    },
  };
}
