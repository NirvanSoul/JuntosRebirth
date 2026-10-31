import type { RemoteAccountCategory } from '@/features/sync/gateways/juntossRemoteAccountGateway';
import { applyRemoteCategoryBudgets } from '@/features/sync/services/remoteCategoryBudgets';
import type { LocalSqlExecutor } from '@/lib/storage/localSqlExecutor';

describe('applyRemoteCategoryBudgets', () => {
  it('sustituye los presupuestos locales por los remotos, uno por moneda', async () => {
    const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
    const executor = { runAsync } as unknown as LocalSqlExecutor;
    const category = {
      remoteId: 'cat-1',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-02T00:00:00.000Z',
      budgets: [
        {
          currency: 'EUR',
          budgetMinor: 5000,
          schedule: { period: 'week' },
          overrides: [],
          history: [],
        },
        {
          currency: 'VES',
          budgetMinor: 90000,
          overrides: [{ periodStartOn: '2026-07-01', amountMinor: 95000 }],
          history: [],
        },
      ],
    } as unknown as RemoteAccountCategory;

    await applyRemoteCategoryBudgets(executor, 'food', category);

    expect(runAsync).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('DELETE FROM category_budgets'),
      'food',
    );
    expect(runAsync).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO category_budgets'),
      'food:EUR',
      'food',
      'EUR',
      5000,
      'week',
      null,
      null,
      '[]',
      '[]',
      'synced',
      '2026-08-01T00:00:00.000Z',
      '2026-08-02T00:00:00.000Z',
    );
    expect(runAsync).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO category_budgets'),
      'food:VES',
      'food',
      'VES',
      90000,
      'month',
      null,
      null,
      '[{"periodStartOn":"2026-07-01","amountMinor":95000}]',
      '[]',
      'synced',
      '2026-08-01T00:00:00.000Z',
      '2026-08-02T00:00:00.000Z',
    );
  });
});
