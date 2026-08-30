import { apiClient } from '@/services/api/juntossApiClient';

export type DataExportGateway = {
  exportAccountData(): Promise<Record<string, unknown>>;
};

/**
 * Descarga los datos remotos de la cuenta. Sustituye la Edge Function
 * `export-user-data`: la API los agrega ya filtrados por la sesión.
 */
export function createJuntossDataExportGateway(): DataExportGateway {
  return {
    async exportAccountData(): Promise<Record<string, unknown>> {
      try {
        const response = await apiClient.get<{ data: Record<string, unknown> }>(
          '/v1/me/export',
        );
        return response.data ?? {};
      } catch (error) {
        throw new Error(
          `No pudimos exportar tus datos: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
  };
}
