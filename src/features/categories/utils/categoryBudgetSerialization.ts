import {
  budgetIntervalDaysRange,
  type BudgetOverride,
  type BudgetSchedule,
  type BudgetScheduleSegment,
} from '@/features/categories/types';

const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

function parseJsonArray(json: string | null | undefined): unknown {
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

function isPositiveAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

/**
 * Periodicidad guardada en SQLite o recibida del servidor. Ausente o
 * desconocida equivale a mensual (`undefined`).
 */
export function normalizeBudgetSchedule(
  period: unknown,
  intervalDays: unknown,
  anchorOn: unknown,
): BudgetSchedule | undefined {
  if (period === 'week' || period === 'fortnight') return { period };
  const days = Number(intervalDays);
  if (
    period === 'custom' &&
    Number.isInteger(days) &&
    days >= budgetIntervalDaysRange.min &&
    days <= budgetIntervalDaysRange.max &&
    typeof anchorOn === 'string' &&
    dateKeyPattern.test(anchorOn.slice(0, 10))
  ) {
    return { period, intervalDays: days, anchorOn: anchorOn.slice(0, 10) };
  }
  return undefined;
}

/** Descarta entradas mal formadas en lugar de romper la carga del catálogo. */
export function normalizeBudgetOverrides(value: unknown): BudgetOverride[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry: unknown) => {
    if (typeof entry !== 'object' || entry === null) return [];
    const { periodStartOn, amountMinor } = entry as Record<string, unknown>;
    return typeof periodStartOn === 'string' &&
      dateKeyPattern.test(periodStartOn) &&
      isPositiveAmount(amountMinor)
      ? [{ periodStartOn, amountMinor }]
      : [];
  });
}

export function parseBudgetOverrides(
  json: string | null | undefined,
): BudgetOverride[] {
  return normalizeBudgetOverrides(parseJsonArray(json));
}

/** Tramos con la forma de SQLite y del sync: periodicidad aplanada. */
export function normalizeBudgetHistory(
  value: unknown,
): BudgetScheduleSegment[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((entry: unknown) => {
      if (typeof entry !== 'object' || entry === null) return [];
      const { endsOn, amountMinor, period, intervalDays, anchorOn } =
        entry as Record<string, unknown>;
      if (
        typeof endsOn !== 'string' ||
        !dateKeyPattern.test(endsOn) ||
        !isPositiveAmount(amountMinor)
      ) {
        return [];
      }
      return [
        {
          endsOn,
          amountMinor,
          schedule: normalizeBudgetSchedule(period, intervalDays, anchorOn) ?? {
            period: 'month' as const,
          },
        },
      ];
    })
    .sort((left, right) => left.endsOn.localeCompare(right.endsOn));
}

export function parseBudgetHistory(
  json: string | null | undefined,
): BudgetScheduleSegment[] {
  return normalizeBudgetHistory(parseJsonArray(json));
}

export function flattenBudgetSchedule(schedule: BudgetSchedule) {
  return {
    period: schedule.period,
    intervalDays: schedule.period === 'custom' ? schedule.intervalDays : null,
    anchorOn: schedule.period === 'custom' ? schedule.anchorOn : null,
  };
}

export function serializeBudgetHistory(
  history: readonly BudgetScheduleSegment[] | undefined,
): string {
  return JSON.stringify(
    (history ?? []).map(({ endsOn, amountMinor, schedule }) => ({
      endsOn,
      amountMinor,
      ...flattenBudgetSchedule(schedule),
    })),
  );
}
