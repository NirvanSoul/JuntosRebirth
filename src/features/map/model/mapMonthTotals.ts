import type { SessionTransaction } from '@/features/transactions/types';
import { compareTransactionTotals } from '@/features/transactions/utils/periodComparison';
import {
  summarizeTransactionTotals,
  type TransactionTotals,
} from '@/features/transactions/utils/transactionSummary';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { getMonthStartAtOffset } from '@/lib/date/monthDistance';

/**
 * Ingresos y gastos del mes (`YYYY-MM`); el balance arrastra todo lo anterior,
 * como el saldo que se ve en el calendario.
 */
export function summarizeMapMonth(
  transactions: readonly SessionTransaction[],
  month: string,
): TransactionTotals {
  const monthStart = `${month}-01`;
  const monthTotals = summarizeTransactionTotals(
    transactions.filter((transaction) =>
      transaction.occurredOn.startsWith(`${month}-`),
    ),
  );
  const carryOver = summarizeTransactionTotals(
    transactions.filter((transaction) => transaction.occurredOn < monthStart),
  );
  return {
    ...monthTotals,
    balanceMinor: monthTotals.balanceMinor + carryOver.balanceMinor,
  };
}

/** Totales del mes enfocado y su comparación con el mes anterior. */
export function summarizeMapMonthWithComparison(
  transactions: readonly SessionTransaction[],
  currency: CurrencyCode,
  month: string,
) {
  const currencyTransactions = transactions.filter(
    (transaction) => transaction.currency === currency,
  );
  const totals = summarizeMapMonth(currencyTransactions, month);
  const previousMonth = getMonthStartAtOffset(`${month}-01`, -1).slice(0, 7);
  const previousTotals = summarizeMapMonth(currencyTransactions, previousMonth);

  return {
    comparisons: compareTransactionTotals(totals, previousTotals),
    totals,
  };
}
