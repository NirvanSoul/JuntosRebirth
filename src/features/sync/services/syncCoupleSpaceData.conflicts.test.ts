import type { SQLiteBindValue } from 'expo-sqlite';
import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import { syncCoupleSpaceRemotely } from '@/features/sync/gateways/juntossCoupleSpaceSyncGateway';
import { claimLocalCacheOwnership } from '@/features/sync/repositories/localSyncAccountRepository';
import {
  getRemoteChangesCursorGeneration,
  readRemoteChangesCursor,
  writeCursorUnlessCleared,
  writeRemoteChangesCursor,
} from '@/features/sync/repositories/localSyncCursorRepository';
import {
  getLocalDatabase,
  migrateLocalDatabase,
} from '@/lib/storage/localDatabase';
import { createNodeSqliteDatabase } from '@/test/nodeSqliteDatabase';

import { syncSpaceDataForCurrentSession } from './syncCoupleSpaceData';

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));
jest.mock('@/lib/storage/localDatabase', () => ({
  ...jest.requireActual('@/lib/storage/localDatabase'),
  getLocalDatabase: jest.fn(),
}));
jest.mock('@/features/spaces/repositories/localSpaceRepository', () => ({
  loadSpaces: jest.fn(async () => ({ spaces: [], activeSpaceId: 'personal' })),
}));
jest.mock('@/features/legal/services/authenticatedUser', () => ({
  getAuthenticatedUserId: jest.fn(),
}));
jest.mock('@/features/sync/gateways/juntossCoupleSpaceSyncGateway', () => ({
  syncCoupleSpaceRemotely: jest.fn(),
}));

const userId = 'user-a';

async function insertTransaction(
  database: ReturnType<typeof createNodeSqliteDatabase>,
  id: string,
) {
  await database.runAsync(
    `INSERT INTO transactions (
       id, space_id, category_id, created_by, type, amount_minor, currency,
       title, occurred_on, recurrence, sync_status, is_archived, created_at,
       updated_at
     ) VALUES (?, 'personal', 'cat-1', ?, 'expense', 1200, 'EUR', 'Pan',
               '2026-01-02', 'once', 'pending', 0, '2026-01-02T00:00:00.000Z',
               '2026-01-02T00:00:00.000Z')`,
    id,
    userId,
  );
}

const statusOf = async (
  database: ReturnType<typeof createNodeSqliteDatabase>,
  id: string,
) =>
  (await database.getFirstAsync<{
    sync_status: string;
    accounting_amount_minor_usd: number | null;
  }>(
    'SELECT sync_status, accounting_amount_minor_usd FROM transactions WHERE id = ?',
    id,
  ))!;

describe('resultado real de la subida con conflictos', () => {
  let database: ReturnType<typeof createNodeSqliteDatabase>;

  beforeEach(async () => {
    jest.clearAllMocks();
    database = createNodeSqliteDatabase();
    await migrateLocalDatabase(database);
    (getLocalDatabase as jest.Mock).mockResolvedValue(database);
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue(userId);
    await claimLocalCacheOwnership(database, userId);
    await database.runAsync(
      `INSERT INTO categories (
         id, space_id, name, icon, color_token, is_default, created_by,
         sync_status, is_archived, created_at, updated_at
       ) VALUES ('cat-1', 'personal', 'Casa', 'house', 'violet', 0, ?,
                 'synced', 0, '2026-01-01', '2026-01-01')`,
      userId,
    );
    await insertTransaction(database, 'tx-aceptado');
    await insertTransaction(database, 'tx-descartado');
    await writeRemoteChangesCursor(database, userId, {
      serverTime: '2026-01-03T00:00:00.000Z',
      activeFinancialContextId: null,
      spaceRemoteIds: [],
    });
  });

  afterEach(() => database.close());

  const echoedTransactions = [
    {
      localId: 'tx-aceptado',
      remoteId: 'r1',
      applied: true,
      updatedAt: '2026-01-02T00:00:00.000Z',
      accountingAmountMinorUsd: 1300,
      exchangeSnapshot: null,
    },
    {
      localId: 'tx-descartado',
      remoteId: 'r2',
      applied: false,
      // Valores canónicos del servidor, nunca los enviados.
      updatedAt: '2026-01-05T00:00:00.000Z',
      accountingAmountMinorUsd: 9999,
      exchangeSnapshot: null,
    },
  ];

  const newerVersion = [
    {
      collection: 'transactions',
      localId: 'tx-descartado',
      remoteId: 'r2',
      reason: 'NEWER_VERSION',
      serverUpdatedAt: '2026-01-05T00:00:00.000Z',
    },
  ];

  it('no guarda valores de una versión descartada y fuerza un snapshot completo', async () => {
    (syncCoupleSpaceRemotely as jest.Mock).mockResolvedValue({
      categoryCount: 0,
      moneyAccountCount: 0,
      recurringSeriesCount: 0,
      transactionCount: 2,
      transactions: echoedTransactions,
      conflicts: newerVersion,
    });

    await syncSpaceDataForCurrentSession({ spaceId: 'personal' });

    expect(await statusOf(database, 'tx-aceptado')).toEqual({
      sync_status: 'synced',
      accounting_amount_minor_usd: 1300,
    });
    // Se marca sincronizada para que el estado canónico la sustituya, sin
    // adoptar los valores que el servidor descartó.
    expect(await statusOf(database, 'tx-descartado')).toEqual({
      sync_status: 'synced',
      accounting_amount_minor_usd: null,
    });
    // La versión canónica puede ser anterior al cursor: sin cursor, la
    // próxima restauración es completa.
    await expect(readRemoteChangesCursor(database, userId)).resolves.toBeNull();
  });

  it('una restauración que empieza antes del marcado no recupera el cursor', async () => {
    (syncCoupleSpaceRemotely as jest.Mock).mockResolvedValue({
      categoryCount: 0,
      moneyAccountCount: 0,
      recurringSeriesCount: 0,
      transactionCount: 2,
      transactions: echoedTransactions,
      conflicts: newerVersion,
    });
    // Entre el borrado y el marcado la subida actualiza importes contables:
    // ahí arranca la restauración y anota la generación del cursor.
    let generationSeenByRestore: number | null = null;
    const runAsync = database.runAsync.bind(database);
    jest
      .spyOn(database, 'runAsync')
      .mockImplementation(async (sql: string, ...params: SQLiteBindValue[]) => {
        if (
          generationSeenByRestore === null &&
          sql.includes('accounting_amount')
        ) {
          generationSeenByRestore = getRemoteChangesCursorGeneration(userId);
        }
        return runAsync(sql, ...params);
      });

    await syncSpaceDataForCurrentSession({ spaceId: 'personal' });

    // La restauración se saltó la canónica porque la fila seguía pendiente:
    // su cursor no debe escribirse.
    await expect(
      writeCursorUnlessCleared(database, userId, generationSeenByRestore!, {
        serverTime: '2026-01-06T00:00:00.000Z',
        activeFinancialContextId: null,
        spaceRemoteIds: [],
      }),
    ).resolves.toBe(false);
    await expect(readRemoteChangesCursor(database, userId)).resolves.toBeNull();
  });

  it('no marca como sincronizado un cambio hecho mientras la subida estaba en vuelo', async () => {
    (syncCoupleSpaceRemotely as jest.Mock).mockImplementation(async () => {
      await database.runAsync(
        `UPDATE transactions SET amount_minor = 5000,
           updated_at = '2026-01-04T00:00:00.000Z' WHERE id = 'tx-descartado'`,
      );
      return {
        categoryCount: 0,
        moneyAccountCount: 0,
        recurringSeriesCount: 0,
        transactionCount: 2,
        transactions: echoedTransactions,
        conflicts: newerVersion,
      };
    });

    await syncSpaceDataForCurrentSession({ spaceId: 'personal' });

    expect((await statusOf(database, 'tx-descartado')).sync_status).toBe(
      'pending',
    );
  });

  it('no presenta como subida una versión que pertenece a otro espacio', async () => {
    (syncCoupleSpaceRemotely as jest.Mock).mockResolvedValue({
      categoryCount: 0,
      moneyAccountCount: 0,
      recurringSeriesCount: 0,
      transactionCount: 2,
      transactions: [
        echoedTransactions[0],
        {
          localId: 'tx-descartado',
          remoteId: 'r2',
          applied: false,
          updatedAt: null,
          accountingAmountMinorUsd: null,
          exchangeSnapshot: null,
        },
      ],
      conflicts: [
        {
          collection: 'transactions',
          localId: 'tx-descartado',
          remoteId: 'r2',
          reason: 'NOT_IN_SPACE',
          serverUpdatedAt: null,
        },
      ],
    });

    await syncSpaceDataForCurrentSession({ spaceId: 'personal' });

    expect((await statusOf(database, 'tx-aceptado')).sync_status).toBe(
      'synced',
    );
    expect(await statusOf(database, 'tx-descartado')).toEqual({
      sync_status: 'pending',
      accounting_amount_minor_usd: null,
    });
    // No hay versión canónica que recuperar: el delta sigue siendo válido.
    await expect(
      readRemoteChangesCursor(database, userId),
    ).resolves.not.toBeNull();
  });

  it('con una API que no informa de conflictos conserva el comportamiento anterior', async () => {
    (syncCoupleSpaceRemotely as jest.Mock).mockResolvedValue({
      categoryCount: 0,
      moneyAccountCount: 0,
      recurringSeriesCount: 0,
      transactionCount: 2,
      transactions: echoedTransactions.map(
        ({ applied: _applied, ...legacy }) => ({
          ...legacy,
          updatedAt: '2026-01-02T00:00:00.000Z',
        }),
      ),
    });

    await syncSpaceDataForCurrentSession({ spaceId: 'personal' });

    expect(await statusOf(database, 'tx-descartado')).toEqual({
      sync_status: 'synced',
      accounting_amount_minor_usd: 9999,
    });
    await expect(
      readRemoteChangesCursor(database, userId),
    ).resolves.not.toBeNull();
  });
});
