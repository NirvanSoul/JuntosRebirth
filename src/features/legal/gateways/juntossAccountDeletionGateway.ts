import { apiClient } from '@/services/api/juntossApiClient';

export type AccountDeletionGateway = {
  deleteAccount(): Promise<void>;
};

/**
 * Elimina la cuenta y todo lo que cuelga de ella. Sustituye la Edge Function
 * `delete-account`: la API borra el avatar de R2 y después la fila del
 * usuario, de la que el resto cae por `ON DELETE CASCADE`.
 */
export function createJuntossAccountDeletionGateway(): AccountDeletionGateway {
  return {
    async deleteAccount(): Promise<void> {
      try {
        await apiClient.delete('/v1/me');
      } catch (error) {
        // El mensaje de `ApiError` ya viene en español y sin detalle técnico.
        throw new Error(
          `No pudimos eliminar la cuenta: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
  };
}
