import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  GuestMigrationGateway,
  GuestMigrationPayload,
  GuestMigrationResult,
} from '@/features/sync/types';
import { getConfiguredSupabaseClient } from '@/lib/supabase/supabaseClient';

function parseMigrationResult(value: unknown): GuestMigrationResult {
  if (!value || typeof value !== 'object') {
    throw new Error('Supabase devolvió una confirmación de migración inválida');
  }
  const result = value as Partial<GuestMigrationResult>;
  if (
    typeof result.batchId !== 'string' ||
    !Number.isSafeInteger(result.spaceCount) ||
    !Number.isSafeInteger(result.categoryCount) ||
    !Number.isSafeInteger(result.seriesCount) ||
    !Number.isSafeInteger(result.transactionCount)
  ) {
    throw new Error('Supabase devolvió una confirmación de migración inválida');
  }
  return result as GuestMigrationResult;
}

export function createSupabaseGuestMigrationGateway(
  client: SupabaseClient = getConfiguredSupabaseClient(),
): GuestMigrationGateway {
  return {
    async migrateGuestData(
      payload: GuestMigrationPayload,
    ): Promise<GuestMigrationResult> {
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || !authData.user) {
        throw new Error('Debes iniciar sesión antes de sincronizar');
      }
      if (authData.user.id !== payload.userId) {
        throw new Error('La sesión cambió antes de sincronizar los datos');
      }

      const { data, error } = await client.rpc('migrate_guest_data', {
        p_batch_id: payload.batchId,
        p_installation_id: payload.installationId,
        p_spaces: payload.spaces,
        p_categories: payload.categories,
        p_recurring_series: payload.recurringSeries,
        p_transactions: payload.transactions,
      });
      if (error) throw new Error(`No pudimos sincronizar: ${error.message}`);
      return parseMigrationResult(data);
    },
  };
}
