import {
  calculatePeriodComparison,
  describeComparisonDirection,
} from '@/features/transactions/utils/periodComparison';

describe('calculatePeriodComparison', () => {
  it('calcula la diferencia exacta de un incremento', () => {
    expect(calculatePeriodComparison(1200, 1000)).toEqual({
      changeMinor: 200,
      direction: 'up',
    });
  });

  it('calcula la diferencia exacta de una disminución', () => {
    expect(calculatePeriodComparison(800, 1000)).toEqual({
      changeMinor: -200,
      direction: 'down',
    });
  });

  it('no hay nada que comparar cuando el periodo anterior no tuvo actividad', () => {
    expect(calculatePeriodComparison(0, 0)).toBeNull();
    expect(calculatePeriodComparison(500, 0)).toBeNull();
  });

  it('resta el periodo anterior negativo', () => {
    expect(calculatePeriodComparison(-50, -100)).toEqual({
      changeMinor: 50,
      direction: 'up',
    });
  });

  it('no reporta cambio cuando la diferencia es cero', () => {
    expect(calculatePeriodComparison(1000, 1000)).toEqual({
      changeMinor: 0,
      direction: 'flat',
    });
  });

  it('describe la dirección respecto al periodo anterior', () => {
    expect(describeComparisonDirection('down', 'el mes anterior')).toBe(
      'menos que el mes anterior',
    );
    expect(describeComparisonDirection('up', 'la semana anterior')).toBe(
      'más que la semana anterior',
    );
    expect(describeComparisonDirection('flat', 'el año anterior')).toBe(
      'igual que el año anterior',
    );
  });
});
