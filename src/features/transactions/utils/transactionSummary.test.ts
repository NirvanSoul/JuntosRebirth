import type { SessionTransaction } from '@/features/transactions/types';
import {
  sortTransactionsByRecentActivity,
  summarizeTransactions,
  summarizeTransactionTotals,
} from '@/features/transactions/utils/transactionSummary';

const transactions: SessionTransaction[] = [
  {
    id: 'income-current-month',
    spaceId: 'personal',
    type: 'income',
    amountMinor: 200_000,
    currency: 'EUR',
    title: 'Nómina',
    categoryId: 'salary',
    occurredOn: '2026-07-01',
    recurrence: 'once',
    updatedAt: '2026-07-01T12:00:00.000Z',
  },
  {
    id: 'expense-current-month',
    spaceId: 'personal',
    type: 'expense',
    amountMinor: 35_000,
    currency: 'EUR',
    title: 'Alquiler',
    categoryId: 'housing',
    occurredOn: '2026-07-15',
    recurrence: 'once',
    updatedAt: '2026-07-15T12:00:00.000Z',
  },
  {
    id: 'expense-previous-month',
    spaceId: 'personal',
    type: 'expense',
    amountMinor: 5_000,
    currency: 'EUR',
    title: 'Compra anterior',
    categoryId: 'shopping',
    occurredOn: '2026-06-30',
    recurrence: 'once',
    updatedAt: '2026-06-30T12:00:00.000Z',
  },
];

const futureTransactions: SessionTransaction[] = [
  ...transactions,
  {
    id: 'future-income',
    spaceId: 'personal',
    type: 'income',
    amountMinor: 50_000,
    currency: 'EUR',
    title: 'Ingreso programado',
    categoryId: 'salary',
    occurredOn: '2026-11-01',
    recurrence: 'once',
    updatedAt: '2026-11-01T12:00:00.000Z',
  },
  {
    id: 'future-expense',
    spaceId: 'personal',
    type: 'expense',
    amountMinor: 10_000,
    currency: 'EUR',
    title: 'Gasto programado',
    categoryId: 'housing',
    occurredOn: '2026-11-01',
    recurrence: 'once',
    updatedAt: '2026-11-01T12:00:00.000Z',
  },
];

describe('summarizeTransactions', () => {
  it('calcula el balance total y limita ingresos y gastos al mes indicado', () => {
    expect(
      summarizeTransactions(transactions, new Date('2026-07-31T12:00:00')),
    ).toEqual({
      balanceMinor: 160_000,
      monthIncomeMinor: 200_000,
      monthExpenseMinor: 35_000,
    });
  });

  it('devuelve importes a cero cuando no hay movimientos', () => {
    expect(summarizeTransactions([], new Date('2026-07-31T12:00:00'))).toEqual({
      balanceMinor: 0,
      monthIncomeMinor: 0,
      monthExpenseMinor: 0,
    });
  });

  it('incluye todo el mes actual aunque el día aún no haya llegado', () => {
    const plannedCurrentMonth: SessionTransaction[] = [
      {
        ...transactions[0]!,
        id: 'planned-current-income',
        amountMinor: 50_000,
        occurredOn: '2026-07-31',
      },
      {
        ...transactions[1]!,
        id: 'planned-current-expense',
        amountMinor: 10_000,
        occurredOn: '2026-07-31',
      },
    ];

    expect(
      summarizeTransactions(
        [...transactions, ...plannedCurrentMonth],
        new Date('2026-07-15T12:00:00'),
      ),
    ).toEqual({
      balanceMinor: 200_000,
      monthIncomeMinor: 250_000,
      monthExpenseMinor: 45_000,
    });
  });

  it('proyecta dentro del mes actual una recurrencia automática pendiente', () => {
    const recurringIncome: SessionTransaction = {
      ...transactions[0]!,
      id: 'monthly-income-source',
      amountMinor: 100_000,
      occurredOn: '2026-07-05',
      recurrence: 'monthly',
      nextOccurrenceOn: '2026-08-05',
      recurrenceSeriesId: 'monthly-income-series',
      recurrenceStartsOn: '2026-07-05',
    };

    expect(
      summarizeTransactions([recurringIncome], new Date('2026-08-02T12:00:00')),
    ).toEqual({
      balanceMinor: 200_000,
      monthIncomeMinor: 100_000,
      monthExpenseMinor: 0,
    });
  });

  it('no contabiliza ingresos ni gastos de meses posteriores', () => {
    expect(
      summarizeTransactions(
        futureTransactions,
        new Date('2026-07-31T12:00:00'),
      ),
    ).toEqual({
      balanceMinor: 160_000,
      monthIncomeMinor: 200_000,
      monthExpenseMinor: 35_000,
    });
  });
});

describe('summarizeTransactionTotals', () => {
  it('calcula ingresos, gastos y balance del conjunto completo recibido', () => {
    expect(summarizeTransactionTotals(transactions)).toEqual({
      balanceMinor: 160_000,
      incomeMinor: 200_000,
      expenseMinor: 40_000,
    });
  });

  it('devuelve todos los totales a cero para un conjunto vacío', () => {
    expect(summarizeTransactionTotals([])).toEqual({
      balanceMinor: 0,
      incomeMinor: 0,
      expenseMinor: 0,
    });
  });

  it('calcula también periodos futuros cuando ya vienen seleccionados', () => {
    expect(summarizeTransactionTotals(futureTransactions)).toEqual({
      balanceMinor: 200_000,
      incomeMinor: 250_000,
      expenseMinor: 50_000,
    });
  });
});

describe('sortTransactionsByRecentActivity', () => {
  it('ordena por updatedAt sin importar la fecha económica', () => {
    const oldDateRecentlyEdited: SessionTransaction = {
      ...transactions[0]!,
      id: 'old-date-recently-edited',
      occurredOn: '2020-01-01',
      updatedAt: '2026-07-20T10:00:00.000Z',
    };
    const recentDateNeverTouched: SessionTransaction = {
      ...transactions[0]!,
      id: 'recent-date-never-touched',
      occurredOn: '2026-07-31',
      updatedAt: '2026-01-01T10:00:00.000Z',
    };

    expect(
      sortTransactionsByRecentActivity([
        recentDateNeverTouched,
        oldDateRecentlyEdited,
      ]),
    ).toEqual([oldDateRecentlyEdited, recentDateNeverTouched]);
  });

  it('no muta el arreglo recibido', () => {
    const original = [...transactions];
    sortTransactionsByRecentActivity(transactions);
    expect(transactions).toEqual(original);
  });
});
