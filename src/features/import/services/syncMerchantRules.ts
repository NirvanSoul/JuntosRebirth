import {
  completeLocalMerchantRuleSync,
  failLocalMerchantRuleSync,
  prepareLocalMerchantRuleSync,
} from '@/features/import/repositories/localMerchantRuleRepository';
import type { ImportMerchantRuleSyncGateway } from '@/features/import/types';

export async function syncLocalMerchantRules(input: {
  userId: string;
  gateway: ImportMerchantRuleSyncGateway;
}): Promise<number> {
  const payload = await prepareLocalMerchantRuleSync(input.userId);
  try {
    const syncedCount = await input.gateway.syncMerchantRules(payload);
    if (syncedCount !== payload.rules.length) {
      throw new Error('Supabase no confirmó todas las reglas de importación');
    }
    await completeLocalMerchantRuleSync(payload);
    return syncedCount;
  } catch (error) {
    await failLocalMerchantRuleSync(payload);
    throw error;
  }
}
