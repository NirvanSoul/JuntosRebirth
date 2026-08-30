import { apiClient } from '@/services/api/juntossApiClient';

export type RemoteImportReview = {
  id: string;
  spaceRemoteId: string;
  sourceType: 'xls' | 'xlsx' | 'csv';
  status: string;
  totalItems: number;
  reviewItems: number;
  duplicateItems: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  items: readonly {
    id: string;
    categoryRemoteId: string | null;
    sourceRow: number;
    rawDescription: string;
    normalizedMerchant: string;
    occurredOn: string | null;
    amountMinor: number | null;
    currency: string | null;
    movementType: 'expense' | 'income' | 'unknown';
    duplicateStatus: 'none' | 'exact' | 'probable';
    itemStatus: string;
    selected: boolean;
    issues: unknown[];
    createdAt: string;
    updatedAt: string;
  }[];
};

type RawBatch = Record<string, unknown> & { items?: Record<string, unknown>[] };

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Lotes de importación pendientes de revisar, para poder retomarlos desde otro
 * dispositivo. Sustituye las dos lecturas PostgREST anteriores; la API ya
 * devuelve cada lote con sus items anidados y filtrados por el usuario.
 */
export async function fetchRemoteImportReviews(): Promise<
  readonly RemoteImportReview[]
> {
  const response = await apiClient.get<{ data: { batches: RawBatch[] } }>(
    '/v1/sync/import-reviews',
  );

  return response.data.batches.map((batch) => ({
    id: text(batch.id),
    spaceRemoteId: text(batch.spaceId),
    sourceType: text(batch.sourceType) as RemoteImportReview['sourceType'],
    status: text(batch.status),
    totalItems: Number(batch.totalItems ?? 0),
    reviewItems: Number(batch.reviewItems ?? 0),
    duplicateItems: Number(batch.duplicateItems ?? 0),
    createdAt: text(batch.createdAt),
    updatedAt: text(batch.updatedAt),
    completedAt: optionalString(batch.completedAt),
    items: (batch.items ?? []).map((item) => ({
      id: text(item.id),
      categoryRemoteId: optionalString(item.categoryId),
      sourceRow: Number(item.sourceRow ?? 0),
      rawDescription: text(item.rawDescription),
      normalizedMerchant: text(item.normalizedMerchant),
      occurredOn: optionalString(item.occurredOn),
      // El importe llega como cadena para no perder precisión de 64 bits.
      amountMinor:
        item.amountMinor === null || item.amountMinor === undefined
          ? null
          : Number(item.amountMinor),
      currency: optionalString(item.currency),
      movementType: text(item.movementType) as 'expense' | 'income' | 'unknown',
      duplicateStatus: text(item.duplicateStatus) as
        'none' | 'exact' | 'probable',
      itemStatus: text(item.itemStatus),
      selected: Boolean(item.isSelected),
      issues: Array.isArray(item.issues) ? item.issues : [],
      createdAt: text(item.createdAt),
      updatedAt: text(item.updatedAt),
    })),
  }));
}
