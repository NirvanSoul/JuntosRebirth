import type { Category, CategoryIconName } from '@/features/categories/types';
import type { SessionTransaction } from '@/features/transactions/types';
import { listTransactionsThroughCurrentMonth } from '@/features/transactions/utils/transactionSummary';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
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

export function formatMonthKey(monthKey: string): string {
  const [year, month] = parseMonthKey(monthKey);
  const label = new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric',
  })
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
        budgetMinor: category.budgetMinor,
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
