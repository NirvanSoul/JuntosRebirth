import type { SessionTransaction } from '@/features/transactions/types';
import { toLocalDateKey } from '@/lib/date/localDate';
import { projectRecurringTransactions } from '@/features/transactions/utils/transactionRecurrence';

export type TransactionPeriod = 'month' | 'week' | 'fortnight' | 'year';

export const transactionPeriodOptions: readonly {
  label: string;
  value: TransactionPeriod;
}[] = [
  { value: 'month', label: 'Mensual' },
  { value: 'week', label: 'Semanal' },
  { value: 'fortnight', label: 'Quincenal' },
  { value: 'year', label: 'Anual' },
];

function createLocalDate(year: number, month: number, day: number): Date {
  return new Date(year, month, day, 12);
}

export function getTransactionPeriodRange(
  period: TransactionPeriod,
  referenceDate: Date,
): { end: Date; start: Date } {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const day = referenceDate.getDate();

  if (period === 'year') {
    return {
      start: createLocalDate(year, 0, 1),
      end: createLocalDate(year, 11, 31),
    };
  }
  if (period === 'month') {
    return {
      start: createLocalDate(year, month, 1),
      end: createLocalDate(year, month + 1, 0),
    };
  }
  if (period === 'fortnight') {
    const isFirstFortnight = day <= 15;
    return {
      start: createLocalDate(year, month, isFirstFortnight ? 1 : 16),
      end: createLocalDate(
        year,
        isFirstFortnight ? month : month + 1,
        isFirstFortnight ? 15 : 0,
      ),
    };
  }

  const daysSinceMonday = (referenceDate.getDay() + 6) % 7;
  const start = createLocalDate(year, month, day - daysSinceMonday);
  return {
    start,
    end: createLocalDate(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + 6,
    ),
  };
}

export function listTransactionsByPeriod(
  transactions: readonly SessionTransaction[],
  period: TransactionPeriod,
  selectedDate: Date,
): SessionTransaction[] {
  const range = getTransactionPeriodRange(period, selectedDate);
  const start = toLocalDateKey(range.start);
  const end = toLocalDateKey(range.end);

  return projectRecurringTransactions({
    transactions,
    startOn: start,
    endOn: end,
  })
    .filter(
      (transaction) =>
        transaction.occurredOn >= start && transaction.occurredOn <= end,
    )
    .sort((left, right) => right.occurredOn.localeCompare(left.occurredOn));
}

export function shiftTransactionPeriod(
  period: TransactionPeriod,
  selectedDate: Date,
  offset: -1 | 1,
): Date {
  const range = getTransactionPeriodRange(period, selectedDate);

  if (period === 'week') {
    return createLocalDate(
      range.start.getFullYear(),
      range.start.getMonth(),
      range.start.getDate() + offset * 7,
    );
  }
  if (period === 'fortnight') {
    const isFirstFortnight = range.start.getDate() === 1;
    return createLocalDate(
      range.start.getFullYear(),
      range.start.getMonth() +
        (isFirstFortnight && offset === -1
          ? -1
          : !isFirstFortnight && offset === 1
            ? 1
            : 0),
      isFirstFortnight ? 16 : 1,
    );
  }
  if (period === 'month') {
    return createLocalDate(
      range.start.getFullYear(),
      range.start.getMonth() + offset,
      1,
    );
  }

  return createLocalDate(range.start.getFullYear() + offset, 0, 1);
}

const previousPeriodNouns: Record<TransactionPeriod, string> = {
  month: 'mes',
  week: 'semana',
  fortnight: 'quincena',
  year: 'año',
};

export function describePreviousPeriod(period: TransactionPeriod): string {
  return `vs. ${previousPeriodNouns[period]} anterior`;
}

export function getPreviousPeriodTransactions(
  transactions: readonly SessionTransaction[],
  period: TransactionPeriod,
  selectedDate: Date,
): SessionTransaction[] {
  const previousDate = shiftTransactionPeriod(period, selectedDate, -1);

  return listTransactionsByPeriod(transactions, period, previousDate);
}

const monthFormatter = new Intl.DateTimeFormat('es-ES', {
  month: 'long',
  year: 'numeric',
});
const shortDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
});

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase('es-ES') + value.slice(1);
}

export function formatTransactionPeriod(
  period: TransactionPeriod,
  selectedDate: Date,
): string {
  const range = getTransactionPeriodRange(period, selectedDate);
  const year = range.start.getFullYear();

  if (period === 'year') return String(year);
  if (period === 'month') {
    return capitalize(monthFormatter.format(range.start).replace(' de ', ' '));
  }
  if (period === 'fortnight') {
    const month = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(
      range.start,
    );
    return `${range.start.getDate()}–${range.end.getDate()} ${month} ${year}`;
  }

  const start = shortDateFormatter.format(range.start).replace('.', '');
  const end = shortDateFormatter.format(range.end).replace('.', '');
  const endYear = range.end.getFullYear();
  return `${start} – ${end} ${year === endYear ? year : `${year}/${endYear}`}`;
}
