import type { SupabaseClient } from '@supabase/supabase-js';

import { getConfiguredSupabaseClient } from '@/lib/supabase/supabaseClient';

export type CoupleSpaceSyncPayload = {
  installationId: string;
  spaceId: string;
  categories: readonly Record<string, unknown>[];
  recurringSeries: readonly Record<string, unknown>[];
  transactions: readonly Record<string, unknown>[];
};

/** Adaptador remoto del lote atómico exclusivo de un espacio Juntos. */
export async function syncCoupleSpaceRemotely(
  payload: CoupleSpaceSyncPayload,
  client: SupabaseClient = getConfiguredSupabaseClient(),
): Promise<void> {
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) {
    throw new Error('Debes iniciar sesión antes de sincronizar Juntos');
  }

  const { error } = await client.rpc('sync_couple_space_data', {
    p_categories: payload.categories,
    p_installation_id: payload.installationId,
    p_recurring_series: payload.recurringSeries,
    p_space_id: payload.spaceId,
    p_transactions: payload.transactions,
  });
  if (error) {
    throw new Error(`No pudimos sincronizar Juntos: ${error.message}`);
  }
}
