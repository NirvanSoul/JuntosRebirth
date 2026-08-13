import type { SupabaseClient } from '@supabase/supabase-js';

import { fetchRemoteImportReviews } from '@/features/import/gateways/supabaseImportReviewReadGateway';

const batchRow = {
  id: 'batch-1',
  space_id: 'space-1',
  source_type: 'xlsx',
  status: 'needs_review',
  total_items: 2,
  review_items: 1,
  duplicate_items: 0,
  created_at: '2026-08-01T10:00:00.000Z',
  updated_at: '2026-08-02T10:00:00.000Z',
  completed_at: null,
};

const itemRow = {
  id: 'item-1',
  batch_id: 'batch-1',
  final_category_id: 'category-1',
  source_row: 2,
  raw_description: 'MERCADONA MADRID',
  normalized_merchant: 'mercadona',
  occurred_on: '2026-08-01',
  amount_minor: 3244,
  currency: 'EUR',
  movement_type: 'expense',
  duplicate_status: 'none',
  item_status: 'ready',
  is_selected: true,
  issues: [],
  created_at: '2026-08-01T10:00:00.000Z',
  updated_at: '2026-08-01T10:00:00.000Z',
};

function createClient(input: {
  batches: readonly unknown[] | null;
  batchesError?: unknown;
  items?: readonly unknown[] | null;
  itemsError?: unknown;
}): { client: SupabaseClient; from: jest.Mock } {
  const batchesQuery = {
    in: jest.fn(() => ({
      in: jest.fn(async () => ({
        data: input.batches,
        error: input.batchesError ?? null,
      })),
    })),
  };
  const itemsQuery = {
    in: jest.fn(async () => ({
      data: input.items ?? [],
      error: input.itemsError ?? null,
    })),
  };
  const from = jest.fn((table: string) => ({
    select: jest.fn(() =>
      table === 'import_batches' ? batchesQuery : itemsQuery,
    ),
  }));
  return { client: { from } as unknown as SupabaseClient, from };
}

describe('fetchRemoteImportReviews', () => {
  it('no consulta nada sin espacios remotos', async () => {
    const { client, from } = createClient({ batches: [] });
    await expect(
      fetchRemoteImportReviews({ spaceRemoteIds: [], client }),
    ).resolves.toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });

  it('combina batches e ítems, camelizando los campos remotos', async () => {
    const { client } = createClient({ batches: [batchRow], items: [itemRow] });

    await expect(
      fetchRemoteImportReviews({ spaceRemoteIds: ['space-1'], client }),
    ).resolves.toEqual([
      {
        id: 'batch-1',
        spaceRemoteId: 'space-1',
        sourceType: 'xlsx',
        status: 'needs_review',
        totalItems: 2,
        reviewItems: 1,
        duplicateItems: 0,
        createdAt: '2026-08-01T10:00:00.000Z',
        updatedAt: '2026-08-02T10:00:00.000Z',
        completedAt: null,
        items: [
          {
            id: 'item-1',
            categoryRemoteId: 'category-1',
            sourceRow: 2,
            rawDescription: 'MERCADONA MADRID',
            normalizedMerchant: 'mercadona',
            occurredOn: '2026-08-01',
            amountMinor: 3244,
            currency: 'EUR',
            movementType: 'expense',
            duplicateStatus: 'none',
            itemStatus: 'ready',
            selected: true,
            issues: [],
            createdAt: '2026-08-01T10:00:00.000Z',
            updatedAt: '2026-08-01T10:00:00.000Z',
          },
        ],
      },
    ]);
  });

  it('no consulta ítems cuando no hay batches pendientes', async () => {
    const { client, from } = createClient({ batches: [] });
    await expect(
      fetchRemoteImportReviews({ spaceRemoteIds: ['space-1'], client }),
    ).resolves.toEqual([]);
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith('import_batches');
  });

  it('deja fuera los ítems de otros batches', async () => {
    const { client } = createClient({
      batches: [batchRow],
      items: [itemRow, { ...itemRow, id: 'item-2', batch_id: 'batch-2' }],
    });

    const [review] = await fetchRemoteImportReviews({
      spaceRemoteIds: ['space-1'],
      client,
    });
    expect(review?.items).toHaveLength(1);
    expect(review?.items[0]?.id).toBe('item-1');
  });

  it('lanza si Supabase falla al leer batches', async () => {
    const { client } = createClient({
      batches: null,
      batchesError: { message: 'network error' },
    });
    await expect(
      fetchRemoteImportReviews({ spaceRemoteIds: ['space-1'], client }),
    ).rejects.toThrow('No pudimos recuperar tus revisiones de importación');
  });

  it('lanza si Supabase falla al leer ítems', async () => {
    const { client } = createClient({
      batches: [batchRow],
      items: null,
      itemsError: { message: 'network error' },
    });
    await expect(
      fetchRemoteImportReviews({ spaceRemoteIds: ['space-1'], client }),
    ).rejects.toThrow('No pudimos recuperar los movimientos pendientes');
  });
});
