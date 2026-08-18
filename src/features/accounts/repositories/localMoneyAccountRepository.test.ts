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
  const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
  const getAllAsync = jest.fn();
  const getFirstAsync = jest.fn();
  const database = {
    getAllAsync,
    getFirstAsync,
    runAsync,
  } as unknown as SQLiteDatabase;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLocalDatabase.mockResolvedValue(database);
  });

  it('crea una cuenta con UUID y conserva su identidad al recargarla', async () => {
    const created = await createLocalMoneyAccount({
      spaceId: 'personal',
      name: '  Cuenta nómina  ',
      kind: 'bank',
      icon: 'bank',
      colorToken: 'blue',
      currency: 'EUR',
      openingBalanceMinor: 125000,
    });

    expect(created).toEqual({
      id: '00000000-0000-4000-8000-000000000001',
      spaceId: 'personal',
      name: 'Cuenta nómina',
      kind: 'bank',
      icon: 'bank',
      colorToken: 'blue',
      currency: 'EUR',
      openingBalanceMinor: 125000,
      isArchived: false,
    });
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO money_accounts'),
      '00000000-0000-4000-8000-000000000001',
      'personal',
      'Cuenta nómina',
      'bank',
      'bank',
      'blue',
      'EUR',
      125000,
      'installation-id',
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
        currency: 'EUR',
        opening_balance_minor: 125000,
        is_archived: 0,
      },
    ]);

    await expect(listLocalMoneyAccounts()).resolves.toEqual([created]);
  });

  it('admite un saldo inicial negativo para una tarjeta de crédito', async () => {
    const created = await createLocalMoneyAccount({
      spaceId: 'personal',
      name: 'Visa',
      kind: 'card',
      icon: 'credit-card',
      colorToken: 'violet',
      currency: 'EUR',
      openingBalanceMinor: -45000,
    });

    expect(created.openingBalanceMinor).toBe(-45000);
  });

  it('rechaza una moneda que no está en el catálogo', async () => {
    await expect(
      createLocalMoneyAccount({
        spaceId: 'personal',
        name: 'Cuenta rara',
        kind: 'bank',
        icon: 'bank',
        colorToken: 'blue',
        currency: 'XXX' as 'EUR',
        openingBalanceMinor: 0,
      }),
    ).rejects.toThrow('La moneda de la cuenta no está reconocida');
    expect(runAsync).not.toHaveBeenCalled();
  });

  it('rechaza un saldo inicial con decimales', async () => {
    await expect(
      createLocalMoneyAccount({
        spaceId: 'personal',
        name: 'Efectivo',
        kind: 'cash',
        icon: 'money',
        colorToken: 'emerald',
        currency: 'EUR',
        openingBalanceMinor: 10.5,
      }),
    ).rejects.toThrow('El saldo inicial debe expresarse en unidades menores');
  });

  it('no degrada a pendiente una cuenta que nunca salió del dispositivo', async () => {
    await updateLocalMoneyAccount({
      id: 'account-1',
      spaceId: 'personal',
      name: 'Efectivo',
      kind: 'cash',
      icon: 'money',
      colorToken: 'emerald',
      currency: 'EUR',
      openingBalanceMinor: 0,
      isArchived: false,
    });

    const [sql] = runAsync.mock.calls[0] as unknown as [string];
    expect(sql).toContain("WHEN sync_status = 'local_only' THEN 'local_only'");
    expect(sql).toContain("ELSE 'pending'");
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
        currency: 'EUR',
        opening_balance_minor: 0,
        is_archived: 0,
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
