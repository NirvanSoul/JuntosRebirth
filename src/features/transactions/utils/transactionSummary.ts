import type { SessionTransaction } from '@/features/transactions/types';
import { groupTransactionsByCurrency } from '@/features/transactions/utils/transactionCurrencyGrouping';
import { projectRecurringTransactions } from '@/features/transactions/utils/transactionRecurrence';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';

export type TransactionSummary = {
  balanceMinor: number;
  monthIncomeMinor: number;
  monthExpenseMinor: number;
};

export type TransactionTotals = {
  balanceMinor: number;
  incomeMinor: number;
  expenseMinor: number;
};

export type TransactionTotalsByCurrency = {
  currency: CurrencyCode;
  totals: TransactionTotals;
};

export type TransactionSummaryByCurrency = {
  currency: CurrencyCode;
  summary: TransactionSummary;
};

export function getLocalDateKey(referenceDate = new Date()): string {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0');
  const day = String(referenceDate.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getLocalMonthEndKey(referenceDate = new Date()): string {
  return getLocalDateKey(
    new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0, 12),
  );
}

export function listTransactionsThroughCurrentMonth(
  transactions: readonly SessionTransaction[],
  referenceDate = new Date(),
): SessionTransaction[] {
  const currentMonthEnd = getLocalMonthEndKey(referenceDate);

  return projectRecurringTransactions({
    endOn: currentMonthEnd,
    transactions,
  }).filter((transaction) => transaction.occurredOn <= currentMonthEnd);
}

/**
 * Ordena por actividad reciente: primero lo creado o modificado más
 * recientemente, sin importar su fecha económica (`occurredOn`). Es el
 * orden que espera «Movimientos recientes» en Inicio, distinto del orden
 * cronológico por fecha que usan Actividad, Mapa y el detalle de categoría.
 */
export function sortTransactionsByRecentActivity(
  transactions: readonly SessionTransaction[],
): SessionTransaction[] {
  return [...transactions].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export function summarizeTransactionTotals(
  transactions: readonly SessionTransaction[],
): TransactionTotals {
  return transactions.reduce<TransactionTotals>(
    (totals, transaction) => {
      if (transaction.type === 'income') {
        totals.incomeMinor += transaction.amountMinor;
        totals.balanceMinor += transaction.amountMinor;
      } else {
        totals.expenseMinor += transaction.amountMinor;
        totals.balanceMinor -= transaction.amountMinor;
      }

      return totals;
    },
    { balanceMinor: 0, incomeMinor: 0, expenseMinor: 0 },
  );
}

function getMonthPrefix(referenceDate: Date): string {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0');

  return `${year}-${month}-`;
}

export function summarizeTransactions(
  transactions: readonly SessionTransaction[],
  referenceDate = new Date(),
): TransactionSummary {
  const monthPrefix = getMonthPrefix(referenceDate);
  const transactionsThroughCurrentMonth = listTransactionsThroughCurrentMonth(
    transactions,
    referenceDate,
  );

  return transactionsThroughCurrentMonth.reduce<TransactionSummary>(
    (summary, transaction) => {
      const isIncome = transaction.type === 'income';

      summary.balanceMinor += isIncome
        ? transaction.amountMinor
        : -transaction.amountMinor;

      if (transaction.occurredOn.startsWith(monthPrefix)) {
        if (isIncome) {
          summary.monthIncomeMinor += transaction.amountMinor;
        } else {
          summary.monthExpenseMinor += transaction.amountMinor;
        }
      }

      return summary;
    },
    {
      balanceMinor: 0,
      monthIncomeMinor: 0,
      monthExpenseMinor: 0,
    },
  );
}

export function summarizeTransactionTotalsByCurrency(
  transactions: readonly SessionTransaction[],
): readonly TransactionTotalsByCurrency[] {
  return Array.from(groupTransactionsByCurrency(transactions))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, currencyTransactions]) => ({
      currency,
      totals: summarizeTransactionTotals(currencyTransactions),
    }));
}

export function summarizeTransactionsByCurrency(
  transactions: readonly SessionTransaction[],
  referenceDate = new Date(),
): readonly TransactionSummaryByCurrency[] {
  return Array.from(groupTransactionsByCurrency(transactions))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, currencyTransactions]) => ({
      currency,
      summary: summarizeTransactions(currencyTransactions, referenceDate),
    }));
}
