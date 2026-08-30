import {
  completeLocalImportBatchSync,
  failLocalImportBatchSync,
  prepareLocalImportBatchSync,
} from '@/features/import/repositories/localImportBatchRepository';
import { syncLocalImportBatches } from '@/features/import/services/syncImportBatches';
import type {
  ImportBatchSyncGateway,
  ImportBatchSyncPayload,
} from '@/features/import/types';

jest.mock('@/features/import/repositories/localImportBatchRepository');

const payload: ImportBatchSyncPayload = {
  installationId: 'installation-id',
  userId: 'user-id',
  batches: [
    {
      id: 'batch-id',
      spaceLocalId: 'space-id',
      sourceType: 'xlsx',
      status: 'ready',
      totalItems: 1,
      reviewItems: 0,
      duplicateItems: 0,
      createdAt: '2026-08-09T10:00:00.000Z',
      updatedAt: '2026-08-09T10:00:00.000Z',
    },
  ],
  items: [],
};

describe('syncLocalImportBatches', () => {
  const gateway: ImportBatchSyncGateway = { syncImportBatches: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(prepareLocalImportBatchSync).mockResolvedValue(payload);
  });

  it('confirma localmente solo después de que la API confirme todo el lote', async () => {
    jest.mocked(gateway.syncImportBatches).mockResolvedValue({
      batchCount: 1,
      itemCount: 0,
    });

    await expect(
      syncLocalImportBatches({ userId: 'user-id', gateway }),
    ).resolves.toEqual({ batchCount: 1, itemCount: 0 });

    expect(completeLocalImportBatchSync).toHaveBeenCalledWith(payload);
    expect(failLocalImportBatchSync).not.toHaveBeenCalled();
  });

  it('deja pendiente el reintento cuando el servidor confirma un conteo parcial', async () => {
    jest.mocked(gateway.syncImportBatches).mockResolvedValue({
      batchCount: 0,
      itemCount: 0,
    });

    await expect(
      syncLocalImportBatches({ userId: 'user-id', gateway }),
    ).rejects.toThrow('La API no confirmó todas las revisiones de importación');

    expect(failLocalImportBatchSync).toHaveBeenCalledWith(payload);
  });
});
