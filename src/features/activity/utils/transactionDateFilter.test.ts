import {
  getPreviousDateFilter,
  matchesTransactionDateFilter,
} from '@/features/activity/utils/transactionDateFilter';

const thursday = new Date('2026-07-30T12:00:00');

describe('matchesTransactionDateFilter', () => {
  it('acepta cualquier fecha cuando no hay filtro', () => {
    expect(matchesTransactionDateFilter('2024-01-01', 'all')).toBe(true);
  });

  it('filtra un rango de fechas personalizado incluyendo sus extremos', () => {
    const filter = {
      period: 'custom' as const,
      startDate: '2026-07-20',
      endDate: '2026-07-30',
    };

    expect(matchesTransactionDateFilter('2026-07-19', filter)).toBe(false);
    expect(matchesTransactionDateFilter('2026-07-20', filter)).toBe(true);
    expect(matchesTransactionDateFilter('2026-07-30', filter)).toBe(true);
    expect(matchesTransactionDateFilter('2026-07-31', filter)).toBe(false);
  });

  it('considera el mismo periodo semanal del reporte compartido', () => {
    const filter = { period: 'week', selectedDate: thursday } as const;
    expect(matchesTransactionDateFilter('2026-07-27', filter)).toBe(true);
    expect(matchesTransactionDateFilter('2026-08-02', filter)).toBe(true);
    expect(matchesTransactionDateFilter('2026-08-03', filter)).toBe(false);
  });

  it('incluye el mes seleccionado completo', () => {
    const filter = { period: 'month', selectedDate: thursday } as const;
    expect(matchesTransactionDateFilter('2026-07-01', filter)).toBe(true);
    expect(matchesTransactionDateFilter('2026-07-31', filter)).toBe(true);
    expect(matchesTransactionDateFilter('2026-08-01', filter)).toBe(false);
  });
});

describe('getPreviousDateFilter', () => {
  it('no tiene periodo anterior cuando no hay filtro', () => {
    expect(getPreviousDateFilter('all')).toBeNull();
  });

  it('desplaza un mes al mes anterior', () => {
    const filter = { period: 'month', selectedDate: thursday } as const;
    const previous = getPreviousDateFilter(filter);

    expect(previous && previous !== 'all' && previous.period).toBe('month');
    expect(
      previous &&
        previous !== 'all' &&
        previous.period !== 'custom' &&
        previous.selectedDate.getMonth(),
    ).toBe(5);
  });

  it('desplaza un rango personalizado a un tramo anterior de la misma duración', () => {
    const filter = {
      period: 'custom' as const,
      startDate: '2026-07-20',
      endDate: '2026-07-30',
    };
    const previous = getPreviousDateFilter(filter);

    expect(previous).toEqual({
      period: 'custom',
      startDate: '2026-07-09',
      endDate: '2026-07-19',
    });
  });
});
