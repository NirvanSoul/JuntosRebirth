import type { SupabaseClient } from '@supabase/supabase-js';

import { getConfiguredSupabaseClient } from '@/lib/supabase/supabaseClient';

export type DataExportGateway = {
  exportAccountData(): Promise<Record<string, unknown>>;
};

/** Invoca la Edge Function `export-user-data`, que agrega los datos remotos del usuario autenticado. */
export function createSupabaseDataExportGateway(
  client: SupabaseClient = getConfiguredSupabaseClient(),
): DataExportGateway {
  return {
    async exportAccountData(): Promise<Record<string, unknown>> {
      const { data, error } = await client.functions.invoke('export-user-data');
      if (error) {
        throw new Error(`No pudimos exportar tus datos: ${error.message}`);
      }
      return (data ?? {}) as Record<string, unknown>;
    },
  };
}
