import { apiClient } from '@/services/api/juntossApiClient';
import { isOccurredTimeRejection } from '@/features/sync/services/occurredTimeUploadSupport';
import type { TransactionExchangeSnapshot } from '@/features/transactions/types';

export type CoupleSpaceSyncPayload = {
  installationId: string;
  spaceId: string;
  categories: readonly Record<string, unknown>[];
  moneyAccounts: readonly Record<string, unknown>[];
  recurringSeries: readonly Record<string, unknown>[];
  transactions: readonly Record<string, unknown>[];
};

export type CoupleSpaceSyncCollection =
  'categories' | 'moneyAccounts' | 'recurringSeries' | 'transactions';

/**
 * Una versión del lote que el servidor no aplicó (contrato de `Juntos API`,
 * `SyncConflict`). `NEWER_VERSION`: ya guardaba una con `updatedAt` posterior
 * y la vuelve a publicar por `/v1/sync/changes`. `NOT_IN_SPACE`: el id remoto
 * pertenece a otro espacio y no se guardó nada. Solo aparece si hay alguno;
 * una API anterior omite el campo.
 */
export type CoupleSpaceSyncConflict = {
  collection: CoupleSpaceSyncCollection;
  localId: string;
  remoteId: string;
  reason: 'NEWER_VERSION' | 'NOT_IN_SPACE';
  serverUpdatedAt: string | null;
};

export type CoupleSpaceSyncResult = {
  categoryCount: number;
  moneyAccountCount: number;
  recurringSeriesCount: number;
  transactionCount: number;
  transactions?: readonly {
    localId: string;
    remoteId: string;
    /**
     * `false`: el servidor descartó esta versión y los demás campos son los
     * canónicos (o `null`), nunca los enviados. Una API anterior lo omite.
     */
    applied?: boolean;
    updatedAt: string | null;
    accountingAmountMinorUsd?: number | null;
    exchangeSnapshot: TransactionExchangeSnapshot | null;
  }[];
  conflicts?: readonly CoupleSpaceSyncConflict[];
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
    // Lo reintenta `sendWithOccurredTimeSupport` sin la hora: no es un fallo.
    { isExpectedFailure: isOccurredTimeRejection },
  );
  return response.data;
}
