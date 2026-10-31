import type { MoneyAccount } from '@/features/accounts/types';
import {
  listMoneyAccountsBySpace,
  validateMoneyAccountName,
  withCurrencyBalance,
} from '@/features/accounts/utils/moneyAccountCatalog';

function createAccount(overrides: Partial<MoneyAccount> = {}): MoneyAccount {
  return {
    id: 'account-1',
    spaceId: 'personal',
    name: 'Efectivo',
    kind: 'cash',
    icon: 'money',
    colorToken: 'forest',
    balances: [{ currency: 'EUR', openingBalanceMinor: 0 }],
    isArchived: false,
    ...overrides,
  };
}

describe('listMoneyAccountsBySpace', () => {
  it('deja fuera las cuentas archivadas y las de otro espacio', () => {
    const accounts = [
      createAccount(),
      createAccount({ id: 'account-2', isArchived: true }),
      createAccount({ id: 'account-3', spaceId: 'pareja' }),
    ];

    expect(listMoneyAccountsBySpace(accounts, 'personal')).toEqual([
      accounts[0],
    ]);
  });
});

describe('validateMoneyAccountName', () => {
  it('rechaza un nombre vacío', () => {
    expect(validateMoneyAccountName('   ', [], 'personal')).toEqual({
      valid: false,
      error: 'Escribe un nombre para la cuenta.',
    });
  });

  it('rechaza un nombre demasiado largo', () => {
    const result = validateMoneyAccountName('a'.repeat(41), [], 'personal');

    expect(result).toMatchObject({ valid: false });
  });

  it('detecta un duplicado ignorando mayúsculas y acentos', () => {
    const accounts = [createAccount({ name: 'Cuenta nómina' })];

    expect(
      validateMoneyAccountName('  cuenta   NOMINA ', accounts, 'personal'),
    ).toEqual({
      valid: false,
      error: 'Ya existe una cuenta con ese nombre en este espacio.',
    });
  });

  it('permite el mismo nombre en otro espacio', () => {
    const accounts = [createAccount({ name: 'Efectivo' })];

    expect(validateMoneyAccountName('Efectivo', accounts, 'pareja')).toEqual({
      valid: true,
      name: 'Efectivo',
    });
  });

  it('permite conservar su propio nombre al editar', () => {
    const accounts = [createAccount({ name: 'Efectivo' })];

    expect(
      validateMoneyAccountName('Efectivo', accounts, 'personal', 'account-1'),
    ).toEqual({ valid: true, name: 'Efectivo' });
  });

  it('normaliza los espacios repetidos del nombre válido', () => {
    expect(
      validateMoneyAccountName('  Caja   fuerte ', [], 'personal'),
    ).toEqual({ valid: true, name: 'Caja fuerte' });
  });
});

describe('withCurrencyBalance', () => {
  const eur = [{ currency: 'EUR' as const, openingBalanceMinor: 1000 }];

  it('añade la moneda pedida con saldo inicial cero si falta', () => {
    expect(withCurrencyBalance(eur, 'USD')).toEqual([
      ...eur,
      { currency: 'USD', openingBalanceMinor: 0 },
    ]);
  });

  it('respeta los saldos cuando la moneda ya está o no se pide ninguna', () => {
    expect(withCurrencyBalance(eur, 'EUR')).toBe(eur);
    expect(withCurrencyBalance(eur, undefined)).toBe(eur);
  });
});
