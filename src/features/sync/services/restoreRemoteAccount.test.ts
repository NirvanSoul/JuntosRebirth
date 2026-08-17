import type { SQLiteDatabase } from 'expo-sqlite';

import {
  loadSpaces,
  saveSpaces,
} from '@/features/spaces/repositories/localSpaceRepository';
import { getLocalDatabase } from '@/lib/storage/localDatabase';

import { restoreRemoteAccount } from './restoreRemoteAccount';

jest.mock('@/lib/storage/localDatabase', () => ({
  getLocalDatabase: jest.fn(),
}));

jest.mock('@/features/spaces/repositories/localSpaceRepository', () => ({
  loadSpaces: jest.fn(),
  saveSpaces: jest.fn(),
}));

describe('restoreRemoteAccount (disciplina transaccional estructural)', () => {
  const mockGetLocalDatabase = getLocalDatabase as unknown as jest.Mock;
  const mockLoadSpaces = loadSpaces as unknown as jest.Mock;
  const mockSaveSpaces = saveSpaces as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadSpaces.mockResolvedValue({
      spaces: [{ id: 'personal', name: 'Personal', type: 'personal' }],
      activeSpaceId: 'personal',
    });
    mockSaveSpaces.mockResolvedValue(undefined);
  });

  it('ejecuta todos los accesos a SQLite dentro del bloque exclusivo usando el handle transaction', async () => {
    const globalDb = {
      getFirstAsync: jest.fn().mockResolvedValue(null),
      runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
      withExclusiveTransactionAsync: jest.fn(),
    } as unknown as SQLiteDatabase;

    const txHandle = {
      getFirstAsync: jest.fn().mockResolvedValue(null),
      runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
    } as unknown as SQLiteDatabase;

    (globalDb.withExclusiveTransactionAsync as jest.Mock).mockImplementation(
      async (callback: (tx: SQLiteDatabase) => Promise<void>) => {
        await callback(txHandle);
      },
    );

    mockGetLocalDatabase.mockResolvedValue(globalDb);

    await restoreRemoteAccount({
      userId: 'test-user-id',
      snapshot: {
        spaces: [
          {
            remoteId: 'space-remote-1',
            name: 'Juntos',
            type: 'couple',
            currency: 'VES',
          },
        ],
        categories: [
          {
            remoteId: 'cat-remote-1',
            spaceRemoteId: 'space-remote-1',
            name: 'Salario',
            icon: 'briefcase',
            colorToken: 'coral',
            budgetMinor: null,
            isDefault: false,
            templateKey: null,
            isArchived: false,
            createdAt: '2026-08-16T12:00:00.000Z',
            updatedAt: '2026-08-16T12:00:00.000Z',
          },
        ],
        recurringSeries: [],
        transactions: [
          {
            id: 'tx-remote-1',
            space_id: 'space-remote-1',
            category_id: 'cat-remote-1',
            created_by: 'test-user-id',
            type: 'income',
            amount_minor: 4000,
            currency: 'VES',
            title: 'Sueldo',
            occurred_on: '2026-08-16',
            recurrence: 'once',
            recurrence_group_id: null,
            recurrence_series_id: null,
            source_local_transaction_id: null,
            is_archived: false,
            created_at: '2026-08-16T12:00:00.000Z',
            updated_at: '2026-08-16T12:00:00.000Z',
            archived_at: null,
          },
        ],
      },
    });

    // 1. Las operaciones de espacio ocurren fuera de la transacción con la conexión global
    expect(globalDb.getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining('SELECT local_id FROM remote_entity_links'),
      'test-user-id',
      'space',
      'space-remote-1',
    );
    expect(globalDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO remote_entity_links'),
      'test-user-id',
      'space',
      'space-remote-1',
      'space-remote-1',
      expect.any(String),
      expect.any(String),
    );

    // 2. Comprobación estructural estricta: la conexión global NO debe recibir accesos para categories ni transactions
    const globalRunCalls = (globalDb.runAsync as jest.Mock).mock.calls;
    const globalLinksForCategoryOrTx = globalRunCalls.filter(
      (call) => call[2] === 'category' || call[2] === 'transaction',
    );
    expect(globalLinksForCategoryOrTx).toHaveLength(0);

    const globalGetFirstCalls = (globalDb.getFirstAsync as jest.Mock).mock
      .calls;
    const globalFirstForCategoryOrTx = globalGetFirstCalls.filter(
      (call) => call[2] === 'category' || call[2] === 'transaction',
    );
    expect(globalFirstForCategoryOrTx).toHaveLength(0);

    // 3. El handle transaction DEBE haber recibido todas las operaciones de categories, transactions y sus links
    expect(txHandle.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO remote_entity_links'),
      'test-user-id',
      'category',
      'cat-remote-1',
      'cat-remote-1',
      expect.any(String),
      expect.any(String),
    );
    expect(txHandle.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO categories'),
      'cat-remote-1',
      'space-remote-1',
      'Salario',
      'briefcase',
      'coral',
      null,
      0,
      null,
      'cat-remote-1',
      'test-user-id',
      0,
      '2026-08-16T12:00:00.000Z',
      '2026-08-16T12:00:00.000Z',
    );
    expect(txHandle.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO remote_entity_links'),
      'test-user-id',
      'transaction',
      'tx-remote-1',
      'tx-remote-1',
      expect.any(String),
      expect.any(String),
    );
    expect(txHandle.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO transactions'),
      'tx-remote-1',
      'space-remote-1',
      'cat-remote-1',
      'test-user-id',
      'income',
      4000,
      'VES',
      'Sueldo',
      '2026-08-16',
      'once',
      null,
      null,
      null,
      0,
      '2026-08-16T12:00:00.000Z',
      '2026-08-16T12:00:00.000Z',
      null,
    );
  });
});
