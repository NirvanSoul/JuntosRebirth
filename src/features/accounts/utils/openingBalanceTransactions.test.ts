import { createOpeningBalanceTransactions } from '@/features/accounts/utils/openingBalanceTransactions';
import type { Category } from '@/features/categories/types';

const categories: Category[] = [
  {
    id: 'salary',
    spaceId: 'personal',
    name: 'Salario',
    icon: 'money',
    colorToken: 'green',
    isDefault: true,
    templateKey: 'salary',
    isArchived: false,
  },
  {
    id: 'other',
    spaceId: 'personal',
    name: 'Otros',
    icon: 'dots-three-circle',
    colorToken: 'steel',
    isDefault: true,
    templateKey: 'other',
    isArchived: false,
  },
];

describe('createOpeningBalanceTransactions', () => {
  it('convierte los saldos positivos y negativos en ingresos y gastos', () => {
    expect(
      createOpeningBalanceTransactions({
        accountId: 'account-1',
        accountName: 'Nómina',
        balances: [
          { currency: 'EUR', openingBalanceMinor: 125000 },
          { currency: 'USD', openingBalanceMinor: -2500 },
        ],
        categories,
        occurredOn: '2026-08-26',
        spaceId: 'personal',
      }),
    ).toEqual([
      expect.objectContaining({
        categoryId: 'other',
        moneyAccountId: 'account-1',
        currency: 'EUR',
        amountMinor: 125000,
        type: 'income',
        title: 'Saldo inicial · Nómina',
      }),
      expect.objectContaining({
        categoryId: 'other',
        moneyAccountId: 'account-1',
        currency: 'USD',
        amountMinor: 2500,
        type: 'expense',
      }),
    ]);
  });

  it('no crea movimiento para un saldo cero', () => {
    expect(
      createOpeningBalanceTransactions({
        accountId: 'account-1',
        accountName: 'Nómina',
        balances: [{ currency: 'EUR', openingBalanceMinor: 0 }],
        categories,
        occurredOn: '2026-08-26',
        spaceId: 'personal',
      }),
    ).toEqual([]);
  });
});
