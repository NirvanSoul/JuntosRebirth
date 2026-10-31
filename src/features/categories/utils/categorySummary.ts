import type { Category, CategoryIconName } from '@/features/categories/types';
import {
  getCategoryBudget,
  getCategoryBudgetRange,
  resolveBudgetAmount,
} from '@/features/categories/utils/categoryBudgetPeriod';
import type { SessionTransaction } from '@/features/transactions/types';
import { listTransactionsThroughCurrentMonth } from '@/features/transactions/utils/transactionSummary';
import { projectRecurringTransactions } from '@/features/transactions/utils/transactionRecurrence';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { toLocalDateKey } from '@/lib/date/localDate';
import type { CategoryColorToken } from '@/theme/categoryColors';

export type CategorySummary = {
  id: string;
  name: string;
  icon: CategoryIconName;
  colorToken: CategoryColorToken;
  budgetMinor?: number;
  transactionCount: number;
  incomeMinor: number;
  expenseMinor: number;
};

export function getCurrentMonthKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function parseMonthKey(monthKey: string): [number, number] {
  const [yearText = '', monthText = ''] = monthKey.split('-');
  const year = Number(yearText);
  const month = Number(monthText);

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    throw new Error('La clave de mes debe usar el formato YYYY-MM.');
  }

  return [year, month];
}

export function shiftMonthKey(monthKey: string, offset: number): string {
  const [year, month] = parseMonthKey(monthKey);
  const shifted = new Date(year, month - 1 + offset, 1);

  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}`;
}

const monthYearFormatter = new Intl.DateTimeFormat('es-ES', {
  month: 'long',
  year: 'numeric',
});

export function formatMonthKey(monthKey: string): string {
  const [year, month] = parseMonthKey(monthKey);
  const label = monthYearFormatter
    .format(new Date(year, month - 1, 1))
    .replace(' de ', ' ');

  return label.charAt(0).toLocaleUpperCase('es-ES') + label.slice(1);
}

export function listTransactionsByMonth(
  transactions: readonly SessionTransaction[],
  monthKey: string,
): SessionTransaction[] {
  return transactions.filter((transaction) =>
    transaction.occurredOn.startsWith(`${monthKey}-`),
  );
}

export function summarizeCategories(
  categories: readonly Category[],
  transactions: readonly SessionTransaction[],
  currency: CurrencyCode,
  referenceDate = new Date(),
): CategorySummary[] {
  const summaries = new Map<string, CategorySummary>(
    categories.map((category) => [
      category.id,
      {
        id: category.id,
        name: category.name,
        icon: category.icon,
        colorToken: category.colorToken,
        budgetMinor: resolveCurrencyBudget(category, currency, referenceDate),
        transactionCount: 0,
        incomeMinor: 0,
        expenseMinor: 0,
      },
    ]),
  );

  listTransactionsThroughCurrentMonth(transactions, referenceDate).forEach(
    (transaction) => {
      if (transaction.currency !== currency) {
        return;
      }

      const current = summaries.get(transaction.categoryId);
      if (!current) {
        return;
      }

      current.transactionCount += 1;
      if (transaction.type === 'income') {
        current.incomeMinor += transaction.amountMinor;
      } else {
        current.expenseMinor += transaction.amountMinor;
      }
    },
  );

  return Array.from(summaries.values());
}

function resolveCurrencyBudget(
  category: Category,
  currency: CurrencyCode,
  date: Date,
): number | undefined {
  const budget = getCategoryBudget(category, currency);
  return budget ? resolveBudgetAmount(budget, date) : undefined;
}

/**
 * Gasto que consume el presupuesto de cada categoría con presupuesto en
 * `currency`: solo
 * cuentan los gastos en `currency` dentro del periodo de esa categoría que
 * contiene `referenceDate` (mes, semana, quincena o cada N días), incluidos
 * los recurrentes programados dentro de él.
 */
export function summarizeBudgetExpenses(
  categories: readonly Category[],
  transactions: readonly SessionTransaction[],
  currency: CurrencyCode,
  referenceDate = new Date(),
): ReadonlyMap<string, number> {
  const ranges = new Map<string, { end: string; start: string }>();
  categories.forEach((category) => {
    const budget = getCategoryBudget(category, currency);
    if (!budget) return;
    const range = getCategoryBudgetRange(budget, referenceDate);
    ranges.set(category.id, {
      start: toLocalDateKey(range.start),
      end: toLocalDateKey(range.end),
    });
  });

  const expenses = new Map<string, number>();
  if (ranges.size === 0) return expenses;

  const bounds = [...ranges.values()];
  const startOn = bounds.reduce(
    (min, range) => (range.start < min ? range.start : min),
    bounds[0]!.start,
  );
  const endOn = bounds.reduce(
    (max, range) => (range.end > max ? range.end : max),
    bounds[0]!.end,
  );

  projectRecurringTransactions({ transactions, startOn, endOn }).forEach(
    (transaction) => {
      const range = ranges.get(transaction.categoryId);
      if (
        !range ||
        transaction.type !== 'expense' ||
        transaction.currency !== currency ||
        transaction.occurredOn < range.start ||
        transaction.occurredOn > range.end
      ) {
        return;
      }

      expenses.set(
        transaction.categoryId,
        (expenses.get(transaction.categoryId) ?? 0) + transaction.amountMinor,
      );
    },
  );

  return expenses;
}

/** Gasto de una categoría en `currency` entre dos fechas, con recurrentes. */
export function summarizeCategoryExpenseInRange(
  categoryId: string,
  transactions: readonly SessionTransaction[],
  currency: CurrencyCode,
  startOn: string,
  endOn: string,
): number {
  return projectRecurringTransactions({ transactions, startOn, endOn }).reduce(
    (total, transaction) =>
      transaction.categoryId === categoryId &&
      transaction.type === 'expense' &&
      transaction.currency === currency &&
      transaction.occurredOn >= startOn &&
      transaction.occurredOn <= endOn
        ? total + transaction.amountMinor
        : total,
    0,
  );
}
