import type { MoneyAccount } from '@/features/accounts/types';
import {
  summarizeMoneyAccounts,
  summarizeMoneyAccountTotals,
} from '@/features/accounts/utils/moneyAccountSummary';
import type { SessionTransaction } from '@/features/transactions/types';

const referenceDate = new Date(2026, 4, 15, 12);

const account: MoneyAccount = {
  id: 'account-1',
  spaceId: 'personal',
  name: 'Cuenta nómina',
  kind: 'bank',
  icon: 'bank',
  colorToken: 'blue',
  balances: [{ currency: 'EUR', openingBalanceMinor: 100000 }],
  isArchived: false,
};

function createTransaction(
  overrides: Partial<SessionTransaction> = {},
): SessionTransaction {
  return {
    id: 'transaction-1',
    spaceId: 'personal',
    type: 'expense',
    amountMinor: 1000,
    currency: 'EUR',
    title: 'Compra',
    categoryId: 'category-1',
    moneyAccountId: 'account-1',
    occurredOn: '2026-05-10',
    recurrence: 'once',
    createdBy: 'installation-id',
    updatedAt: '2026-05-10T10:00:00.000Z',
    ...overrides,
  };
}

describe('summarizeMoneyAccounts', () => {
  it('parte del saldo inicial y aplica ingresos y gastos asignados', () => {
    const [summary] = summarizeMoneyAccounts(
      [account],
      [
        createTransaction({ id: 'a', amountMinor: 2500 }),
        createTransaction({ id: 'b', type: 'income', amountMinor: 40000 }),
      ],
      referenceDate,
    );

    expect(summary?.balanceByCurrency[0]).toMatchObject({
      currency: 'EUR',
      balanceMinor: 100000 - 2500 + 40000,
      previousMonthBalanceMinor: 100000,
      expenseMinor: 2500,
      incomeMinor: 40000,
    });
    expect(summary?.transactionCount).toBe(2);
    expect(summary?.balanceByCurrency[0]?.hasPreviousMonthTransaction).toBe(
      false,
    );
  });

  it('ignora los movimientos sin cuenta y los de otra cuenta', () => {
    const [summary] = summarizeMoneyAccounts(
      [account],
      [
        createTransaction({ id: 'a', moneyAccountId: undefined }),
        createTransaction({ id: 'b', moneyAccountId: 'account-2' }),
      ],
      referenceDate,
    );

    expect(summary?.balanceByCurrency[0]?.balanceMinor).toBe(100000);
    expect(summary?.transactionCount).toBe(0);
  });

  it('no mezcla divisas en un mismo saldo', () => {
    const [summary] = summarizeMoneyAccounts(
      [account],
      [createTransaction({ amountMinor: 5000, currency: 'VES' })],
      referenceDate,
    );

    // La divisa ajena no entra en el saldo de una cuenta que no la guarda.
    expect(summary?.balanceByCurrency[0]?.balanceMinor).toBe(100000);
    expect(summary?.balanceByCurrency).toHaveLength(1);
  });

  it('incluye una fecha futura de este mes y excluye la del mes siguiente', () => {
    const [summary] = summarizeMoneyAccounts(
      [account],
      [
        createTransaction({ id: 'a', occurredOn: '2026-05-31' }),
        createTransaction({ id: 'b', occurredOn: '2026-06-01' }),
      ],
      referenceDate,
    );

    expect(summary?.balanceByCurrency[0]?.balanceMinor).toBe(100000 - 1000);
    expect(summary?.transactionCount).toBe(1);
  });

  it('deja el saldo en negativo cuando el gasto supera lo disponible', () => {
    const [summary] = summarizeMoneyAccounts(
      [
        {
          ...account,
          kind: 'card',
          balances: [{ currency: 'EUR', openingBalanceMinor: 0 }],
        },
      ],
      [createTransaction({ amountMinor: 30000 })],
      referenceDate,
    );

    expect(summary?.balanceByCurrency[0]?.balanceMinor).toBe(-30000);
  });

  it('lleva un saldo independiente por cada moneda de la cuenta', () => {
    const multiCurrency = {
      ...account,
      balances: [
        { currency: 'EUR' as const, openingBalanceMinor: 100000 },
        { currency: 'USD' as const, openingBalanceMinor: 50000 },
      ],
    };

    const [summary] = summarizeMoneyAccounts(
      [multiCurrency],
      [
        createTransaction({ id: 'a', amountMinor: 2500 }),
        createTransaction({ id: 'b', amountMinor: 1000, currency: 'USD' }),
      ],
      referenceDate,
    );

    // Cada divisa se calcula por separado: sumarlas no significaría nada.
    expect(summary?.balanceByCurrency).toEqual([
      expect.objectContaining({ currency: 'EUR', balanceMinor: 97500 }),
      expect.objectContaining({ currency: 'USD', balanceMinor: 49000 }),
    ]);
    expect(summary?.transactionCount).toBe(2);
  });

  it('conserva el saldo de cierre del mes anterior para cada divisa', () => {
    const [summary] = summarizeMoneyAccounts(
      [account],
      [
        createTransaction({
          id: 'april-income',
          type: 'income',
          amountMinor: 10000,
          occurredOn: '2026-04-20',
        }),
        createTransaction({
          id: 'may-expense',
          amountMinor: 2500,
          occurredOn: '2026-05-10',
        }),
      ],
      referenceDate,
    );

    expect(summary?.balanceByCurrency[0]).toMatchObject({
      previousMonthBalanceMinor: 110000,
      balanceMinor: 107500,
      hasPreviousMonthTransaction: true,
    });
  });
});

describe('summarizeMoneyAccountTotals', () => {
  const cash: MoneyAccount = {
    ...account,
    id: 'account-2',
    name: 'Efectivo',
    kind: 'cash',
    icon: 'money',
    colorToken: 'emerald',
  };

  it('reparte ingresos y gastos por cuenta sin mezclar divisas', () => {
    const totals = summarizeMoneyAccountTotals(
      [account, cash],
      [
        createTransaction({ id: 'a', amountMinor: 2500 }),
        createTransaction({ id: 'b', type: 'income', amountMinor: 40000 }),
        createTransaction({
          id: 'c',
          amountMinor: 900000,
          currency: 'VES',
        }),
        createTransaction({
          id: 'd',
          amountMinor: 1500,
          moneyAccountId: 'account-2',
        }),
      ],
      'EUR',
    );

    expect(totals).toEqual([
      {
        id: 'account-1',
        name: 'Cuenta nómina',
        colorToken: 'blue',
        incomeMinor: 40000,
        expenseMinor: 2500,
      },
      {
        id: 'account-2',
        name: 'Efectivo',
        colorToken: 'emerald',
        incomeMinor: 0,
        expenseMinor: 1500,
      },
    ]);
  });

  it('no reparte los movimientos sin cuenta ni los de una cuenta ajena', () => {
    const totals = summarizeMoneyAccountTotals(
      [account],
      [
        createTransaction({ id: 'a', moneyAccountId: undefined }),
        createTransaction({ id: 'b', moneyAccountId: 'account-borrada' }),
      ],
      'EUR',
    );

    expect(totals).toEqual([
      {
        id: 'account-1',
        name: 'Cuenta nómina',
        colorToken: 'blue',
        incomeMinor: 0,
        expenseMinor: 0,
      },
    ]);
  });
});
