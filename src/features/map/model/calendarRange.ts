import {
  getMonthStartAtOffset,
  maximumCalendarDate,
} from '@/lib/date/monthDistance';

export const mapCalendarFutureMonthsPerBatch = 24;

function getMonthEnd(monthStart: string): string {
  const nextMonth = getMonthStartAtOffset(monthStart, 1);
  const date = new Date(
    Number(nextMonth.slice(0, 4)),
    Number(nextMonth.slice(5, 7)) - 1,
    0,
    12,
  );

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getRangeEndAfterMonths(anchorDate: string, months: number): string {
  return [
    getMonthEnd(getMonthStartAtOffset(anchorDate, months)),
    maximumCalendarDate,
  ].sort()[0]!;
}

export function getInitialMapCalendarRangeEnd(today: string): string {
  return getRangeEndAfterMonths(today, mapCalendarFutureMonthsPerBatch);
}

export function getNextMapCalendarRangeEnd(currentRangeEnd: string): string {
  return getRangeEndAfterMonths(
    currentRangeEnd,
    mapCalendarFutureMonthsPerBatch,
  );
}
