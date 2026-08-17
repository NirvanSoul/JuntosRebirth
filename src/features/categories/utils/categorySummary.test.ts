import type { Category } from '@/features/categories/types';
import {
  formatMonthKey,
  listTransactionsByMonth,
  shiftMonthKey,
  summarizeCategories,
} from '@/features/categories/utils/categorySummary';
import type { SessionTransaction } from '@/features/transactions/types';

const categories: Category[] = [
  {
    id: 'food',
    spaceId: 'personal',
    name: 'Comida',
    icon: 'fork-knife',
    colorToken: 'orange',
    budgetMinor: 5000,
    isDefault: false,
    isArchived: false,
  },
  {
    id: 'salary',
    spaceId: 'personal',
    name: 'Salario',
    icon: 'money',
    colorToken: 'emerald',
    isDefault: true,
    isArchived: false,
  },
];

const transactions: SessionTransaction[] = [
  {
    id: 'expense',
    spaceId: 'personal',
    type: 'expense',
    amountMinor: 1500,
    currency: 'EUR',
    title: 'Compra',
    categoryId: 'food',
    occurredOn: '2026-07-31',
    recurrence: 'once',
    updatedAt: '2026-07-31T12:00:00.000Z',
  },
  {
    id: 'income',
    spaceId: 'personal',
    type: 'income',
    amountMinor: 250_000,
    currency: 'EUR',
    title: 'Nómina',
    categoryId: 'salary',
    occurredOn: '2026-07-31',
    recurrence: 'once',
    updatedAt: '2026-07-31T12:00:00.000Z',
  },
];

describe('summarizeCategories', () => {
  it('incluye categorías sin movimientos y agrega las que sí tienen en la moneda solicitada', () => {
    expect(summarizeCategories(categories, transactions, 'EUR')).toEqual([
      expect.objectContaining({
        id: 'food',
        transactionCount: 1,
        incomeMinor: 0,
        expenseMinor: 1500,
        budgetMinor: 5000,
      }),
      expect.objectContaining({
        id: 'salary',
        transactionCount: 1,
        incomeMinor: 250_000,
        expenseMinor: 0,
      }),
    ]);
  });

  it('aislamiento: filtra por la moneda solicitada e ignora movimientos en otras divisas', () => {
    const mixedTransactions: SessionTransaction[] = [
      {
        id: 'tx-eur',
        spaceId: 'personal',
        type: 'expense',
        amountMinor: 1000,
        currency: 'EUR',
        title: 'Almuerzo EUR',
        categoryId: 'food',
        occurredOn: '2026-07-31',
        recurrence: 'once',
        updatedAt: '2026-07-31T12:00:00.000Z',
      },
      {
        id: 'tx-ves',
        spaceId: 'personal',
        type: 'expense',
        amountMinor: 4000,
        currency: 'VES',
        title: 'Almuerzo VES',
        categoryId: 'food',
        occurredOn: '2026-07-31',
        recurrence: 'once',
        updatedAt: '2026-07-31T12:00:00.000Z',
      },
    ];

    const vesSummary = summarizeCategories(
      categories,
      mixedTransactions,
      'VES',
    );
    const foodVes = vesSummary.find((s) => s.id === 'food')!;
    expect(foodVes.expenseMinor).toBe(4000);
    expect(foodVes.transactionCount).toBe(1);

    const eurSummary = summarizeCategories(
      categories,
      mixedTransactions,
      'EUR',
    );
    const foodEur = eurSummary.find((s) => s.id === 'food')!;
    expect(foodEur.expenseMinor).toBe(1000);
    expect(foodEur.transactionCount).toBe(1);
  });

  it('ignora movimientos cuya categoría no forma parte del catálogo recibido', () => {
    expect(summarizeCategories([], transactions, 'EUR')).toEqual([]);
  });
});

describe('utilidades mensuales de categorías', () => {
  it('navega entre años y formatea el mes en español', () => {
    expect(shiftMonthKey('2026-01', -1)).toBe('2025-12');
    expect(shiftMonthKey('2026-12', 1)).toBe('2027-01');
    expect(formatMonthKey('2026-07')).toBe('Julio 2026');
  });

  it('filtra por la fecha económica sin conversiones de zona horaria', () => {
    expect(listTransactionsByMonth(transactions, '2026-07')).toEqual(
      transactions,
    );
    expect(listTransactionsByMonth(transactions, '2026-06')).toEqual([]);
  });
});
