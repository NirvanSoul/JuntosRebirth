import type {
  RemoteAccountMoneyAccount,
  RemoteAccountSnapshot,
} from '@/features/sync/gateways/juntossRemoteAccountGateway';
import { updateSpaces } from '@/features/spaces/repositories/localSpaceRepository';
import {
  fetchRemoteAccountChanges,
  fetchRemoteAccountSnapshot,
} from '@/features/sync/gateways/juntossRemoteAccountGateway';
import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import { claimLocalCacheOwnership } from '@/features/sync/repositories/localSyncAccountRepository';
import {
  clearRemoteChangesCursor,
  getRemoteChangesCursorGeneration,
  readRemoteChangesCursor,
  writeRemoteChangesCursor,
} from '@/features/sync/repositories/localSyncCursorRepository';
import {
  getLocalDatabase,
  migrateLocalDatabase,
} from '@/lib/storage/localDatabase';
import { createNodeSqliteDatabase } from '@/test/nodeSqliteDatabase';

import {
  applyRemoteChanges,
  restoreRemoteAccount,
  restoreRemoteAccountForCurrentSession,
} from './restoreRemoteAccount';

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));
jest.mock('@/lib/storage/localDatabase', () => ({
  ...jest.requireActual('@/lib/storage/localDatabase'),
  getLocalDatabase: jest.fn(),
}));
jest.mock('@/features/sync/gateways/juntossRemoteAccountGateway', () => ({
  fetchRemoteAccountChanges: jest.fn(),
  fetchRemoteAccountSnapshot: jest.fn(),
}));
jest.mock('@/features/legal/services/authenticatedUser', () => ({
  getAuthenticatedUserId: jest.fn(),
}));
jest.mock('@/features/import/gateways/juntossImportReviewGateway', () => ({
  fetchRemoteImportReviews: jest.fn(async () => []),
}));
jest.mock('@/features/spaces/repositories/localSpaceRepository', () => ({
  getSpacesCatalogueRevision: jest.fn(() => 0),
  loadSpaces: jest.fn(async () => ({ spaces: [], activeSpaceId: null })),
  saveSpaces: jest.fn(),
  updateSpaces: jest.fn(),
}));

const remoteAccountOfA: RemoteAccountMoneyAccount = {
  remoteId: 'cuenta-de-a',
  spaceRemoteId: 'personal-de-a',
  name: 'Cuenta de A',
  kind: 'cash',
  icon: 'wallet',
  colorToken: 'blue',
  currency: 'EUR',
  balances: [{ currency: 'EUR', openingBalanceMinor: 5000 }],
  isArchived: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const collectionsOfA: RemoteAccountSnapshot & { serverTime: string } = {
  activeFinancialContextId: null,
  serverTime: new Date().toISOString(),
  spaces: [
    {
      remoteId: 'personal-de-a',
      type: 'personal',
      name: 'Personal',
      currency: 'EUR',
      activatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  categories: [],
  moneyAccounts: [remoteAccountOfA],
  recurringSeries: [],
  transactions: [],
};

describe('una respuesta tardía de otra cuenta no entra en la caché', () => {
  let database: ReturnType<typeof createNodeSqliteDatabase>;

  beforeEach(async () => {
    jest.clearAllMocks();
    database = createNodeSqliteDatabase();
    await migrateLocalDatabase(database);
    (getLocalDatabase as jest.Mock).mockResolvedValue(database);
    // A cerró sesión con su snapshot en vuelo y B ya reclamó la caché nueva.
    await claimLocalCacheOwnership(database, 'user-b');
  });

  afterEach(() => database.close());

  const rowsWrittenForA = async () =>
    (await database.getFirstAsync<{ total: number }>(
      `SELECT (SELECT COUNT(*) FROM money_accounts)
            + (SELECT COUNT(*) FROM money_account_balances)
            + (SELECT COUNT(*) FROM remote_entity_links) AS total`,
    ))!.total;

  it('la restauración completa de A se rechaza sin escribir nada', async () => {
    await expect(
      restoreRemoteAccount({ userId: 'user-a', snapshot: collectionsOfA }),
    ).rejects.toMatchObject({ reason: 'owner_mismatch' });

    expect(await rowsWrittenForA()).toBe(0);
    expect(updateSpaces).not.toHaveBeenCalled();
  });

  it('la restauración incremental de A se rechaza sin escribir nada', async () => {
    await expect(
      applyRemoteChanges({
        userId: 'user-a',
        changes: { ...collectionsOfA, serverTime: collectionsOfA.serverTime },
        cursor: {
          version: 1,
          serverTime: collectionsOfA.serverTime,
          activeFinancialContextId: null,
          spaceRemoteIds: ['personal-de-a'],
        },
      }),
    ).rejects.toMatchObject({ reason: 'owner_mismatch' });

    expect(await rowsWrittenForA()).toBe(0);
    expect(updateSpaces).not.toHaveBeenCalled();
  });

  it('la restauración de la cuenta propietaria sí se aplica', async () => {
    await claimLocalCacheOwnership(database, 'user-a');
    (updateSpaces as jest.Mock).mockResolvedValue(undefined);

    await restoreRemoteAccount({ userId: 'user-a', snapshot: collectionsOfA });

    expect(await rowsWrittenForA()).toBeGreaterThan(0);
  });
});

describe('el cursor que una subida borró no se vuelve a escribir', () => {
  let database: ReturnType<typeof createNodeSqliteDatabase>;
  const cursor = {
    serverTime: collectionsOfA.serverTime,
    activeFinancialContextId: null,
    spaceRemoteIds: ['personal-de-a'],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    database = createNodeSqliteDatabase();
    await migrateLocalDatabase(database);
    (getLocalDatabase as jest.Mock).mockResolvedValue(database);
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue('user-a');
    (updateSpaces as jest.Mock).mockResolvedValue(undefined);
    await claimLocalCacheOwnership(database, 'user-a');
    await writeRemoteChangesCursor(database, 'user-a', cursor);
  });

  afterEach(() => database.close());

  it('un delta que esperaba la red no deshace el borrado', async () => {
    // El delta lee el cursor y espera la respuesta; entretanto una subida
    // recibe NEWER_VERSION y lo borra.
    (fetchRemoteAccountChanges as jest.Mock).mockImplementation(async () => {
      await clearRemoteChangesCursor(database, 'user-a');
      return { ...collectionsOfA, moneyAccounts: [] };
    });

    await restoreRemoteAccountForCurrentSession({ mode: 'delta' });

    // Sin cursor, la siguiente restauración es completa y trae la canónica.
    await expect(
      readRemoteChangesCursor(database, 'user-a'),
    ).resolves.toBeNull();
  });

  it('un snapshot que esperaba la red tampoco', async () => {
    (fetchRemoteAccountSnapshot as jest.Mock).mockImplementation(async () => {
      await clearRemoteChangesCursor(database, 'user-a');
      return collectionsOfA;
    });

    await restoreRemoteAccountForCurrentSession({ mode: 'full' });

    await expect(
      readRemoteChangesCursor(database, 'user-a'),
    ).resolves.toBeNull();
  });

  it('sin borrado intermedio el delta avanza el cursor', async () => {
    const generation = getRemoteChangesCursorGeneration('user-a');
    const later = new Date(Date.now() + 1000).toISOString();
    (fetchRemoteAccountChanges as jest.Mock).mockResolvedValue({
      ...collectionsOfA,
      moneyAccounts: [],
      serverTime: later,
    });

    await restoreRemoteAccountForCurrentSession({ mode: 'delta' });

    expect(getRemoteChangesCursorGeneration('user-a')).toBe(generation);
    await expect(
      readRemoteChangesCursor(database, 'user-a'),
    ).resolves.toMatchObject({ serverTime: later });
  });

  it('si la caché no es de esta cuenta no pide además el snapshot completo', async () => {
    await claimLocalCacheOwnership(database, 'user-b');
    (fetchRemoteAccountChanges as jest.Mock).mockResolvedValue({
      ...collectionsOfA,
      moneyAccounts: [],
    });

    await expect(
      restoreRemoteAccountForCurrentSession({ mode: 'delta' }),
    ).rejects.toMatchObject({ reason: 'owner_mismatch' });
    expect(fetchRemoteAccountSnapshot).not.toHaveBeenCalled();
  });
});
