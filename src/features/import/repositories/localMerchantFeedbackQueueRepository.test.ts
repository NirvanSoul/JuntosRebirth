import type { SQLiteDatabase } from 'expo-sqlite';

import {
  completeLocalMerchantFeedbackSync,
  enqueueMerchantFeedback,
  failLocalMerchantFeedbackSync,
  prepareLocalMerchantFeedbackSync,
} from '@/features/import/repositories/localMerchantFeedbackQueueRepository';

const mockGetLocalDatabase = jest.fn<Promise<SQLiteDatabase>, []>();

jest.mock('@/lib/storage/localDatabase', () => ({
  getLocalDatabase: () => mockGetLocalDatabase(),
}));

jest.mock('expo-crypto', () => ({ randomUUID: () => 'feedback-id' }));

describe('localMerchantFeedbackQueueRepository', () => {
  const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
  const getAllAsync = jest.fn();
  const database = { runAsync, getAllAsync } as unknown as SQLiteDatabase;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLocalDatabase.mockResolvedValue(database);
  });

  it('encola un voto ignorando duplicados por el mismo ítem', async () => {
    await enqueueMerchantFeedback({
      importItemId: 'item-1',
      canonicalCategoryKey: 'groceries',
    });

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT (import_item_id) DO NOTHING'),
      'feedback-id',
      'item-1',
      'groceries',
      expect.any(String),
      expect.any(String),
    );
  });

  it('no encola nada sin ítem o clave canónica', async () => {
    await enqueueMerchantFeedback({
      importItemId: '',
      canonicalCategoryKey: '',
    });
    expect(runAsync).not.toHaveBeenCalled();
  });

  it('solo prepara votos cuyo import_item ya está sincronizado, y los marca syncing', async () => {
    getAllAsync.mockResolvedValueOnce([
      {
        id: 'feedback-id',
        import_item_id: 'item-1',
        canonical_category_key: 'groceries',
        created_at: '2026-08-09T10:00:00.000Z',
        updated_at: '2026-08-09T10:00:00.000Z',
      },
    ]);

    const entries = await prepareLocalMerchantFeedbackSync();
    expect(entries).toEqual([
      expect.objectContaining({
        id: 'feedback-id',
        importItemId: 'item-1',
        canonicalCategoryKey: 'groceries',
      }),
    ]);
    expect(getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining("i.sync_status = 'synced'"),
    );
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("status = 'syncing'"),
      'feedback-id',
    );
  });

  it('confirma y falla un voto individualmente', async () => {
    await completeLocalMerchantFeedbackSync('feedback-id');
    expect(runAsync).toHaveBeenLastCalledWith(
      expect.stringContaining("status = 'synced'"),
      expect.any(String),
      'feedback-id',
    );

    await failLocalMerchantFeedbackSync('feedback-id');
    expect(runAsync).toHaveBeenLastCalledWith(
      expect.stringContaining("status = 'failed'"),
      expect.any(String),
      'feedback-id',
    );
  });
});
