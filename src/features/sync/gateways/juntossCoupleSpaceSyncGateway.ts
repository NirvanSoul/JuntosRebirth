import { apiClient } from '@/services/api/juntossApiClient';

export type CoupleSpaceSyncPayload = {
  installationId: string;
  spaceId: string;
  categories: readonly Record<string, unknown>[];
  moneyAccounts: readonly Record<string, unknown>[];
  recurringSeries: readonly Record<string, unknown>[];
  transactions: readonly Record<string, unknown>[];
};

export type CoupleSpaceSyncResult = {
  categoryCount: number;
  moneyAccountCount: number;
  recurringSeriesCount: number;
  transactionCount: number;
};

/**
 * Lote atómico de un espacio compartido. Sustituye a la RPC
 * `sync_couple_space_data`.
 *
 * El `spaceId` viaja en la ruta, no en el cuerpo: la API comprueba la
 * pertenencia al espacio antes de leer nada.
 */
export async function syncCoupleSpaceRemotely(
  payload: CoupleSpaceSyncPayload,
): Promise<CoupleSpaceSyncResult> {
  const { spaceId, ...batch } = payload;
  const response = await apiClient.post<{ data: CoupleSpaceSyncResult }>(
    `/v1/spaces/${spaceId}/sync`,
    batch,
  );
  return response.data;
}
