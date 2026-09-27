import {
  getMonthStartAtOffset,
  minimumCalendarDate,
} from '@/lib/date/monthDistance';
import { toLocalDateKey } from '@/lib/date/localDate';

const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000;

export function parseCalendarDate(date: string): Date {
  return new Date(`${date}T12:00:00`);
}

export function addCalendarDays(date: string, days: number): string {
  const result = parseCalendarDate(date);
  result.setDate(result.getDate() + days);
  return toLocalDateKey(result);
}

function getUtcTime(date: string): number {
  return Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
  );
}

export function getCalendarWeek(date: string): string[] {
  const current = parseCalendarDate(date);
  const daysSinceMonday = (current.getDay() + 6) % 7;
  current.setDate(current.getDate() - daysSinceMonday);
  const monday = toLocalDateKey(current);
  return Array.from({ length: 7 }, (_, index) =>
    addCalendarDays(monday, index),
  );
}

export function getWeeksInCalendarRange(
  startDate: string,
  endDate: string,
): string[][] {
  const boundedStart =
    startDate < minimumCalendarDate ? minimumCalendarDate : startDate;
  const firstWeek = getCalendarWeek(boundedStart);
  const lastWeek = getCalendarWeek(
    endDate < boundedStart ? boundedStart : endDate,
  );
  const weekCount =
    Math.floor(
      (getUtcTime(lastWeek[0]!) - getUtcTime(firstWeek[0]!)) /
        millisecondsPerWeek,
    ) + 1;

  return Array.from({ length: weekCount }, (_, index) =>
    firstWeek.map((weekDate) => addCalendarDays(weekDate, index * 7)),
  );
}

export type MonthSeparatedCalendarWeek = readonly (string | null)[];

export function getMonthSeparatedWeekStart(
  week: MonthSeparatedCalendarWeek,
): string | undefined {
  return week.find((date): date is string => date !== null);
}

export function startsNewMonthSeparatedWeek(
  weeks: readonly MonthSeparatedCalendarWeek[],
  index: number,
): boolean {
  return (
    index > 0 &&
    getMonthSeparatedWeekStart(weeks[index]!)?.slice(0, 7) !==
      getMonthSeparatedWeekStart(weeks[index - 1]!)?.slice(0, 7)
  );
}

/**
 * Mantiene la columna real de cada fecha, pero no une visualmente dos meses
 * dentro de la misma semana. Así, un mes que empieza en jueves deja Lun-Mié
 * vacíos y termina con sus propias celdas finales, sin arrastrar fechas del
 * mes vecino.
 */
export function getMonthSeparatedWeeksInCalendarRange(
  startDate: string,
  endDate: string,
): MonthSeparatedCalendarWeek[] {
  const boundedStart =
    startDate < minimumCalendarDate ? minimumCalendarDate : startDate;
  const boundedEnd = endDate < boundedStart ? boundedStart : endDate;
  const weeks: MonthSeparatedCalendarWeek[] = [];

  for (
    let monthStart = `${boundedStart.slice(0, 7)}-01`;
    monthStart.slice(0, 7) <= boundedEnd.slice(0, 7);
    monthStart = getMonthStartAtOffset(monthStart, 1)
  ) {
    const weekdayOffset = (parseCalendarDate(monthStart).getDay() + 6) % 7;
    const daysInMonth = new Date(
      Number(monthStart.slice(0, 4)),
      Number(monthStart.slice(5, 7)),
      0,
      12,
    ).getDate();
    const cells: (string | null)[] = Array.from(
      { length: weekdayOffset },
      () => null,
    );

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${monthStart.slice(0, 7)}-${String(day).padStart(2, '0')}`;
      cells.push(date >= boundedStart && date <= boundedEnd ? date : null);
    }
    while (cells.length % 7 !== 0) cells.push(null);
    for (let index = 0; index < cells.length; index += 7) {
      weeks.push(cells.slice(index, index + 7));
    }
  }

  return weeks;
}

function getMonthKey(date: string): string {
  return date.slice(0, 7);
}

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase('es-ES') + value.slice(1);
}

function formatMonthName(date: string): string {
  return capitalize(
    new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(
      parseCalendarDate(date),
    ),
  );
}

function formatMonth(date: string, includeYear: boolean): string {
  const month = formatMonthName(date);
  return includeYear ? `${month} ${date.slice(0, 4)}` : month;
}

export function getMonthLabelParts(monthKey: string): {
  month: string;
  year: string;
} {
  return {
    month: formatMonthName(`${monthKey}-01`),
    year: monthKey.slice(0, 4),
  };
}

export function formatWeekMonthLabel(week: readonly string[]): string {
  const firstDate = week[0]!;
  const lastDate = week[week.length - 1]!;
  if (getMonthKey(firstDate) === getMonthKey(lastDate)) {
    return formatMonth(firstDate, true);
  }

  const sameYear = firstDate.slice(0, 4) === lastDate.slice(0, 4);
  return `${formatMonth(firstDate, !sameYear)} - ${formatMonth(lastDate, true)}`;
}

export function shouldShowWeekMonthLabel(
  weeks: readonly (readonly string[])[],
  index: number,
): boolean {
  const week = weeks[index]!;
  const crossesMonth = getMonthKey(week[0]!) !== getMonthKey(week[6]!);
  if (index === 0 || crossesMonth) return true;
  return getMonthKey(weeks[index - 1]![6]!) !== getMonthKey(week[0]!);
}

export function getMonthIntroductionWeekIndex(
  weeks: readonly (readonly string[])[],
  date: string,
): number {
  const currentWeekIndex = weeks.findIndex((week) => week.includes(date));
  if (currentWeekIndex < 0) return 0;

  for (let index = currentWeekIndex; index >= 0; index -= 1) {
    if (shouldShowWeekMonthLabel(weeks, index)) return index;
  }

  return currentWeekIndex;
}
