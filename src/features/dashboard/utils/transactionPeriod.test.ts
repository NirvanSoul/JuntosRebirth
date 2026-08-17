import {
  formatTransactionPeriod,
  getPreviousPeriodTransactions,
  listTransactionsByPeriod,
  shiftTransactionPeriod,
} from '@/features/dashboard/utils/transactionPeriod';
import type { SessionTransaction } from '@/features/transactions/types';

function transaction(id: string, occurredOn: string): SessionTransaction {
  return {
    id,
    createdBy: 'install-test',
    spaceId: 'personal',
    categoryId: 'salary',
    type: 'income',
    amountMinor: 50_000,
    currency: 'EUR',
    title: id,
    occurredOn,
    recurrence: 'once',
    updatedAt: `${occurredOn}T12:00:00.000Z`,
  };
}

const transactions = [
  transaction('previous-year', '2025-12-31'),
  transaction('year', '2026-01-10'),
  transaction('previous-fortnight', '2026-07-15'),
  transaction('fortnight', '2026-07-16'),
  transaction('week', '2026-07-27'),
  transaction('today', '2026-07-29'),
  transaction('current-month-end', '2026-07-31'),
  transaction('next-month', '2026-08-01'),
  transaction('future', '2026-11-01'),
];
const referenceDate = new Date(2026, 6, 29, 12);

describe('periodos de movimientos', () => {
  it('usa periodos de calendario hasta el final del mes actual', () => {
    expect(
      listTransactionsByPeriod(transactions, 'week', referenceDate).map(
        ({ id }) => id,
      ),
    ).toEqual(['next-month', 'current-month-end', 'today', 'week']);
    expect(
      listTransactionsByPeriod(transactions, 'fortnight', referenceDate).map(
        ({ id }) => id,
      ),
    ).toEqual(['current-month-end', 'today', 'week', 'fortnight']);
    expect(
      listTransactionsByPeriod(transactions, 'month', referenceDate).map(
        ({ id }) => id,
      ),
    ).toEqual([
      'current-month-end',
      'today',
      'week',
      'fortnight',
      'previous-fortnight',
    ]);
    expect(
      listTransactionsByPeriod(transactions, 'year', referenceDate).map(
        ({ id }) => id,
      ),
    ).toEqual([
      'future',
      'next-month',
      'current-month-end',
      'today',
      'week',
      'fortnight',
      'previous-fortnight',
      'year',
    ]);
  });

  it('desplaza y describe cada periodo seleccionado', () => {
    expect(formatTransactionPeriod('month', referenceDate)).toBe('Julio 2026');
    expect(formatTransactionPeriod('week', referenceDate)).toBe(
      '27 jul – 2 ago 2026',
    );
    expect(formatTransactionPeriod('fortnight', referenceDate)).toBe(
      '16–31 julio 2026',
    );
    expect(formatTransactionPeriod('year', referenceDate)).toBe('2026');

    expect(
      formatTransactionPeriod(
        'fortnight',
        shiftTransactionPeriod('fortnight', referenceDate, -1),
      ),
    ).toBe('1–15 julio 2026');
    expect(
      formatTransactionPeriod(
        'fortnight',
        shiftTransactionPeriod('fortnight', referenceDate, 1),
      ),
    ).toBe('1–15 agosto 2026');
  });

  it('obtiene los movimientos del periodo inmediatamente anterior', () => {
    expect(
      getPreviousPeriodTransactions(
        transactions,
        'fortnight',
        referenceDate,
      ).map(({ id }) => id),
    ).toEqual(['previous-fortnight']);
  });

  it('proyecta una recurrencia mensual en periodos futuros', () => {
    const recurringIncome: SessionTransaction = {
      ...transaction('salary-series-source', '2026-08-05'),
      recurrence: 'monthly',
      recurrenceSeriesId: 'salary-series',
      recurrenceStartsOn: '2026-08-05',
      nextOccurrenceOn: '2026-09-05',
    };

    expect(
      listTransactionsByPeriod(
        [recurringIncome],
        'month',
        new Date(2026, 8, 1, 12),
      ).map(({ occurredOn }) => occurredOn),
    ).toEqual(['2026-09-05']);
    expect(
      listTransactionsByPeriod(
        [recurringIncome],
        'month',
        new Date(2026, 9, 1, 12),
      ).map(({ occurredOn }) => occurredOn),
    ).toEqual(['2026-10-05']);
  });
});
