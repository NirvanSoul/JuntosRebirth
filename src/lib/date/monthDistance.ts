export const minimumCalendarDate = '2024-01-01';
export const maximumCalendarDate = '2080-12-31';

export function getMonthDistance(fromMonth: string, toMonth: string): number {
  const fromYear = Number(fromMonth.slice(0, 4));
  const fromMonthNumber = Number(fromMonth.slice(5, 7));
  const toYear = Number(toMonth.slice(0, 4));
  const toMonthNumber = Number(toMonth.slice(5, 7));

  return (toYear - fromYear) * 12 + (toMonthNumber - fromMonthNumber);
}

export function getCalendarPastMonthRange(currentDate: string): number {
  return Math.max(
    0,
    getMonthDistance(minimumCalendarDate.slice(0, 7), currentDate.slice(0, 7)),
  );
}

export function getCalendarFutureMonthRange(
  currentDate: string,
  rangeEndDate: string,
  additionalMonths: number,
): number {
  return (
    additionalMonths +
    Math.max(
      0,
      getMonthDistance(currentDate.slice(0, 7), rangeEndDate.slice(0, 7)),
    )
  );
}

export function isMonthWithinRange(
  month: string,
  centerMonth: string,
  range: number,
): boolean {
  return Math.abs(getMonthDistance(centerMonth, month)) <= range;
}
