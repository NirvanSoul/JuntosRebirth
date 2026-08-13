import type { SQLiteDatabase } from 'expo-sqlite';

import {
  completeLocalMerchantRuleSync,
  failLocalMerchantRuleSync,
  listLocalMerchantRules,
  prepareLocalMerchantRuleSync,
  saveLocalMerchantRule,
} from '@/features/import/repositories/localMerchantRuleRepository';

const mockGetLocalDatabase = jest.fn<Promise<SQLiteDatabase>, []>();

jest.mock('@/lib/storage/localDatabase', () => ({
  getLocalDatabase: () => mockGetLocalDatabase(),
}));

jest.mock('expo-crypto', () => ({ randomUUID: () => 'rule-id' }));

jest.mock('@/lib/storage/localIdentity', () => ({
  getOrCreateInstallationId: jest.fn(async () => 'installation-id'),
}));

const row = {
  id: 'rule-id',
  space_id: 'personal',
  normalized_merchant: 'mercadona',
  category_id: 'groceries',
  confirmations: 2,
  source: 'import_correction',
  last_used_at: '2026-08-09T10:00:00.000Z',
  created_at: '2026-08-08T10:00:00.000Z',
  updated_at: '2026-08-09T10:00:00.000Z',
};

describe('localMerchantRuleRepository', () => {
  const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
  const getAllAsync = jest.fn();
  const getFirstAsync = jest.fn();
  const database = {
    runAsync,
    getAllAsync,
    getFirstAsync,
  } as unknown as SQLiteDatabase;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLocalDatabase.mockResolvedValue(database);
  });

  it('recupera únicamente las reglas del espacio activo', async () => {
    getAllAsync.mockResolvedValueOnce([row]);

    await expect(listLocalMerchantRules('personal')).resolves.toEqual([
      expect.objectContaining({
        normalizedMerchant: 'mercadona',
        categoryId: 'groceries',
      }),
    ]);
    expect(getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE space_id = ?'),
      'personal',
    );
  });

  it('actualiza una única regla cuando el usuario cambia la categoría', async () => {
    getFirstAsync.mockResolvedValueOnce(row);

    await expect(
      saveLocalMerchantRule({
        spaceId: 'personal',
        normalizedMerchant: ' mercadona ',
        categoryId: 'groceries',
      }),
    ).resolves.toMatchObject({ confirmations: 2, categoryId: 'groceries' });

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT (space_id, normalized_merchant)'),
      'rule-id',
      'personal',
      'mercadona',
      'groceries',
      'import_correction',
      expect.any(String),
      expect.any(String),
      expect.any(String),
    );
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining(
        'confirmations = import_merchant_rules.confirmations + 1',
      ),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it('rechaza reglas sin comercio normalizado', async () => {
    await expect(
      saveLocalMerchantRule({
        spaceId: 'personal',
        normalizedMerchant: ' ',
        categoryId: 'groceries',
      }),
    ).rejects.toThrow('La regla local de importación no es válida');
  });

  it('prepara un lote idempotente y confirma únicamente reglas sin cambios', async () => {
    getFirstAsync.mockResolvedValueOnce({ user_id: 'user-id' });
    getAllAsync.mockResolvedValueOnce([{ ...row, sync_status: 'pending' }]);

    const payload = await prepareLocalMerchantRuleSync('user-id');
    expect(payload).toMatchObject({
      userId: 'user-id',
      rules: [
        expect.objectContaining({ id: 'rule-id', spaceLocalId: 'personal' }),
      ],
    });
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('SET sync_status = ?'),
      'syncing',
      'rule-id',
    );

    await completeLocalMerchantRuleSync(payload);
    expect(runAsync).toHaveBeenLastCalledWith(
      expect.stringContaining("SET sync_status = 'synced'"),
      'rule-id',
      row.updated_at,
    );

    await failLocalMerchantRuleSync(payload);
    expect(runAsync).toHaveBeenLastCalledWith(
      expect.stringContaining('SET sync_status = ?'),
      'failed',
      'rule-id',
    );
  });
});
