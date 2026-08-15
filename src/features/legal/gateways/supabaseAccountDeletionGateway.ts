import { FunctionsHttpError } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getConfiguredSupabaseClient } from '@/lib/supabase/supabaseClient';

export type AccountDeletionGateway = {
  deleteAccount(): Promise<void>;
};

/**
 * `functions.invoke` resuelve cualquier respuesta no-2xx como un
 * `FunctionsHttpError` cuyo `message` es siempre el genérico "Edge Function
 * returned a non-2xx status code": el motivo real viaja en el cuerpo, que
 * `delete-account` devuelve como `{ error }`. Sin leerlo, un fallo de
 * limpieza y uno de borrado de la cuenta son indistinguibles desde la app.
 */
async function describeInvokeError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (typeof body?.error === 'string') return body.error;
    } catch {
      // El cuerpo no era JSON (p. ej. un 500 del runtime): nos quedamos con
      // el mensaje genérico de abajo.
    }
  }

  return error instanceof Error ? error.message : String(error);
}

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
        throw new Error(
          `No pudimos eliminar la cuenta: ${await describeInvokeError(error)}`,
        );
      }
    },
  };
}
