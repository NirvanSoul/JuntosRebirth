import type { Space } from '@/features/spaces/types';
import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import {
  completeLocalGuestMigration,
  failLocalGuestMigration,
  prepareLocalGuestMigration,
} from '@/features/sync/repositories/localGuestMigrationRepository';
import type {
  GuestMigrationGateway,
  GuestMigrationResult,
} from '@/features/sync/types';
import { createJuntossGuestMigrationGateway } from '@/features/sync/gateways/juntossGuestMigrationGateway';
import { apiClient } from '@/services/api/juntossApiClient';

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
      result.moneyAccountCount !== payload.moneyAccounts.length ||
      result.seriesCount !== payload.recurringSeries.length ||
      result.transactionCount !== payload.transactions.length
    ) {
      throw new Error('Juntoss API no confirmó el lote local completo');
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
  let userId = await getAuthenticatedUserId();
  if (!userId) {
    const session = await apiClient.get<{
      data: { user?: { id: string }; id?: string };
    }>('/v1/me');
    userId = session.data.user?.id ?? session.data.id ?? null;
  }
  if (!userId) {
    throw new Error('Debes iniciar sesión antes de migrar tus datos');
  }

  const result = await migrateAuthenticatedGuestData({
    userId,
    spaces: input.spaces,
    confirmOwnership: input.confirmOwnership,
    gateway: createJuntossGuestMigrationGateway(),
  });
  return result;
}
