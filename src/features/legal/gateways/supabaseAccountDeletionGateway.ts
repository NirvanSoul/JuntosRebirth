import type { SupabaseClient } from '@supabase/supabase-js';

import { getConfiguredSupabaseClient } from '@/lib/supabase/supabaseClient';

export type AccountDeletionGateway = {
  deleteAccount(): Promise<void>;
};

/**
 * Invoca la Edge Function `delete-account`, que ejecuta la limpieza de datos
 * en Postgres y luego borra la fila de `auth.users` con la Admin API
 * (imposible desde una función SQL normal, solo desde service role).
 */
export function createSupabaseAccountDeletionGateway(
  client: SupabaseClient = getConfiguredSupabaseClient(),
): AccountDeletionGateway {
  return {
    async deleteAccount(): Promise<void> {
      const { error } = await client.functions.invoke('delete-account');
      if (error) {
        throw new Error(`No pudimos eliminar la cuenta: ${error.message}`);
      }
    },
  };
}
