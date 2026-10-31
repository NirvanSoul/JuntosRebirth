import type { Category } from '@/features/categories/types';
import {
  buildUpcomingNotices,
  groupNoticeThreads,
} from '@/features/notifications/utils/upcomingNotices';
import type { SessionTransaction } from '@/features/transactions/types';

const rent: SessionTransaction = {
  id: 'rent-october',
  createdBy: 'user-test',
  spaceId: 'personal',
  categoryId: 'home',
  type: 'expense',
  amountMinor: 80_000,
  currency: 'EUR',
  title: 'Alquiler',
  occurredOn: '2026-10-29',
  recurrence: 'monthly',
  nextOccurrenceOn: '2026-11-29',
  recurrenceSeriesId: 'rent-series',
  recurrenceStartsOn: '2026-10-29',
  updatedAt: '2026-10-01T12:00:00.000Z',
};

const home = {
  id: 'home',
  spaceId: 'personal',
  name: 'Casa',
  icon: 'home',
  colorToken: 'blue',
} as unknown as Category;

describe('buildUpcomingNotices', () => {
  it('avisa dos días y un día antes de la siguiente ocurrencia de una serie', () => {
    const twoDaysBefore = buildUpcomingNotices({
      categories: [home],
      today: '2026-11-27',
      transactions: [rent],
    });
    const oneDayBefore = buildUpcomingNotices({
      categories: [home],
      today: '2026-11-28',
      transactions: [rent],
    });

    expect(twoDaysBefore).toHaveLength(1);
    expect(twoDaysBefore[0]).toMatchObject({
      category: home,
      daysUntil: 2,
      transaction: { occurredOn: '2026-11-29', title: 'Alquiler' },
    });
    expect(oneDayBefore[0]?.daysUntil).toBe(1);
    // Cada día genera un aviso nuevo, aunque el anterior ya se viera.
    expect(oneDayBefore[0]?.key).not.toBe(twoDaysBefore[0]?.key);
  });

  it('lista los movimientos de la semana y del mes con los días que faltan', () => {
    const inAWeek = buildUpcomingNotices({
      categories: [],
      today: '2026-11-22',
      transactions: [rent],
    });
    const inAMonth = buildUpcomingNotices({
      categories: [],
      today: '2026-10-30',
      transactions: [rent],
    });

    expect(inAWeek.map((notice) => notice.daysUntil)).toEqual([7]);
    expect(inAMonth.map((notice) => notice.daysUntil)).toEqual([30]);
  });

  it('no avisa más allá de 30 días ni el mismo día del movimiento', () => {
    const dinner: SessionTransaction = {
      ...rent,
      id: 'dinner',
      occurredOn: '2026-11-29',
      recurrence: 'once',
      nextOccurrenceOn: undefined,
      recurrenceSeriesId: undefined,
      recurrenceStartsOn: undefined,
    };
    for (const today of ['2026-10-29', '2026-11-29']) {
      expect(
        buildUpcomingNotices({ categories: [], today, transactions: [dinner] }),
      ).toEqual([]);
    }
  });

  it('incluye movimientos únicos guardados con fecha futura, ordenados por fecha', () => {
    const salary: SessionTransaction = {
      ...rent,
      id: 'salary',
      categoryId: 'salary',
      type: 'income',
      title: 'Nómina',
      occurredOn: '2026-11-28',
      recurrence: 'once',
      nextOccurrenceOn: undefined,
      recurrenceSeriesId: undefined,
      recurrenceStartsOn: undefined,
    };

    const notices = buildUpcomingNotices({
      categories: [home],
      today: '2026-11-27',
      transactions: [rent, salary],
    });

    expect(notices.map((notice) => notice.transaction.title)).toEqual([
      'Nómina',
      'Alquiler',
    ]);
    expect(notices[0]).toMatchObject({ category: null, daysUntil: 1 });
  });

  it('agrupa en un hilo el mismo movimiento copiado a otro espacio, con Personal arriba', () => {
    const coupleRent: SessionTransaction = {
      ...rent,
      id: 'rent-couple',
      spaceId: 'juntos',
      recurrenceSeriesId: 'rent-couple-series',
      sourceTransactionId: rent.id,
    };
    const groceries: SessionTransaction = {
      ...rent,
      id: 'groceries',
      title: 'Compra',
      recurrence: 'once',
      occurredOn: '2026-11-29',
      nextOccurrenceOn: undefined,
      recurrenceSeriesId: undefined,
    };

    const notices = buildUpcomingNotices({
      categories: [],
      today: '2026-11-28',
      transactions: [coupleRent, rent, groceries],
    });
    const threads = groupNoticeThreads(notices, ['personal', 'juntos']);

    expect(
      threads.map((thread) =>
        thread.map(({ transaction }) => transaction.spaceId),
      ),
    ).toEqual([['personal', 'juntos'], ['personal']]);
    expect(threads[0]![0]!.transaction.title).toBe('Alquiler');
  });
});
