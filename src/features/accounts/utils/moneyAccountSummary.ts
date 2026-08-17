import type { MoneyAccount } from '@/features/accounts/types';
import type { SessionTransaction } from '@/features/transactions/types';
import { listTransactionsThroughCurrentMonth } from '@/features/transactions/utils/transactionSummary';

export type MoneyAccountSummary = MoneyAccount & {
  /** Saldo inicial más ingresos menos gastos asignados a la cuenta. */
  balanceMinor: number;
  incomeMinor: number;
  expenseMinor: number;
  transactionCount: number;
};

/**
 * Calcula el saldo de cada cuenta con la misma regla de horizonte que el
 * resto de la app: cuenta todo hasta el último día del mes local actual
 * —incluidas las fechas de este mes todavía por llegar y las ocurrencias
 * proyectadas de una serie recurrente— y deja fuera los meses posteriores
 * (ADR-056, `DATABASE.md` §8). Así el saldo de una cuenta nunca contradice
 * al balance que muestra Inicio para el mismo periodo.
 *
 * Solo suma movimientos en la moneda de la cuenta: elegir una cuenta fija la
 * moneda del movimiento, de modo que una divisa distinta solo puede venir de
 * datos anteriores a esta función y no debe mezclarse en un mismo saldo.
 */
export function summarizeMoneyAccounts(
  accounts: readonly MoneyAccount[],
  transactions: readonly SessionTransaction[],
  referenceDate = new Date(),
): MoneyAccountSummary[] {
  const transactionsThroughCurrentMonth = listTransactionsThroughCurrentMonth(
    transactions,
    referenceDate,
  );

  return accounts.map((account) => {
    const accountTransactions = transactionsThroughCurrentMonth.filter(
      (transaction) =>
        transaction.moneyAccountId === account.id &&
        transaction.currency === account.currency,
    );

    return accountTransactions.reduce<MoneyAccountSummary>(
      (summary, transaction) => {
        if (transaction.type === 'income') {
          summary.incomeMinor += transaction.amountMinor;
          summary.balanceMinor += transaction.amountMinor;
        } else {
          summary.expenseMinor += transaction.amountMinor;
          summary.balanceMinor -= transaction.amountMinor;
        }
        summary.transactionCount += 1;

        return summary;
      },
      {
        ...account,
        balanceMinor: account.openingBalanceMinor,
        incomeMinor: 0,
        expenseMinor: 0,
        transactionCount: 0,
      },
    );
  });
}
