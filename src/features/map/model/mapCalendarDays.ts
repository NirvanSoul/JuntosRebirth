import type { SessionTransaction } from '@/features/transactions/types';

export type MapCalendarDay = {
  hasExpenses: boolean;
  hasIncomes: boolean;
  transactions: readonly SessionTransaction[];
};

export type MapCalendarDays = ReadonlyMap<string, MapCalendarDay>;

/**
 * Construye la única fuente de datos diaria que comparten la vista semanal de
 * Mapa y la hoja de detalle. Mantener el agrupamiento fuera del calendario
 * evita recorrer los movimientos una vez por consumidor.
 */
export function indexMapCalendarDays(
  transactions: readonly SessionTransaction[],
): MapCalendarDays {
  const days = new Map<
    string,
    {
      hasExpenses: boolean;
      hasIncomes: boolean;
      transactions: SessionTransaction[];
    }
  >();

  for (const transaction of transactions) {
    const currentDay = days.get(transaction.occurredOn);
    const isExpense = transaction.type === 'expense';

    if (currentDay) {
      currentDay.hasExpenses ||= isExpense;
      currentDay.hasIncomes ||= !isExpense;
      currentDay.transactions.push(transaction);
      continue;
    }

    days.set(transaction.occurredOn, {
      hasExpenses: isExpense,
      hasIncomes: !isExpense,
      transactions: [transaction],
    });
  }

  return days;
}
