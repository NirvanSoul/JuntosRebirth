import type { SQLiteDatabase } from 'expo-sqlite';

import type { SpacesState } from '@/features/spaces/types';

import {
  loadSpaces,
  saveSpaces,
  updateSpaces,
} from '@/features/spaces/repositories/localSpaceRepository';
import { authClient } from '@/lib/auth-client';
import { getLocalDatabase } from '@/lib/storage/localDatabase';
import { fetchRemoteImportReviews } from '@/features/import/gateways/juntossImportReviewGateway';
import {
  fetchRemoteAccountChanges,
  fetchRemoteAccountSnapshot,
} from '@/features/sync/gateways/juntossRemoteAccountGateway';
import {
  readRemoteChangesCursor,
  writeRemoteChangesCursor,
} from '@/features/sync/repositories/localSyncCursorRepository';

import {
  restoreRemoteAccount,
  restoreRemoteAccountForCurrentSession,
} from './restoreRemoteAccount';

jest.mock('@/lib/storage/localDatabase', () => ({
  getLocalDatabase: jest.fn(),
}));

jest.mock('@/features/spaces/repositories/localSpaceRepository', () => ({
  loadSpaces: jest.fn(),
  saveSpaces: jest.fn(),
  updateSpaces: jest.fn(),
}));

jest.mock('@/lib/auth-client', () => ({
  authClient: { getSession: jest.fn() },
}));
jest.mock('@/features/sync/gateways/juntossRemoteAccountGateway', () => ({
  fetchRemoteAccountSnapshot: jest.fn(),
  fetchRemoteAccountChanges: jest.fn(),
}));
jest.mock('@/features/sync/repositories/localSyncCursorRepository', () => ({
  readRemoteChangesCursor: jest.fn(),
  writeRemoteChangesCursor: jest.fn(),
  clearRemoteChangesCursor: jest.fn(),
}));
jest.mock('@/features/import/gateways/juntossImportReviewGateway', () => ({
  fetchRemoteImportReviews: jest.fn(),
}));
jest.mock('@/features/sync/services/restoreRemoteImportReviews', () => ({
  restoreRemoteImportReviews: jest.fn(),
}));

describe('restoreRemoteAccount (disciplina transaccional estructural)', () => {
  const mockGetLocalDatabase = getLocalDatabase as unknown as jest.Mock;
  const mockLoadSpaces = loadSpaces as unknown as jest.Mock;
  const mockSaveSpaces = saveSpaces as unknown as jest.Mock;
  const mockGetSession = authClient.getSession as jest.Mock;
  const mockFetchSnapshot = fetchRemoteAccountSnapshot as jest.Mock;
  const mockFetchImportReviews = fetchRemoteImportReviews as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadSpaces.mockResolvedValue({
      spaces: [{ id: 'personal', name: 'Personal', type: 'personal' }],
      activeSpaceId: 'personal',
    });
    mockSaveSpaces.mockResolvedValue(undefined);
    // El doble reproduce el contrato real del repositorio: lee, muta, guarda.
    (updateSpaces as unknown as jest.Mock).mockImplementation(
      async (mutate: (stored: SpacesState) => SpacesState) => {
        const next = mutate((await loadSpaces()) as SpacesState);
        await saveSpaces(next);
        return next;
      },
    );
    mockGetSession.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
    });
    mockFetchImportReviews.mockResolvedValue([]);
  });

  it('ejecuta todos los accesos a SQLite dentro del bloque exclusivo usando el handle transaction', async () => {
    const globalDb = {
      getAllAsync: jest.fn().mockResolvedValue([]),
      getFirstAsync: jest.fn().mockResolvedValue(null),
      runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
      withExclusiveTransactionAsync: jest.fn(),
    } as unknown as SQLiteDatabase;

    const txHandle = {
      getAllAsync: jest.fn().mockResolvedValue([]),
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
        serverTime: '2026-03-30T10:00:00.000Z',
        activeFinancialContextId: null,
        moneyAccounts: [],
        spaces: [
          {
            remoteId: 'space-remote-1',
            name: 'Juntos',
            type: 'couple',
            currency: 'VES',
            activatedAt: null,
          },
        ],
        categories: [
          {
            remoteId: 'cat-remote-1',
            spaceRemoteId: 'space-remote-1',
            name: 'Salario',
            icon: 'briefcase',
            colorToken: 'coral',
            budgets: [],
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
            remoteId: 'tx-remote-1',
            spaceRemoteId: 'space-remote-1',
            categoryRemoteId: 'cat-remote-1',
            moneyAccountRemoteId: null,
            // Las filas antiguas de Neon pueden no tener autor. La copia local
            // exige `created_by`, así que debe usar el usuario de la sesión.
            createdBy: null,
            type: 'income',
            amountMinor: 4000,
            currency: 'VES',
            title: 'Sueldo',
            occurredOn: '2026-08-16',
            note: null,
            recurrence: 'once',
            recurrenceGroupId: null,
            recurrenceSeriesRemoteId: null,
            sourceTransactionId: null,
            isArchived: false,
            createdAt: '2026-08-16T12:00:00.000Z',
            updatedAt: '2026-08-16T12:00:00.000Z',
            archivedAt: null,
          },
        ],
      },
    });

    // 1. Las operaciones de espacio ocurren fuera de la transacción con la conexión global
    expect(globalDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining(
        'SELECT remote_id, local_id FROM remote_entity_links',
      ),
      'test-user-id',
      'space',
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

    const globalReadCalls = [
      ...(globalDb.getFirstAsync as jest.Mock).mock.calls,
      ...(globalDb.getAllAsync as jest.Mock).mock.calls,
    ];
    const globalReadsForCategoryOrTx = globalReadCalls.filter(
      (call) => call[2] === 'category' || call[2] === 'transaction',
    );
    expect(globalReadsForCategoryOrTx).toHaveLength(0);

    // 3. El handle transaction DEBE haber recibido todas las operaciones de categories, transactions y sus links.
    // Los enlaces se leen de una vez por tipo, dentro de la transacción.
    expect(txHandle.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining(
        'SELECT remote_id, local_id FROM remote_entity_links',
      ),
      'test-user-id',
      'category',
    );
    expect(txHandle.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining(
        'SELECT remote_id, local_id FROM remote_entity_links',
      ),
      'test-user-id',
      'transaction',
    );
    expect(txHandle.getFirstAsync).not.toHaveBeenCalled();
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
      null,
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
      // La nota ya no se escribe como NULL fijo: la API la devuelve.
      null,
      // Legacy no tiene valor contable VE congelado.
      null,
      // Los movimientos legacy no tienen snapshot histórico.
      null,
      0,
      '2026-08-16T12:00:00.000Z',
      '2026-08-16T12:00:00.000Z',
      null,
    );

    const transactionInsert = (txHandle.runAsync as jest.Mock).mock.calls.find(
      ([sql]) =>
        typeof sql === 'string' && sql.includes('INSERT INTO transactions'),
    )?.[0] as string;
    expect(transactionInsert).toContain(
      'note, sync_status,\n           accounting_amount_minor_usd, exchange_snapshot_json,',
    );
    expect(transactionInsert).not.toContain(
      'exchange_snapshot_json, sync_status,',
    );
  });

  it('conserva el id local histórico de un espacio ya enlazado sin releer el enlace', async () => {
    const database = {
      getAllAsync: jest.fn(
        async (_sql: string, _userId: string, entityType: string) =>
          entityType === 'space'
            ? [{ remote_id: 'personal-remote', local_id: 'personal' }]
            : [],
      ),
      getFirstAsync: jest.fn().mockResolvedValue(null),
      runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
      withExclusiveTransactionAsync: jest
        .fn()
        .mockImplementation(
          async (callback: (tx: SQLiteDatabase) => Promise<void>) =>
            callback(database),
        ),
    } as unknown as SQLiteDatabase;
    mockGetLocalDatabase.mockResolvedValue(database);

    const restored = await restoreRemoteAccount({
      userId: 'test-user-id',
      snapshot: {
        serverTime: '2026-03-30T10:00:00.000Z',
        activeFinancialContextId: null,
        spaces: [
          {
            remoteId: 'personal-remote',
            name: 'Personal',
            type: 'personal',
            currency: 'EUR',
            activatedAt: null,
          },
          {
            remoteId: 'couple-remote',
            name: 'Juntos',
            type: 'couple',
            currency: 'EUR',
            activatedAt: null,
          },
        ],
        categories: [],
        moneyAccounts: [],
        recurringSeries: [],
        transactions: [],
      },
    });

    expect(restored.localSpaceIdByRemoteId.get('personal-remote')).toBe(
      'personal',
    );
    expect(restored.localSpaceIdByRemoteId.get('couple-remote')).toBe(
      'couple-remote',
    );
    expect(database.getFirstAsync).not.toHaveBeenCalled();
    const linkWrites = (database.runAsync as jest.Mock).mock.calls.filter(
      ([sql]) =>
        typeof sql === 'string' &&
        sql.includes('INSERT INTO remote_entity_links'),
    );
    expect(linkWrites.map((call) => [call[2], call[3], call[4]])).toEqual([
      ['space', 'personal-remote', 'personal'],
      ['space', 'couple-remote', 'couple-remote'],
    ]);
  });

  it('enlaza el espacio personal provisional al remoto si conserva movimientos del onboarding', async () => {
    const database = {
      getAllAsync: jest.fn().mockResolvedValue([]),
      getFirstAsync: jest.fn().mockResolvedValue({ id: 'onboarding-income' }),
      runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
      withExclusiveTransactionAsync: jest
        .fn()
        .mockImplementation(
          async (callback: (tx: SQLiteDatabase) => Promise<void>) =>
            callback(database),
        ),
    } as unknown as SQLiteDatabase;
    mockGetLocalDatabase.mockResolvedValue(database);

    const restored = await restoreRemoteAccount({
      userId: 'test-user-id',
      snapshot: {
        serverTime: '2026-03-30T10:00:00.000Z',
        activeFinancialContextId: null,
        spaces: [
          {
            remoteId: 'personal-remote',
            name: 'Personal',
            type: 'personal',
            currency: 'EUR',
            activatedAt: null,
          },
        ],
        categories: [],
        moneyAccounts: [],
        recurringSeries: [],
        transactions: [],
      },
    });

    expect(restored.localSpaceIdByRemoteId.get('personal-remote')).toBe(
      'personal',
    );
    expect(database.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO remote_entity_links'),
      'test-user-id',
      'space',
      'personal-remote',
      'personal',
      expect.any(String),
      expect.any(String),
    );
  });

  it('marca como pendiente el espacio juntos que el snapshot trae sin activar', async () => {
    const database = {
      getAllAsync: jest.fn().mockResolvedValue([]),
      getFirstAsync: jest.fn().mockResolvedValue(null),
      runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
      withExclusiveTransactionAsync: jest
        .fn()
        .mockImplementation(
          async (callback: (tx: SQLiteDatabase) => Promise<void>) =>
            callback(database),
        ),
    } as unknown as SQLiteDatabase;
    mockGetLocalDatabase.mockResolvedValue(database);

    const restored = await restoreRemoteAccount({
      userId: 'test-user-id',
      snapshot: {
        serverTime: '2026-03-30T10:00:00.000Z',
        activeFinancialContextId: null,
        spaces: [
          {
            remoteId: 'personal-remote',
            name: 'Personal',
            type: 'personal',
            currency: 'EUR',
            activatedAt: '2026-08-01T00:00:00.000Z',
          },
          {
            remoteId: 'couple-remote',
            name: 'Juntos',
            type: 'couple',
            currency: 'EUR',
            activatedAt: null,
          },
        ],
        categories: [],
        moneyAccounts: [],
        recurringSeries: [],
        transactions: [],
      },
    });

    expect(restored.spaces).toEqual([
      {
        id: 'personal-remote',
        name: 'Personal',
        type: 'personal',
        currency: 'EUR',
      },
      {
        id: 'couple-remote',
        name: 'Juntos',
        type: 'couple',
        currency: 'EUR',
        isAwaitingPartner: true,
      },
    ]);
    expect(mockSaveSpaces).toHaveBeenCalledWith({
      activeSpaceId: 'personal-remote',
      spaces: restored.spaces,
    });
  });

  it('pide el snapshot y las revisiones de importación a la vez', async () => {
    const order: string[] = [];
    let resolveSnapshot: ((value: object) => void) | undefined;
    mockFetchSnapshot.mockImplementation(() => {
      order.push('snapshot');
      return new Promise((resolve) => {
        resolveSnapshot = resolve;
      });
    });
    mockFetchImportReviews.mockImplementation(async () => {
      order.push('reviews');
      return [];
    });
    const database = {
      getAllAsync: jest.fn().mockResolvedValue([]),
      getFirstAsync: jest.fn().mockResolvedValue(null),
      runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
      withExclusiveTransactionAsync: jest
        .fn()
        .mockImplementation(
          async (callback: (tx: SQLiteDatabase) => Promise<void>) =>
            callback(database),
        ),
    } as unknown as SQLiteDatabase;
    mockGetLocalDatabase.mockResolvedValue(database);

    const restoring = restoreRemoteAccountForCurrentSession();
    await new Promise(setImmediate);
    // Las revisiones ya se pidieron sin esperar a que llegara el snapshot.
    expect(order).toEqual(['snapshot', 'reviews']);

    resolveSnapshot?.({
      activeFinancialContextId: null,
      spaces: [
        {
          remoteId: 'personal-remote',
          name: 'Personal',
          type: 'personal',
          currency: 'EUR',
          activatedAt: null,
        },
      ],
      categories: [],
      moneyAccounts: [],
      recurringSeries: [],
      transactions: [],
    });
    await restoring;
  });

  it('reemplaza el catálogo visible al restaurar otro contexto financiero', async () => {
    mockLoadSpaces.mockResolvedValue({
      activeSpaceId: 'personal',
      spaces: [
        { id: 'personal', name: 'Personal', type: 'personal', currency: 'EUR' },
        { id: 'shared-es', name: 'España', type: 'couple', currency: 'EUR' },
      ],
    });
    const database = {
      getAllAsync: jest.fn().mockResolvedValue([]),
      getFirstAsync: jest.fn().mockResolvedValue(null),
      runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
      withExclusiveTransactionAsync: jest
        .fn()
        .mockImplementation(
          async (callback: (tx: SQLiteDatabase) => Promise<void>) =>
            callback(database),
        ),
    } as unknown as SQLiteDatabase;
    mockGetLocalDatabase.mockResolvedValue(database);

    await restoreRemoteAccount({
      userId: 'test-user-id',
      snapshot: {
        serverTime: '2026-03-30T10:00:00.000Z',
        activeFinancialContextId: 'context-ve',
        spaces: [
          {
            remoteId: 'personal-ve',
            name: 'Personal',
            type: 'personal',
            currency: 'USD',
            activatedAt: null,
          },
        ],
        categories: [],
        moneyAccounts: [],
        recurringSeries: [],
        transactions: [],
      },
    });

    expect(mockSaveSpaces).toHaveBeenCalledWith({
      activeSpaceId: 'personal-ve',
      spaces: [
        {
          id: 'personal-ve',
          name: 'Personal',
          type: 'personal',
          currency: 'USD',
        },
      ],
    });
  });

  it('comparte el snapshot en curso de la misma sesión', async () => {
    let resolveSnapshot: ((value: object) => void) | undefined;
    mockFetchSnapshot.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSnapshot = resolve;
        }),
    );
    const database = {
      getAllAsync: jest.fn().mockResolvedValue([]),
      getFirstAsync: jest.fn().mockResolvedValue(null),
      runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
      withExclusiveTransactionAsync: jest
        .fn()
        .mockImplementation(
          async (callback: (tx: SQLiteDatabase) => Promise<void>) =>
            callback(database),
        ),
    } as unknown as SQLiteDatabase;
    mockGetLocalDatabase.mockResolvedValue(database);

    const first = restoreRemoteAccountForCurrentSession();
    const second = restoreRemoteAccountForCurrentSession();
    await new Promise(setImmediate);
    expect(mockFetchSnapshot).toHaveBeenCalledTimes(1);

    resolveSnapshot?.({
      activeFinancialContextId: null,
      spaces: [
        {
          remoteId: 'personal-remote',
          name: 'Personal',
          type: 'personal',
          currency: 'EUR',
          activatedAt: null,
        },
      ],
      categories: [],
      moneyAccounts: [],
      recurringSeries: [],
      transactions: [],
    });

    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
  });
});

describe('restoreRemoteAccount (delta sync y cursor)', () => {
  const mockGetLocalDatabase = getLocalDatabase as unknown as jest.Mock;
  const mockLoadSpaces = loadSpaces as unknown as jest.Mock;
  const mockSaveSpaces = saveSpaces as unknown as jest.Mock;
  const mockGetSession = authClient.getSession as jest.Mock;
  const mockFetchSnapshot = fetchRemoteAccountSnapshot as jest.Mock;
  const mockFetchChanges = fetchRemoteAccountChanges as jest.Mock;
  const mockFetchImportReviews = fetchRemoteImportReviews as jest.Mock;
  const mockReadCursor = readRemoteChangesCursor as jest.Mock;
  const mockWriteCursor = writeRemoteChangesCursor as jest.Mock;

  let database: SQLiteDatabase;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadSpaces.mockResolvedValue({
      spaces: [
        {
          id: 'personal',
          name: 'Personal',
          type: 'personal',
          currency: 'EUR',
        },
      ],
      activeSpaceId: 'personal',
    });
    mockSaveSpaces.mockResolvedValue(undefined);
    (updateSpaces as unknown as jest.Mock).mockImplementation(
      async (mutate: (stored: SpacesState) => SpacesState) => {
        const next = mutate((await loadSpaces()) as SpacesState);
        await saveSpaces(next);
        return next;
      },
    );
    mockGetSession.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
    });
    mockFetchImportReviews.mockResolvedValue([]);

    database = {
      getAllAsync: jest.fn().mockResolvedValue([]),
      getFirstAsync: jest.fn().mockResolvedValue(null),
      runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
      withExclusiveTransactionAsync: jest
        .fn()
        .mockImplementation(
          async (callback: (tx: SQLiteDatabase) => Promise<void>) =>
            callback(database),
        ),
    } as unknown as SQLiteDatabase;
    mockGetLocalDatabase.mockResolvedValue(database);
  });

  it('full guarda el cursor si el snapshot incluye serverTime', async () => {
    await restoreRemoteAccount({
      userId: 'test-user-id',
      snapshot: {
        serverTime: '2026-09-11T12:00:00.000Z',
        activeFinancialContextId: 'ctx-1',
        spaces: [
          {
            remoteId: 'space-b',
            name: 'Pareja',
            type: 'couple',
            currency: 'EUR',
            activatedAt: null,
          },
          {
            remoteId: 'space-a',
            name: 'Personal',
            type: 'personal',
            currency: 'EUR',
            activatedAt: null,
          },
        ],
        categories: [],
        moneyAccounts: [],
        recurringSeries: [],
        transactions: [],
      },
    });

    expect(mockWriteCursor).toHaveBeenCalledWith(database, 'test-user-id', {
      serverTime: '2026-09-11T12:00:00.000Z',
      activeFinancialContextId: 'ctx-1',
      spaceRemoteIds: ['space-a', 'space-b'],
    });
  });

  it('delta sin cursor realiza un restore full', async () => {
    mockReadCursor.mockResolvedValue(null);
    mockFetchSnapshot.mockResolvedValue({
      activeFinancialContextId: null,
      serverTime: '2026-09-11T12:00:00.000Z',
      spaces: [
        {
          remoteId: 'personal-remote',
          name: 'Personal',
          type: 'personal',
          currency: 'EUR',
          activatedAt: null,
        },
      ],
      categories: [],
      moneyAccounts: [],
      recurringSeries: [],
      transactions: [],
    });

    const result = await restoreRemoteAccountForCurrentSession({
      mode: 'delta',
    });

    expect(mockFetchSnapshot).toHaveBeenCalled();
    expect(mockFetchChanges).not.toHaveBeenCalled();
    expect(result.outcome.mode).toBe('full');
  });

  it('delta con contexto financiero o espacios distintos realiza restore full', async () => {
    mockReadCursor.mockResolvedValue({
      serverTime: '2026-09-11T11:00:00.000Z',
      activeFinancialContextId: 'ctx-old',
      spaceRemoteIds: ['space-1'],
    });
    mockFetchChanges.mockResolvedValue({
      serverTime: '2026-09-11T12:00:00.000Z',
      activeFinancialContextId: 'ctx-new',
      spaces: [
        {
          remoteId: 'space-1',
          name: 'Personal',
          type: 'personal',
          currency: 'EUR',
          activatedAt: null,
        },
      ],
      categories: [],
      moneyAccounts: [],
      recurringSeries: [],
      transactions: [],
    });
    mockFetchSnapshot.mockResolvedValue({
      activeFinancialContextId: 'ctx-new',
      serverTime: '2026-09-11T12:00:00.000Z',
      spaces: [
        {
          remoteId: 'space-1',
          name: 'Personal',
          type: 'personal',
          currency: 'EUR',
          activatedAt: null,
        },
      ],
      categories: [],
      moneyAccounts: [],
      recurringSeries: [],
      transactions: [],
    });

    const result = await restoreRemoteAccountForCurrentSession({
      mode: 'delta',
    });

    expect(mockFetchChanges).toHaveBeenCalledWith('2026-09-11T11:00:00.000Z');
    expect(mockFetchSnapshot).toHaveBeenCalled();
    expect(result.outcome.mode).toBe('full');
  });

  it('delta vacío no abre transacción ni toca catálogo (receivedRows: 0)', async () => {
    mockReadCursor.mockResolvedValue({
      serverTime: '2026-09-11T11:00:00.000Z',
      activeFinancialContextId: 'ctx-1',
      spaceRemoteIds: ['space-1'],
    });
    (database.getAllAsync as jest.Mock).mockImplementation(
      async (sql: string, ...params: unknown[]) => {
        if (
          typeof sql === 'string' &&
          sql.includes('FROM remote_entity_links')
        ) {
          const entityType = params[1];
          if (entityType === 'space')
            return [{ remote_id: 'space-1', local_id: 'personal' }];
        }
        return [];
      },
    );
    mockFetchChanges.mockResolvedValue({
      serverTime: '2026-09-11T12:00:00.000Z',
      activeFinancialContextId: 'ctx-1',
      spaces: [
        {
          remoteId: 'space-1',
          name: 'Personal',
          type: 'personal',
          currency: 'EUR',
          activatedAt: null,
        },
      ],
      categories: [],
      moneyAccounts: [],
      recurringSeries: [],
      transactions: [],
    });

    const result = await restoreRemoteAccountForCurrentSession({
      mode: 'delta',
    });

    expect(result.outcome).toEqual({
      mode: 'delta',
      receivedRows: 0,
      catalogueChanged: false,
    });
    expect(database.withExclusiveTransactionAsync).not.toHaveBeenCalled();
    expect(mockWriteCursor).toHaveBeenCalledWith(
      database,
      'test-user-id',
      expect.objectContaining({ serverTime: '2026-09-11T12:00:00.000Z' }),
    );
  });

  it('delta no pide import-reviews', async () => {
    mockReadCursor.mockResolvedValue({
      serverTime: '2026-09-11T11:00:00.000Z',
      activeFinancialContextId: 'ctx-1',
      spaceRemoteIds: ['space-1'],
    });
    mockFetchChanges.mockResolvedValue({
      serverTime: '2026-09-11T12:00:00.000Z',
      activeFinancialContextId: 'ctx-1',
      spaces: [
        {
          remoteId: 'space-1',
          name: 'Personal',
          type: 'personal',
          currency: 'EUR',
          activatedAt: null,
        },
      ],
      categories: [],
      moneyAccounts: [],
      recurringSeries: [],
      transactions: [],
    });

    await restoreRemoteAccountForCurrentSession({ mode: 'delta' });

    expect(mockFetchImportReviews).not.toHaveBeenCalled();
  });

  it('full pedido durante un delta espera a que termine el delta', async () => {
    mockReadCursor.mockResolvedValue({
      serverTime: '2026-09-11T11:00:00.000Z',
      activeFinancialContextId: 'ctx-1',
      spaceRemoteIds: ['space-1'],
    });
    let resolveDelta: ((val: object) => void) | undefined;
    mockFetchChanges.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDelta = resolve;
        }),
    );
    mockFetchSnapshot.mockResolvedValue({
      activeFinancialContextId: 'ctx-1',
      serverTime: '2026-09-11T12:00:00.000Z',
      spaces: [
        {
          remoteId: 'space-1',
          name: 'Personal',
          type: 'personal',
          currency: 'EUR',
          activatedAt: null,
        },
      ],
      categories: [],
      moneyAccounts: [],
      recurringSeries: [],
      transactions: [],
    });

    const deltaPromise = restoreRemoteAccountForCurrentSession({
      mode: 'delta',
    });
    const fullPromise = restoreRemoteAccountForCurrentSession({
      mode: 'full',
    });

    await new Promise(setImmediate);
    expect(mockFetchSnapshot).not.toHaveBeenCalled();

    resolveDelta?.({
      serverTime: '2026-09-11T11:30:00.000Z',
      activeFinancialContextId: 'ctx-1',
      spaces: [
        {
          remoteId: 'space-1',
          name: 'Personal',
          type: 'personal',
          currency: 'EUR',
          activatedAt: null,
        },
      ],
      categories: [],
      moneyAccounts: [],
      recurringSeries: [],
      transactions: [],
    });

    await deltaPromise;
    const fullResult = await fullPromise;

    expect(mockFetchSnapshot).toHaveBeenCalledTimes(1);
    expect(fullResult.outcome.mode).toBe('full');
  });

  it('delta resuelve categoría por enlace existente sin reescribir enlace', async () => {
    mockReadCursor.mockResolvedValue({
      serverTime: '2026-09-11T11:00:00.000Z',
      activeFinancialContextId: 'ctx-1',
      spaceRemoteIds: ['space-1'],
    });
    (database.getAllAsync as jest.Mock).mockImplementation(
      async (sql: string, ...params: unknown[]) => {
        if (
          typeof sql === 'string' &&
          sql.includes('FROM remote_entity_links')
        ) {
          const entityType = params[1];
          if (entityType === 'space')
            return [{ remote_id: 'space-1', local_id: 'personal' }];
          if (entityType === 'category')
            return [{ remote_id: 'cat-remota', local_id: 'cat-local' }];
        }
        return [];
      },
    );

    mockFetchChanges.mockResolvedValue({
      serverTime: '2026-09-11T12:00:00.000Z',
      activeFinancialContextId: 'ctx-1',
      spaces: [
        {
          remoteId: 'space-1',
          name: 'Personal',
          type: 'personal',
          currency: 'EUR',
          activatedAt: null,
        },
      ],
      categories: [],
      moneyAccounts: [],
      recurringSeries: [],
      transactions: [
        {
          remoteId: 'tx-remota',
          spaceRemoteId: 'space-1',
          categoryRemoteId: 'cat-remota',
          moneyAccountRemoteId: null,
          createdBy: 'user-1',
          type: 'expense',
          amountMinor: 100,
          currency: 'EUR',
          title: 'Café',
          occurredOn: '2026-09-11',
          note: null,
          recurrence: 'once',
          recurrenceGroupId: null,
          recurrenceSeriesRemoteId: null,
          sourceTransactionId: null,
          isArchived: false,
          createdAt: '2026-09-11T11:30:00.000Z',
          updatedAt: '2026-09-11T11:30:00.000Z',
          archivedAt: null,
        },
      ],
    });

    const result = await restoreRemoteAccountForCurrentSession({
      mode: 'delta',
    });

    expect(result.outcome.receivedRows).toBe(1);
    const linkCategoryInserts = (
      database.runAsync as jest.Mock
    ).mock.calls.filter(
      ([sql, ...params]) =>
        typeof sql === 'string' &&
        sql.includes('INSERT INTO remote_entity_links') &&
        params.includes('category'),
    );
    expect(linkCategoryInserts).toHaveLength(0);
  });
});
