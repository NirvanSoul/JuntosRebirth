export type ComparisonDirection = 'down' | 'flat' | 'up';

export type PeriodComparisonResult = {
  /** Diferencia exacta en unidades menores: actual menos anterior. */
  changeMinor: number;
  direction: ComparisonDirection;
};

/**
 * `null` cuando el periodo anterior no tiene actividad (p. ej. el primer mes
 * de uso): no hay base con la que comparar, así que no debe mostrarse nada.
 */
export function calculatePeriodComparison(
  currentMinor: number,
  previousMinor: number,
): PeriodComparisonResult | null {
  if (previousMinor === 0) {
    return null;
  }

  const changeMinor = currentMinor - previousMinor;
  const direction: ComparisonDirection =
    changeMinor === 0 ? 'flat' : changeMinor > 0 ? 'up' : 'down';

  return { changeMinor, direction };
}

/** «menos que el mes anterior»: completa el importe de la diferencia. */
export function describeComparisonDirection(
  direction: ComparisonDirection,
  previousPeriod: string,
): string {
  if (direction === 'flat') return `igual que ${previousPeriod}`;
  return `${direction === 'up' ? 'más' : 'menos'} que ${previousPeriod}`;
}

type ComparableTotals = {
  balanceMinor: number;
  expenseMinor: number;
  incomeMinor: number;
};

/** Compara ingresos, gastos y balance; sin periodo anterior no hay nada. */
export function compareTransactionTotals(
  current: ComparableTotals,
  previous: ComparableTotals | null,
): Partial<Record<'balance' | 'expense' | 'income', PeriodComparisonResult>> {
  if (!previous) return {};

  return {
    balance:
      calculatePeriodComparison(current.balanceMinor, previous.balanceMinor) ??
      undefined,
    expense:
      calculatePeriodComparison(current.expenseMinor, previous.expenseMinor) ??
      undefined,
    income:
      calculatePeriodComparison(current.incomeMinor, previous.incomeMinor) ??
      undefined,
  };
}
