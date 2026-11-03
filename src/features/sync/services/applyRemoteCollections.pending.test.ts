import type { SQLiteDatabase } from 'expo-sqlite';

import {
  createLocalMoneyAccount,
  listLocalMoneyAccounts,
  updateLocalMoneyAccount,
} from '@/features/accounts/repositories/localMoneyAccountRepository';
import { saveLocalCategoryBudget } from '@/features/categories/repositories/localCategoryBudgetRepository';
import {
  createLocalCategory,
  listLocalCategories,
} from '@/features/categories/repositories/localCategoryRepository';
import type {
  RemoteAccountCategory,
  RemoteAccountMoneyAccount,
} from '@/features/sync/gateways/juntossRemoteAccountGateway';
import {
  getLocalDatabase,
  migrateLocalDatabase,
} from '@/lib/storage/localDatabase';
import { createNodeSqliteDatabase } from '@/test/nodeSqliteDatabase';

import { applyRemoteCollections } from './applyRemoteCollections';

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));
jest.mock('@/lib/storage/localDatabase', () => {
  const actual = jest.requireActual('@/lib/storage/localDatabase');
  return { ...actual, getLocalDatabase: jest.fn() };
});

const userId = 'user-ficticio-a';
const accountId = 'account-ficticia-1';
const spaceRemoteId = 'space-remoto-1';

function remoteAccount(
  balances: RemoteAccountMoneyAccount['balances'],
  updatedAt = '2026-01-01T00:00:00.000Z',
): RemoteAccountMoneyAccount {
  return {
    remoteId: accountId,
    spaceRemoteId,
    name: 'Cuenta remota',
    kind: 'cash',
    icon: 'wallet',
    colorToken: 'blue',
    currency: balances[0]!.currency,
    balances,
    isArchived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt,
  };
}

async function applySnapshot(
  database: SQLiteDatabase,
  account: RemoteAccountMoneyAccount | null,
  linkMode: 'full' | 'delta',
  category?: RemoteAccountCategory,
) {
  await database.withExclusiveTransactionAsync(async (transaction) => {
    await applyRemoteCollections(transaction, {
      userId,
      collections: {
        categories: category ? [category] : [],
        moneyAccounts: account ? [account] : [],
        recurringSeries: [],
        transactions: [],
      },
      localSpaceIdByRemoteId: new Map([[spaceRemoteId, 'personal']]),
      linkMode,
    });
  });
}

async function storedBalances() {
  const [account] = await listLocalMoneyAccounts();
  return account?.balances;
}

describe('applyRemoteCollections con saldos pendientes', () => {
  let database: SQLiteDatabase & { close: () => void };

  beforeEach(async () => {
    database = createNodeSqliteDatabase();
    await migrateLocalDatabase(database);
    (getLocalDatabase as jest.Mock).mockResolvedValue(database);
    await createLocalMoneyAccount({
      id: accountId,
      spaceId: 'personal',
      name: 'Efectivo',
      kind: 'cash',
      icon: 'wallet',
      colorToken: 'blue',
      balances: [
        { currency: 'EUR', openingBalanceMinor: 200 },
        { currency: 'USD', openingBalanceMinor: 50 },
      ],
    });
    // La cuenta ya se publicó: el snapshot puede reemplazarla.
    await database.runAsync(
      `UPDATE money_accounts SET sync_status = 'synced' WHERE id = ?`,
      accountId,
    );
  });

  afterEach(() => database.close());

  it.each(['full', 'delta'] as const)(
    'conserva en restauración %s todas las monedas editadas sin subir',
    async (linkMode) => {
      const [account] = await listLocalMoneyAccounts();
      await updateLocalMoneyAccount({
        ...account!,
        balances: [
          { currency: 'EUR', openingBalanceMinor: 900 },
          { currency: 'USD', openingBalanceMinor: 75 },
        ],
      });

      await applySnapshot(
        database,
        remoteAccount([{ currency: 'EUR', openingBalanceMinor: 100 }]),
        linkMode,
      );

      expect(await storedBalances()).toEqual([
        { currency: 'EUR', openingBalanceMinor: 900 },
        { currency: 'USD', openingBalanceMinor: 75 },
      ]);
      const parent = await database.getFirstAsync<{ sync_status: string }>(
        'SELECT sync_status FROM money_accounts WHERE id = ?',
        accountId,
      );
      // Sigue pendiente: la próxima subida publicará los saldos locales.
      expect(parent?.sync_status).toBe('pending');
    },
  );

  it('acepta el saldo remoto cuando no hay cambios locales', async () => {
    await applySnapshot(
      database,
      remoteAccount([{ currency: 'EUR', openingBalanceMinor: 100 }]),
      'full',
    );

    expect(await storedBalances()).toEqual([
      { currency: 'EUR', openingBalanceMinor: 100 },
    ]);
  });

  it('revierte la cuenta y sus saldos si la transacción falla', async () => {
    const failing = remoteAccount([
      { currency: 'EUR', openingBalanceMinor: 100 },
      // Moneda duplicada: viola la clave única y aborta la transacción.
      { currency: 'EUR', openingBalanceMinor: 300 },
    ]);

    await expect(applySnapshot(database, failing, 'full')).rejects.toThrow();

    expect(await storedBalances()).toEqual([
      { currency: 'EUR', openingBalanceMinor: 200 },
      { currency: 'USD', openingBalanceMinor: 50 },
    ]);
    const [account] = await listLocalMoneyAccounts();
    expect(account?.name).toBe('Efectivo');
  });
});

describe('applyRemoteCollections con presupuestos pendientes', () => {
  let database: SQLiteDatabase & { close: () => void };

  beforeEach(async () => {
    database = createNodeSqliteDatabase();
    await migrateLocalDatabase(database);
    (getLocalDatabase as jest.Mock).mockResolvedValue(database);
  });

  afterEach(() => database.close());

  async function createSyncedCategory() {
    const category = await createLocalCategory({
      spaceId: 'personal',
      name: 'Comida',
      icon: 'fork-knife',
      colorToken: 'violet',
      isDefault: false,
    });
    await database.runAsync(
      `UPDATE categories SET sync_status = 'synced' WHERE id = ?`,
      category.id,
    );
    return category;
  }

  function remoteCategory(id: string, budgetMinor: number) {
    return {
      remoteId: id,
      spaceRemoteId,
      name: 'Comida remota',
      icon: 'fork-knife',
      colorToken: 'violet',
      isDefault: false,
      templateKey: null,
      isArchived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      budgets: [
        { currency: 'EUR' as const, budgetMinor, overrides: [], history: [] },
      ],
    };
  }

  it.each(['full', 'delta'] as const)(
    'conserva en restauración %s un presupuesto editado sin subir',
    async (linkMode) => {
      const category = await createSyncedCategory();
      await saveLocalCategoryBudget(
        { ...category, budgets: { EUR: { budgetMinor: 5000 } } },
        'EUR',
      );

      await applySnapshot(
        database,
        null,
        linkMode,
        remoteCategory(category.id, 1000),
      );

      const [stored] = await listLocalCategories();
      expect(stored?.budgets?.EUR?.budgetMinor).toBe(5000);
      expect(stored?.name).toBe('Comida');
    },
  );

  it('acepta el presupuesto remoto cuando no hay cambios locales', async () => {
    const category = await createSyncedCategory();

    await applySnapshot(
      database,
      null,
      'full',
      remoteCategory(category.id, 1000),
    );

    const [stored] = await listLocalCategories();
    expect(stored?.budgets?.EUR?.budgetMinor).toBe(1000);
  });
});
