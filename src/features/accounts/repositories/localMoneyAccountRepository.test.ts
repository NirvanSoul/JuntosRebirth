import type { SQLiteDatabase } from 'expo-sqlite';

import {
  archiveLocalMoneyAccount,
  countLocalMoneyAccountUsages,
  createLocalMoneyAccount,
  listLocalMoneyAccounts,
  updateLocalMoneyAccount,
} from '@/features/accounts/repositories/localMoneyAccountRepository';

const mockGetLocalDatabase = jest.fn<Promise<SQLiteDatabase>, []>();

jest.mock('@/lib/storage/localDatabase', () => ({
  getLocalDatabase: () => mockGetLocalDatabase(),
}));

jest.mock('@/lib/storage/localIdentity', () => ({
  getOrCreateInstallationId: jest.fn(async () => 'installation-id'),
}));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

describe('localMoneyAccountRepository', () => {
  const runAsync = jest.fn(async (..._args: unknown[]) => ({
    changes: 1,
    lastInsertRowId: 0,
  }));
  const getAllAsync = jest.fn();
  const getFirstAsync = jest.fn();
  const database = {
    getAllAsync,
    getFirstAsync,
    runAsync,
    withExclusiveTransactionAsync: jest.fn(async (task) => task(database)),
  } as unknown as SQLiteDatabase;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLocalDatabase.mockResolvedValue(database);
  });

  it('crea una cuenta con su moneda y la restaura desde las dos tablas', async () => {
    const created = await createLocalMoneyAccount({
      spaceId: 'personal',
      name: '  Cuenta nómina  ',
      kind: 'bank',
      icon: 'bank',
      colorToken: 'blue',
      balances: [{ currency: 'EUR', openingBalanceMinor: 125000 }],
    });

    expect(created).toEqual({
      id: '00000000-0000-4000-8000-000000000001',
      spaceId: 'personal',
      name: 'Cuenta nómina',
      kind: 'bank',
      icon: 'bank',
      colorToken: 'blue',
      balances: [{ currency: 'EUR', openingBalanceMinor: 125000 }],
      isArchived: false,
    });
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO money_account_balances'),
      `${created.id}--EUR`,
      created.id,
      'EUR',
      125000,
      0,
      expect.any(String),
      expect.any(String),
    );

    getAllAsync.mockResolvedValueOnce([
      {
        id: created.id,
        space_id: 'personal',
        name: 'Cuenta nómina',
        kind: 'bank',
        icon: 'bank',
        color_token: 'blue',
        is_archived: 0,
      },
    ]);
    getAllAsync.mockResolvedValueOnce([
      {
        money_account_id: created.id,
        currency: 'EUR',
        opening_balance_minor: 125000,
      },
    ]);

    await expect(listLocalMoneyAccounts()).resolves.toEqual([created]);
  });

  // Un banco puede guardar varias divisas dentro de la misma cuenta.
  it('guarda una moneda por saldo y conserva su orden', async () => {
    const created = await createLocalMoneyAccount({
      spaceId: 'personal',
      name: 'Cuenta multidivisa',
      kind: 'bank',
      icon: 'bank',
      colorToken: 'blue',
      balances: [
        { currency: 'EUR', openingBalanceMinor: 100000 },
        { currency: 'USD', openingBalanceMinor: -2500 },
      ],
    });

    expect(created.balances).toHaveLength(2);
    const positions = runAsync.mock.calls
      .filter(([sql]) =>
        String(sql).includes('INSERT INTO money_account_balances'),
      )
      .map((call) => [call[3], call[5]]);
    expect(positions).toEqual([
      ['EUR', 0],
      ['USD', 1],
    ]);
  });

  it('rechaza una moneda que no está en el catálogo', async () => {
    await expect(
      createLocalMoneyAccount({
        spaceId: 'personal',
        name: 'Cuenta rara',
        kind: 'bank',
        icon: 'bank',
        colorToken: 'blue',
        balances: [{ currency: 'XXX' as 'EUR', openingBalanceMinor: 0 }],
      }),
    ).rejects.toThrow('La moneda de la cuenta no está reconocida');
    expect(runAsync).not.toHaveBeenCalled();
  });

  it('rechaza una cuenta sin ninguna moneda', async () => {
    await expect(
      createLocalMoneyAccount({
        spaceId: 'personal',
        name: 'Cuenta vacía',
        kind: 'cash',
        icon: 'money',
        colorToken: 'emerald',
        balances: [],
      }),
    ).rejects.toThrow('La cuenta necesita al menos una moneda');
  });

  it('rechaza la misma moneda repetida', async () => {
    await expect(
      createLocalMoneyAccount({
        spaceId: 'personal',
        name: 'Cuenta',
        kind: 'bank',
        icon: 'bank',
        colorToken: 'blue',
        balances: [
          { currency: 'EUR', openingBalanceMinor: 0 },
          { currency: 'EUR', openingBalanceMinor: 100 },
        ],
      }),
    ).rejects.toThrow('La cuenta no puede repetir una moneda');
  });

  it('rechaza un saldo inicial con decimales', async () => {
    await expect(
      createLocalMoneyAccount({
        spaceId: 'personal',
        name: 'Efectivo',
        kind: 'cash',
        icon: 'money',
        colorToken: 'emerald',
        balances: [{ currency: 'EUR', openingBalanceMinor: 10.5 }],
      }),
    ).rejects.toThrow('El saldo inicial debe expresarse en unidades menores');
  });

  it('reescribe las monedas al editar en vez de acumularlas', async () => {
    await updateLocalMoneyAccount({
      id: 'account-1',
      spaceId: 'personal',
      name: 'Efectivo',
      kind: 'cash',
      icon: 'money',
      colorToken: 'emerald',
      balances: [{ currency: 'EUR', openingBalanceMinor: 0 }],
      isArchived: false,
    });

    const statements = runAsync.mock.calls.map(([sql]) => String(sql));
    expect(statements[0]).toContain(
      "WHEN sync_status = 'local_only' THEN 'local_only'",
    );
    expect(statements[1]).toContain('DELETE FROM money_account_balances');
    expect(statements[2]).toContain('INSERT INTO money_account_balances');
  });

  it('avisa cuando la cuenta ya no está disponible al archivarla', async () => {
    runAsync.mockResolvedValueOnce({ changes: 0, lastInsertRowId: 0 });

    await expect(
      archiveLocalMoneyAccount('account-1', 'personal'),
    ).rejects.toThrow('La cuenta local ya no está disponible');
  });

  it('descarta una fila local con valores no reconocidos', async () => {
    getAllAsync.mockResolvedValueOnce([
      {
        id: 'account-1',
        space_id: 'personal',
        name: 'Cuenta',
        kind: 'crypto',
        icon: 'bank',
        color_token: 'blue',
        is_archived: 0,
      },
    ]);
    getAllAsync.mockResolvedValueOnce([
      {
        money_account_id: 'account-1',
        currency: 'EUR',
        opening_balance_minor: 0,
      },
    ]);

    await expect(listLocalMoneyAccounts()).rejects.toThrow(
      'La cuenta local contiene valores no reconocidos',
    );
  });

  it('suma movimientos y series al contar los usos de una cuenta', async () => {
    getFirstAsync.mockResolvedValueOnce({ total: 3 });

    await expect(countLocalMoneyAccountUsages('account-1')).resolves.toBe(3);
    expect(getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining('recurring_transaction_series'),
      'account-1',
      'account-1',
    );
  });
});
