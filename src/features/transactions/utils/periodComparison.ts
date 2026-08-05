export type ComparisonDirection = 'down' | 'flat' | 'up';

export type PeriodComparisonResult = {
  changePercent: number;
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

  const changePercent =
    ((currentMinor - previousMinor) / Math.abs(previousMinor)) * 100;
  const direction: ComparisonDirection =
    changePercent === 0 ? 'flat' : changePercent > 0 ? 'up' : 'down';

  return { changePercent, direction };
}
