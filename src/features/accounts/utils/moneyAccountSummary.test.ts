import type { MoneyAccount } from '@/features/accounts/types';
import { summarizeMoneyAccounts } from '@/features/accounts/utils/moneyAccountSummary';
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
      expenseMinor: 2500,
      incomeMinor: 40000,
    });
    expect(summary?.transactionCount).toBe(2);
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
});
