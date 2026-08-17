import {
  createProjectedTransactionId,
  getRecurrenceOccurrenceDate,
  getUpcomingTransactionDates,
  normalizeCustomOccurrenceDates,
  parseProjectedTransactionId,
  projectRecurringTransactions,
} from '@/features/transactions/utils/transactionRecurrence';
import type { SessionTransaction } from '@/features/transactions/types';

describe('transactionRecurrence', () => {
  it('repite la recurrencia quincenal cada quince días', () => {
    expect(getRecurrenceOccurrenceDate('2026-07-03', 'biweekly', 1)).toBe(
      '2026-07-18',
    );
    expect(getRecurrenceOccurrenceDate('2026-07-03', 'biweekly', 2)).toBe(
      '2026-08-02',
    );
  });

  it('conserva el día mensual cuando existe y usa el último día si no', () => {
    expect(getRecurrenceOccurrenceDate('2026-01-31', 'monthly', 1)).toBe(
      '2026-02-28',
    );
    expect(getRecurrenceOccurrenceDate('2026-01-31', 'monthly', 2)).toBe(
      '2026-03-31',
    );
  });

  it('ordena y elimina fechas personalizadas duplicadas', () => {
    expect(
      normalizeCustomOccurrenceDates([
        '2026-08-20',
        '2026-08-05',
        '2026-08-20',
      ]),
    ).toEqual(['2026-08-05', '2026-08-20']);
  });

  it('proyecta una serie mensual desde su fecha original sin degradar el día', () => {
    const transaction: SessionTransaction = {
      id: 'monthly',
      createdBy: 'install-test',
      spaceId: 'personal',
      categoryId: 'home',
      type: 'expense',
      amountMinor: 1000,
      currency: 'EUR',
      title: 'Alquiler',
      occurredOn: '2026-02-28',
      recurrence: 'monthly',
      nextOccurrenceOn: '2026-03-31',
      recurrenceSeriesId: 'monthly-series',
      recurrenceStartsOn: '2026-01-31',
      updatedAt: '2026-02-28T12:00:00.000Z',
    };

    expect(
      getUpcomingTransactionDates({
        count: 5,
        today: '2026-03-01',
        transaction,
        transactions: [transaction],
      }),
    ).toEqual([
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
      '2026-06-30',
      '2026-07-31',
    ]);
  });

  it('limita las fechas personalizadas a las que todavía no ocurrieron', () => {
    const transactions = ['2026-07-01', '2026-09-03', '2026-10-08'].map(
      (occurredOn, index): SessionTransaction => ({
        id: `custom-${index}`,
        createdBy: 'install-test',
        spaceId: 'personal',
        categoryId: 'home',
        type: 'expense',
        amountMinor: 1000,
        currency: 'EUR',
        title: 'Pago',
        occurredOn,
        recurrence: 'custom',
        recurrenceGroupId: 'custom-group',
        updatedAt: `${occurredOn}T12:00:00.000Z`,
      }),
    );

    expect(
      getUpcomingTransactionDates({
        count: 5,
        today: '2026-08-02',
        transaction: transactions[0]!,
        transactions,
      }),
    ).toEqual(['2026-09-03', '2026-10-08']);
  });

  it('proyecta una serie abierta solo dentro del rango solicitado', () => {
    const transaction: SessionTransaction = {
      id: 'salary-source',
      createdBy: 'install-test',
      spaceId: 'personal',
      categoryId: 'salary',
      type: 'income',
      amountMinor: 250_000,
      currency: 'EUR',
      title: 'Nómina',
      occurredOn: '2026-08-05',
      recurrence: 'monthly',
      nextOccurrenceOn: '2026-09-05',
      recurrenceSeriesId: 'salary-series',
      recurrenceStartsOn: '2026-08-05',
      updatedAt: '2026-08-05T12:00:00.000Z',
    };

    const projected = projectRecurringTransactions({
      transactions: [transaction],
      startOn: '2026-09-01',
      endOn: '2026-10-31',
    });

    expect(projected.map(({ occurredOn }) => occurredOn)).toEqual([
      '2026-10-05',
      '2026-09-05',
      '2026-08-05',
    ]);
    expect(projected.slice(0, 2).map(({ id }) => id)).toEqual([
      createProjectedTransactionId('salary-series', '2026-10-05'),
      createProjectedTransactionId('salary-series', '2026-09-05'),
    ]);
    expect(parseProjectedTransactionId(projected[0]!.id)).toEqual({
      occurredOn: '2026-10-05',
      seriesId: 'salary-series',
    });
  });
});
