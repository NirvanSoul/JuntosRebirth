import type { Space } from '@/features/spaces/types';
import {
  completeLocalGuestMigration,
  failLocalGuestMigration,
  prepareLocalGuestMigration,
} from '@/features/sync/repositories/localGuestMigrationRepository';
import type {
  GuestMigrationGateway,
  GuestMigrationResult,
} from '@/features/sync/types';
import { createSupabaseMerchantRuleGateway } from '@/features/import/gateways/supabaseMerchantRuleGateway';
import { createSupabaseImportBatchGateway } from '@/features/import/gateways/supabaseImportBatchGateway';
import { createSupabaseMerchantFeedbackGateway } from '@/features/import/gateways/supabaseMerchantFeedbackGateway';
import { syncLocalImportBatches } from '@/features/import/services/syncImportBatches';
import { syncLocalMerchantFeedback } from '@/features/import/services/syncMerchantFeedback';
import { syncLocalMerchantRules } from '@/features/import/services/syncMerchantRules';
import { createSupabaseGuestMigrationGateway } from '@/features/sync/gateways/supabaseGuestMigrationGateway';
import { getConfiguredSupabaseClient } from '@/lib/supabase/supabaseClient';

export async function migrateAuthenticatedGuestData(input: {
  userId: string;
  spaces: readonly Space[];
  confirmOwnership: boolean;
  gateway: GuestMigrationGateway;
}): Promise<GuestMigrationResult> {
  const payload = await prepareLocalGuestMigration(
    input.spaces,
    input.userId,
    input.confirmOwnership,
  );

  try {
    const result = await input.gateway.migrateGuestData(payload);
    if (
      result.batchId !== payload.batchId ||
      result.spaceCount !== payload.spaces.length ||
      result.categoryCount !== payload.categories.length ||
      result.seriesCount !== payload.recurringSeries.length ||
      result.transactionCount !== payload.transactions.length
    ) {
      throw new Error('Supabase no confirmó el lote local completo');
    }
    await completeLocalGuestMigration(payload);
    return result;
  } catch (error) {
    await failLocalGuestMigration(payload);
    throw error;
  }
}

export async function syncPendingLocalDataForCurrentSession(input: {
  spaces: readonly Space[];
  confirmOwnership: boolean;
}): Promise<GuestMigrationResult> {
  const client = getConfiguredSupabaseClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    throw new Error('Debes iniciar sesión antes de sincronizar');
  }

  const result = await migrateAuthenticatedGuestData({
    userId: data.user.id,
    spaces: input.spaces,
    confirmOwnership: input.confirmOwnership,
    gateway: createSupabaseGuestMigrationGateway(client),
  });
  await syncLocalMerchantRules({
    userId: data.user.id,
    gateway: createSupabaseMerchantRuleGateway(client),
  });
  await syncLocalImportBatches({
    userId: data.user.id,
    gateway: createSupabaseImportBatchGateway(client),
  });
  // Solo puede resolver votos cuyo import_item ya exista en Supabase con
  // categoría final, así que corre después de sincronizar los batches.
  await syncLocalMerchantFeedback({
    gateway: createSupabaseMerchantFeedbackGateway(client),
  });
  return result;
}
