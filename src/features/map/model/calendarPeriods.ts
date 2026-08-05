import { minimumCalendarDate } from '@/lib/date/monthDistance';

const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000;

export function parseCalendarDate(date: string): Date {
  return new Date(`${date}T12:00:00`);
}

export function formatCalendarDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function addCalendarDays(date: string, days: number): string {
  const result = parseCalendarDate(date);
  result.setDate(result.getDate() + days);
  return formatCalendarDate(result);
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
  const monday = formatCalendarDate(current);
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
