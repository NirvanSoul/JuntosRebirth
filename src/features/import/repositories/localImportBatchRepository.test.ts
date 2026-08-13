import type { SQLiteDatabase } from 'expo-sqlite';

import {
  cancelLocalImportBatch,
  completeLocalImportBatchSync,
  completeLocalImportBatch,
  createLocalImportBatch,
  failLocalImportBatchSync,
  findLocalImportBatchByFileHash,
  getLatestResumableLocalImportBatch,
  prepareLocalImportBatchSync,
  saveLocalImportBatchReview,
} from '@/features/import/repositories/localImportBatchRepository';
import type {
  ImportedTransactionCandidate,
  ImportBatchSyncPayload,
} from '@/features/import/types';

const mockGetLocalDatabase = jest.fn<Promise<SQLiteDatabase>, []>();

jest.mock('@/lib/storage/localDatabase', () => ({
  getLocalDatabase: () => mockGetLocalDatabase(),
}));

jest.mock('expo-crypto', () => ({ randomUUID: () => 'batch-id' }));
jest.mock('@/lib/storage/localIdentity', () => ({
  getOrCreateInstallationId: jest.fn(async () => 'installation-id'),
}));

function candidate(
  overrides: Partial<ImportedTransactionCandidate> = {},
): ImportedTransactionCandidate {
  return {
    id: 'item-id',
    sourceRowNumber: 2,
    rawDescription: 'MERCADONA MADRID',
    normalizedMerchant: 'mercadona madrid',
    displayTitle: 'MERCADONA MADRID',
    occurredOn: '2026-08-09',
    amountMinor: 3244,
    currency: 'EUR',
    type: 'expense',
    suggestedCategoryId: 'groceries',
    categoryId: 'groceries',
    duplicateStatus: 'none',
    issues: [],
    selected: true,
    ...overrides,
  };
}

describe('localImportBatchRepository', () => {
  const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
  const getFirstAsync = jest.fn();
  const getAllAsync = jest.fn();
  const database = {
    runAsync,
    getFirstAsync,
    getAllAsync,
    withExclusiveTransactionAsync: jest.fn(async (task) =>
      task({ runAsync, getFirstAsync }),
    ),
  } as unknown as SQLiteDatabase;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLocalDatabase.mockResolvedValue(database);
  });

  it('persiste solo los candidatos normalizados y nunca el archivo original', async () => {
    const batch = await createLocalImportBatch({
      spaceId: 'personal',
      sourceType: 'xlsx',
      candidates: [candidate()],
    });

    expect(batch).toMatchObject({
      id: 'batch-id',
      status: 'ready',
      totalItems: 1,
    });
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO import_batches'),
      'batch-id',
      'personal',
      'xlsx',
      'ready',
      1,
      0,
      0,
      expect.any(String),
      expect.any(String),
      null,
    );
    expect(runAsync).toHaveBeenLastCalledWith(
      expect.stringContaining('INSERT INTO import_items'),
      'item-id',
      'batch-id',
      'personal',
      2,
      'MERCADONA MADRID',
      'mercadona madrid',
      '2026-08-09',
      3244,
      'EUR',
      'expense',
      'groceries',
      'groceries',
      'none',
      'ready',
      1,
      '[]',
      expect.any(String),
      expect.any(String),
    );
  });

  it('guarda el hash del archivo cuando se provee', async () => {
    await createLocalImportBatch({
      spaceId: 'personal',
      sourceType: 'xlsx',
      candidates: [candidate()],
      fileHash: 'abc123',
    });

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO import_batches'),
      'batch-id',
      'personal',
      'xlsx',
      'ready',
      1,
      0,
      0,
      expect.any(String),
      expect.any(String),
      'abc123',
    );
  });

  it('encuentra una importación previa con el mismo hash en el espacio, salvo cancelada', async () => {
    getFirstAsync.mockResolvedValueOnce({
      id: 'previous-batch',
      status: 'imported',
      created_at: '2026-08-01T10:00:00.000Z',
    });

    await expect(
      findLocalImportBatchByFileHash('personal', 'abc123'),
    ).resolves.toEqual({
      id: 'previous-batch',
      status: 'imported',
      createdAt: '2026-08-01T10:00:00.000Z',
    });
    expect(getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining("status <> 'cancelled'"),
      'personal',
      'abc123',
    );
  });

  it('no encuentra nada sin espacio o hash', async () => {
    await expect(
      findLocalImportBatchByFileHash('', 'abc123'),
    ).resolves.toBeNull();
    await expect(
      findLocalImportBatchByFileHash('personal', ''),
    ).resolves.toBeNull();
    expect(getFirstAsync).not.toHaveBeenCalled();
  });

  it('guarda cambios de categoría y selección como una revisión atómica', async () => {
    await saveLocalImportBatchReview('batch-id', [
      candidate({
        categoryId: null,
        selected: false,
        issues: [{ code: 'unknown_category', message: 'Elige una categoría.' }],
      }),
    ]);

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE import_items'),
      null,
      'none',
      'pending',
      0,
      JSON.stringify([
        { code: 'unknown_category', message: 'Elige una categoría.' },
      ]),
      expect.any(String),
      'item-id',
      'batch-id',
    );
    expect(runAsync).toHaveBeenLastCalledWith(
      expect.stringContaining('UPDATE import_batches'),
      'needs_review',
      1,
      0,
      expect.any(String),
      'batch-id',
    );
  });

  it('asocia los movimientos creados a sus ítems al completar el batch', async () => {
    await completeLocalImportBatch('batch-id', new Map([['item-id', 'tx-id']]));

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("item_status = 'imported'"),
      'tx-id',
      expect.any(String),
      'item-id',
      'batch-id',
    );
    expect(runAsync).toHaveBeenLastCalledWith(
      expect.stringContaining('SET status = ?'),
      'imported',
      expect.any(String),
      expect.any(String),
      'batch-id',
    );
  });

  it('mantiene el batch abierto cuando todavía quedan movimientos sin importar', async () => {
    getFirstAsync.mockResolvedValue({ count: 2 });

    await expect(
      completeLocalImportBatch('batch-id', new Map([['item-id', 'tx-id']])),
    ).resolves.toBe(2);

    expect(runAsync).toHaveBeenLastCalledWith(
      expect.stringContaining('SET status = ?'),
      'needs_review',
      null,
      expect.any(String),
      'batch-id',
    );
  });

  it('prepara y confirma solo los lotes que ya pertenecen a la sesión actual', async () => {
    getFirstAsync.mockResolvedValue({ user_id: 'user-id' });
    getAllAsync
      .mockResolvedValueOnce([
        {
          id: 'batch-id',
          space_id: 'space-id',
          source_type: 'xlsx',
          status: 'needs_review',
          total_items: 1,
          review_items: 1,
          duplicate_items: 0,
          created_at: '2026-08-09T10:00:00.000Z',
          updated_at: '2026-08-09T10:00:00.000Z',
          completed_at: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'item-id',
          batch_id: 'batch-id',
          final_category_id: 'category-id',
          duplicate_transaction_id: null,
          source_row: 2,
          raw_description: 'MERCADONA MADRID',
          normalized_merchant: 'mercadona madrid',
          occurred_on: '2026-08-09',
          amount_minor: 3244,
          currency: 'EUR',
          movement_type: 'expense',
          duplicate_status: 'none',
          item_status: 'pending',
          is_selected: 1,
          issues: '[]',
          created_at: '2026-08-09T10:00:00.000Z',
          updated_at: '2026-08-09T10:00:00.000Z',
        },
      ]);

    const payload = await prepareLocalImportBatchSync('user-id');

    expect(payload).toMatchObject({
      installationId: 'installation-id',
      userId: 'user-id',
      batches: [{ id: 'batch-id', spaceLocalId: 'space-id' }],
      items: [
        { id: 'item-id', categoryLocalId: 'category-id', selected: true },
      ],
    });
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE import_batches SET sync_status = ?'),
      'syncing',
      'batch-id',
    );

    await completeLocalImportBatchSync(payload);
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("sync_status = 'synced'"),
      'batch-id',
      '2026-08-09T10:00:00.000Z',
    );
  });

  it('marca como fallidas solo las revisiones que quedaron sincronizando', async () => {
    const payload: ImportBatchSyncPayload = {
      installationId: 'installation-id',
      userId: 'user-id',
      batches: [],
      items: [
        {
          id: 'item-id',
          batchId: 'batch-id',
          sourceRow: 2,
          rawDescription: 'MERCADONA',
          normalizedMerchant: 'mercadona',
          movementType: 'expense',
          duplicateStatus: 'none',
          itemStatus: 'pending',
          selected: false,
          issues: [],
          createdAt: '2026-08-09T10:00:00.000Z',
          updatedAt: '2026-08-09T10:00:00.000Z',
        },
      ],
    };

    await failLocalImportBatchSync(payload);

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE import_items SET sync_status = ?'),
      'failed',
      'item-id',
    );
  });

  it('restaura únicamente el último batch pendiente del espacio solicitado', async () => {
    getAllAsync
      .mockResolvedValueOnce([
        {
          id: 'batch-id',
          space_id: 'space-id',
          source_type: 'xlsx',
          status: 'needs_review',
          total_items: 1,
          review_items: 1,
          duplicate_items: 0,
          created_at: '2026-08-09T10:00:00.000Z',
          updated_at: '2026-08-09T10:00:00.000Z',
          completed_at: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'item-id',
          source_row: 2,
          raw_description: 'MERCADONA MADRID',
          normalized_merchant: 'mercadona madrid',
          occurred_on: '2026-08-09',
          amount_minor: 3244,
          currency: 'EUR',
          movement_type: 'expense',
          suggested_category_id: 'groceries',
          final_category_id: null,
          duplicate_status: 'none',
          issues: JSON.stringify([
            { code: 'unknown_category', message: 'Elige una categoría.' },
          ]),
          is_selected: 0,
        },
      ]);

    await expect(
      getLatestResumableLocalImportBatch('space-id'),
    ).resolves.toMatchObject({
      id: 'batch-id',
      spaceId: 'space-id',
      candidates: [
        {
          id: 'item-id',
          displayTitle: 'Mercadona madrid',
          categoryId: null,
          selected: false,
        },
      ],
    });
    expect(getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE space_id = ?'),
      'space-id',
    );
  });

  it('descarta el batch sin borrar su trazabilidad ni tocar otros espacios', async () => {
    await cancelLocalImportBatch('batch-id');

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'cancelled'"),
      expect.any(String),
      'batch-id',
    );
  });
});
