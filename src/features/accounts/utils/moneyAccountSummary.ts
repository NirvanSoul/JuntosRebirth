import type { MoneyAccount } from '@/features/accounts/types';
import type { SessionTransaction } from '@/features/transactions/types';
import { listTransactionsThroughCurrentMonth } from '@/features/transactions/utils/transactionSummary';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { toLocalDateKey } from '@/lib/date/localDate';
import type { CategoryColorToken } from '@/theme/categoryColors';

export type MoneyAccountCurrencyBalance = {
  currency: CurrencyCode;
  /** Saldo inicial más ingresos menos gastos de esa misma moneda. */
  balanceMinor: number;
  /** Saldo de cierre de la misma moneda al finalizar el mes anterior. */
  previousMonthBalanceMinor: number;
  incomeMinor: number;
  expenseMinor: number;
  transactionCount: number;
};

export type MoneyAccountSummary = MoneyAccount & {
  /** Un saldo por moneda, en el mismo orden que declara la cuenta. */
  balanceByCurrency: readonly MoneyAccountCurrencyBalance[];
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
 * Una cuenta puede guardar varias monedas, como hace un banco. Cada una lleva
 * su propio saldo y jamás se suman entre sí: un total mezclando divisas no
 * significaría nada mientras no exista conversión.
 */
export function summarizeMoneyAccounts(
  accounts: readonly MoneyAccount[],
  transactions: readonly SessionTransaction[],
  referenceDate = new Date(),
): MoneyAccountSummary[] {
  const currentMonthStart = toLocalDateKey(
    new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1, 12),
  );
  const transactionsThroughCurrentMonth = listTransactionsThroughCurrentMonth(
    transactions,
    referenceDate,
  );

  return accounts.map((account) => {
    const accountTransactions = transactionsThroughCurrentMonth.filter(
      (transaction) => transaction.moneyAccountId === account.id,
    );

    const balanceByCurrency = account.balances.map((balance) =>
      accountTransactions
        .filter((transaction) => transaction.currency === balance.currency)
        .reduce<MoneyAccountCurrencyBalance>(
          (summary, transaction) => {
            if (transaction.type === 'income') {
              summary.incomeMinor += transaction.amountMinor;
              summary.balanceMinor += transaction.amountMinor;
              if (transaction.occurredOn < currentMonthStart) {
                summary.previousMonthBalanceMinor += transaction.amountMinor;
              }
            } else {
              summary.expenseMinor += transaction.amountMinor;
              summary.balanceMinor -= transaction.amountMinor;
              if (transaction.occurredOn < currentMonthStart) {
                summary.previousMonthBalanceMinor -= transaction.amountMinor;
              }
            }
            summary.transactionCount += 1;

            return summary;
          },
          {
            currency: balance.currency,
            balanceMinor: balance.openingBalanceMinor,
            previousMonthBalanceMinor: balance.openingBalanceMinor,
            incomeMinor: 0,
            expenseMinor: 0,
            transactionCount: 0,
          },
        ),
    );

    return {
      ...account,
      balanceByCurrency,
      transactionCount: balanceByCurrency.reduce(
        (total, balance) => total + balance.transactionCount,
        0,
      ),
    };
  });
}

/** El saldo que encabeza la tarjeta: el de la moneda principal. */
export function getPrimaryBalance(
  summary: MoneyAccountSummary,
): MoneyAccountCurrencyBalance {
  const primary = summary.balanceByCurrency[0];

  if (!primary) {
    throw new Error('La cuenta no tiene ninguna moneda asociada');
  }

  return primary;
}

export type MoneyAccountTotals = {
  id: string;
  name: string;
  colorToken: CategoryColorToken;
  incomeMinor: number;
  expenseMinor: number;
};

/**
 * Ingresos y gastos de cada cuenta en una sola moneda, para el conjunto de
 * movimientos que se le entregue —normalmente los de un mes—. No devuelve un
 * saldo: responde a qué cuenta entra más dinero y de cuál sale más.
 *
 * Los movimientos sin cuenta no se reparten en ninguna: son válidos y no
 * afectan a ningún saldo (`transactions/types.ts`), así que tampoco pintan
 * porción.
 */
export function summarizeMoneyAccountTotals(
  accounts: readonly MoneyAccount[],
  transactions: readonly SessionTransaction[],
  currency: CurrencyCode,
): MoneyAccountTotals[] {
  const totals = new Map<string, MoneyAccountTotals>(
    accounts.map((account) => [
      account.id,
      {
        id: account.id,
        name: account.name,
        colorToken: account.colorToken,
        incomeMinor: 0,
        expenseMinor: 0,
      },
    ]),
  );

  transactions.forEach((transaction) => {
    if (transaction.currency !== currency || !transaction.moneyAccountId) {
      return;
    }

    const current = totals.get(transaction.moneyAccountId);
    if (!current) {
      return;
    }

    if (transaction.type === 'income') {
      current.incomeMinor += transaction.amountMinor;
    } else {
      current.expenseMinor += transaction.amountMinor;
    }
  });

  return Array.from(totals.values());
}
