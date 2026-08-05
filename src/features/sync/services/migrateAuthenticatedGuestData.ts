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

  return migrateAuthenticatedGuestData({
    userId: data.user.id,
    spaces: input.spaces,
    confirmOwnership: input.confirmOwnership,
    gateway: createSupabaseGuestMigrationGateway(client),
  });
}
