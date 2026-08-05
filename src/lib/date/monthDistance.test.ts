import {
  getCalendarFutureMonthRange,
  getCalendarPastMonthRange,
  getMonthDistance,
  isMonthWithinRange,
  maximumCalendarDate,
  minimumCalendarDate,
} from '@/lib/date/monthDistance';

describe('monthDistance', () => {
  it('calcula distancias también al cruzar de año', () => {
    expect(getMonthDistance('2026-12', '2027-01')).toBe(1);
    expect(getMonthDistance('2027-01', '2026-12')).toBe(-1);
  });

  it('limita la ventana al mes enfocado y sus dos adyacentes', () => {
    expect(isMonthWithinRange('2026-07', '2026-08', 1)).toBe(true);
    expect(isMonthWithinRange('2026-08', '2026-08', 1)).toBe(true);
    expect(isMonthWithinRange('2026-09', '2026-08', 1)).toBe(true);
    expect(isMonthWithinRange('2026-06', '2026-08', 1)).toBe(false);
    expect(isMonthWithinRange('2026-10', '2026-08', 1)).toBe(false);
  });

  it('calcula el historial mensual únicamente desde enero de 2024', () => {
    expect(minimumCalendarDate).toBe('2024-01-01');
    expect(maximumCalendarDate).toBe('2080-12-31');
    expect(getCalendarPastMonthRange('2026-08-12')).toBe(31);
    expect(getCalendarPastMonthRange('2024-01-31')).toBe(0);
  });

  it('mantiene hoy y la ventana futura al volver desde un mes antiguo', () => {
    expect(getCalendarFutureMonthRange('2024-01-15', '2026-08-12', 12)).toBe(
      43,
    );
    expect(getCalendarFutureMonthRange('2027-01-15', '2026-08-12', 12)).toBe(
      12,
    );
  });
});
