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
  currency: 'EUR',
  openingBalanceMinor: 100000,
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

    expect(summary).toMatchObject({
      balanceMinor: 100000 - 2500 + 40000,
      expenseMinor: 2500,
      incomeMinor: 40000,
      transactionCount: 2,
    });
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

    expect(summary).toMatchObject({
      balanceMinor: 100000,
      transactionCount: 0,
    });
  });

  it('no mezcla divisas en un mismo saldo', () => {
    const [summary] = summarizeMoneyAccounts(
      [account],
      [createTransaction({ amountMinor: 5000, currency: 'VES' })],
      referenceDate,
    );

    expect(summary).toMatchObject({ balanceMinor: 100000 });
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

    expect(summary).toMatchObject({
      balanceMinor: 100000 - 1000,
      transactionCount: 1,
    });
  });

  it('deja el saldo en negativo cuando el gasto supera lo disponible', () => {
    const [summary] = summarizeMoneyAccounts(
      [{ ...account, openingBalanceMinor: 0, kind: 'credit' }],
      [createTransaction({ amountMinor: 30000 })],
      referenceDate,
    );

    expect(summary?.balanceMinor).toBe(-30000);
  });
});
