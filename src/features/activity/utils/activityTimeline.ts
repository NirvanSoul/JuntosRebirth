import {
  listTransactionsByDateFilter,
  type TransactionDateFilter,
} from '@/features/activity/utils/transactionDateFilter';
import { formatTransactionPeriod } from '@/features/dashboard/utils/transactionPeriod';
import type { SessionTransaction } from '@/features/transactions/types';
import { projectRecurringTransactions } from '@/features/transactions/utils/transactionRecurrence';
import {
  getLocalMonthEndKey,
  summarizeTransactionTotals,
  type TransactionTotals,
} from '@/features/transactions/utils/transactionSummary';

/** Meses previstos que muestra «Desde el inicio» tras el mes en curso. */
export const activityFutureMonths = 12;

export type ActivityMonthSection = {
  /** `AAAA-MM`. */
  key: string;
  label: string;
  /** Del día más reciente al más antiguo. */
  transactions: SessionTransaction[];
};

/**
 * Movimientos de Actividad según el filtro de fecha. «Desde el inicio» suma
 * a todo el historial lo previsto en los doce meses siguientes al actual,
 * con las recurrencias proyectadas; los demás filtros no cambian.
 */
export function listActivityTransactions(
  transactions: readonly SessionTransaction[],
  filter: TransactionDateFilter,
  referenceDate = new Date(),
): SessionTransaction[] {
  if (filter !== 'all') {
    return listTransactionsByDateFilter(transactions, filter);
  }

  const endOn = getLocalMonthEndKey(
    new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() + activityFutureMonths,
      1,
    ),
  );
  return projectRecurringTransactions({ endOn, transactions }).filter(
    (transaction) => transaction.occurredOn <= endOn,
  );
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Agrupa por mes en el orden en que se recorre «Desde el inicio»: primero el
 * mes en curso, al bajar los siguientes y, tras el último previsto, los
 * anteriores hacia atrás. Espera los movimientos del más reciente al más
 * antiguo, como los devuelve `listActivityTransactions`.
 */
export function groupActivityMonths(
  transactions: readonly SessionTransaction[],
  referenceDate = new Date(),
): ActivityMonthSection[] {
  const currentKey = getMonthKey(referenceDate);
  const byMonth = new Map<string, SessionTransaction[]>();
  for (const transaction of transactions) {
    const key = transaction.occurredOn.slice(0, 7);
    const month = byMonth.get(key);
    if (month) month.push(transaction);
    else byMonth.set(key, [transaction]);
  }

  const keys = [...byMonth.keys()];
  const future = keys.filter((key) => key > currentKey).sort();
  const past = keys
    .filter((key) => key < currentKey)
    .sort()
    .reverse();
  const ordered = [
    ...(byMonth.has(currentKey) ? [currentKey] : []),
    ...future,
    ...past,
  ];

  return ordered.map((key) => ({
    key,
    label: formatTransactionPeriod(
      'month',
      new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1),
    ),
    transactions: byMonth.get(key)!,
  }));
}

/**
 * Resumen del mes que se está viendo: sus ingresos y gastos, y el balance
 * acumulado hasta su último día, que arrastra el de los meses anteriores.
 */
export function summarizeActivityMonth(
  sections: readonly ActivityMonthSection[],
  key: string,
): TransactionTotals {
  const month = sections.find((section) => section.key === key);
  const totals = summarizeTransactionTotals(month?.transactions ?? []);
  const balanceMinor = sections
    .filter((section) => section.key <= key)
    .reduce(
      (balance, section) =>
        balance + summarizeTransactionTotals(section.transactions).balanceMinor,
      0,
    );

  return { ...totals, balanceMinor };
}
