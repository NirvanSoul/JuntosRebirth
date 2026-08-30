import type {
  GuestMigrationGateway,
  GuestMigrationPayload,
  GuestMigrationResult,
} from '@/features/sync/types';
import { apiClient } from '@/services/api/juntossApiClient';

export function createJuntossGuestMigrationGateway(): GuestMigrationGateway {
  return {
    async migrateGuestData(
      payload: GuestMigrationPayload,
    ): Promise<GuestMigrationResult> {
      const response = await apiClient.post<{ data: GuestMigrationResult }>(
        '/v1/sync/guest-migration',
        {
          batchId: payload.batchId,
          installationId: payload.installationId,
          spaces: payload.spaces,
          categories: payload.categories,
          moneyAccounts: payload.moneyAccounts,
          recurringSeries: payload.recurringSeries,
          transactions: payload.transactions,
        },
      );
      return response.data;
    },
  };
}
