import { calculatePeriodComparison } from '@/features/transactions/utils/periodComparison';

describe('calculatePeriodComparison', () => {
  it('calcula un incremento porcentual', () => {
    expect(calculatePeriodComparison(1200, 1000)).toEqual({
      changePercent: 20,
      direction: 'up',
    });
  });

  it('calcula una disminución porcentual', () => {
    expect(calculatePeriodComparison(800, 1000)).toEqual({
      changePercent: -20,
      direction: 'down',
    });
  });

  it('no hay nada que comparar cuando el periodo anterior no tuvo actividad', () => {
    expect(calculatePeriodComparison(0, 0)).toBeNull();
    expect(calculatePeriodComparison(500, 0)).toBeNull();
  });

  it('usa el valor absoluto del periodo anterior negativo como base', () => {
    expect(calculatePeriodComparison(-50, -100)).toEqual({
      changePercent: 50,
      direction: 'up',
    });
  });

  it('no reporta cambio cuando el porcentaje calculado es cero', () => {
    expect(calculatePeriodComparison(1000, 1000)).toEqual({
      changePercent: 0,
      direction: 'flat',
    });
  });
});
