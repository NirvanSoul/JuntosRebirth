import type { SupabaseClient } from '@supabase/supabase-js';

import { createSupabaseImportBatchGateway } from '@/features/import/gateways/supabaseImportBatchGateway';
import type { ImportBatchSyncPayload } from '@/features/import/types';

const payload: ImportBatchSyncPayload = {
  installationId: 'installation-id',
  userId: 'user-id',
  batches: [
    {
      id: 'batch-id',
      spaceLocalId: 'space-id',
      sourceType: 'xlsx',
      status: 'needs_review',
      totalItems: 1,
      reviewItems: 1,
      duplicateItems: 0,
      createdAt: '2026-08-09T10:00:00.000Z',
      updatedAt: '2026-08-09T10:00:00.000Z',
    },
  ],
  items: [
    {
      id: 'item-id',
      batchId: 'batch-id',
      categoryLocalId: 'category-id',
      sourceRow: 2,
      rawDescription: 'MERCADONA',
      normalizedMerchant: 'mercadona',
      movementType: 'expense',
      duplicateStatus: 'none',
      itemStatus: 'pending',
      selected: true,
      issues: [],
      createdAt: '2026-08-09T10:00:00.000Z',
      updatedAt: '2026-08-09T10:00:00.000Z',
    },
  ],
};

describe('supabaseImportBatchGateway', () => {
  it('verifica la sesión y envía el estado revisable normalizado al RPC', async () => {
    const rpc = jest.fn(async () => ({
      data: { batchCount: 1, itemCount: 1 },
      error: null,
    }));
    const client = {
      auth: {
        getUser: jest.fn(async () => ({
          data: { user: { id: 'user-id' } },
          error: null,
        })),
      },
      rpc,
    } as unknown as SupabaseClient;

    await expect(
      createSupabaseImportBatchGateway(client).syncImportBatches(payload),
    ).resolves.toEqual({ batchCount: 1, itemCount: 1 });

    expect(rpc).toHaveBeenCalledWith('sync_import_batches', {
      p_installation_id: 'installation-id',
      p_batches: [expect.objectContaining({ space_local_id: 'space-id' })],
      p_items: [
        expect.objectContaining({
          category_local_id: 'category-id',
          is_selected: true,
        }),
      ],
    });
  });

  it('rechaza una sesión que cambió antes de sincronizar los lotes', async () => {
    const client = {
      auth: {
        getUser: jest.fn(async () => ({
          data: { user: { id: 'other-user' } },
          error: null,
        })),
      },
      rpc: jest.fn(),
    } as unknown as SupabaseClient;

    await expect(
      createSupabaseImportBatchGateway(client).syncImportBatches(payload),
    ).rejects.toThrow('La sesión cambió antes de sincronizar los lotes');
  });
});
