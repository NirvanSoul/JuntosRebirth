import type { SupabaseClient } from '@supabase/supabase-js';

import { getConfiguredSupabaseClient } from '@/lib/supabase/supabaseClient';

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

export async function fetchRemoteImportReviews(input: {
  spaceRemoteIds: readonly string[];
  client?: SupabaseClient;
}): Promise<readonly RemoteImportReview[]> {
  const client = input.client ?? getConfiguredSupabaseClient();
  if (input.spaceRemoteIds.length === 0) return [];
  const { data: batches, error: batchesError } = await client
    .from('import_batches')
    .select(
      'id, space_id, source_type, status, total_items, review_items, duplicate_items, created_at, updated_at, completed_at',
    )
    .in('space_id', input.spaceRemoteIds)
    .in('status', ['needs_review', 'ready', 'failed']);
  if (batchesError || !batches) {
    throw new Error('No pudimos recuperar tus revisiones de importación');
  }
  const batchIds = batches.map((batch) => batch.id as string);
  if (batchIds.length === 0) return [];
  const { data: items, error: itemsError } = await client
    .from('import_items')
    .select(
      'id, batch_id, final_category_id, source_row, raw_description, normalized_merchant, occurred_on, amount_minor, currency, movement_type, duplicate_status, item_status, is_selected, issues, created_at, updated_at',
    )
    .in('batch_id', batchIds);
  if (itemsError || !items) {
    throw new Error('No pudimos recuperar los movimientos pendientes');
  }
  return batches.map((batch) => ({
    id: batch.id as string,
    spaceRemoteId: batch.space_id as string,
    sourceType: batch.source_type as RemoteImportReview['sourceType'],
    status: batch.status as string,
    totalItems: batch.total_items as number,
    reviewItems: batch.review_items as number,
    duplicateItems: batch.duplicate_items as number,
    createdAt: batch.created_at as string,
    updatedAt: batch.updated_at as string,
    completedAt: batch.completed_at as string | null,
    items: items
      .filter((item) => item.batch_id === batch.id)
      .map((item) => ({
        id: item.id as string,
        categoryRemoteId: item.final_category_id as string | null,
        sourceRow: item.source_row as number,
        rawDescription: item.raw_description as string,
        normalizedMerchant: item.normalized_merchant as string,
        occurredOn: item.occurred_on as string | null,
        amountMinor: item.amount_minor as number | null,
        currency: item.currency as string | null,
        movementType: item.movement_type as 'expense' | 'income' | 'unknown',
        duplicateStatus: item.duplicate_status as 'none' | 'exact' | 'probable',
        itemStatus: item.item_status as string,
        selected: item.is_selected as boolean,
        issues: item.issues as unknown[],
        createdAt: item.created_at as string,
        updatedAt: item.updated_at as string,
      })),
  }));
}
