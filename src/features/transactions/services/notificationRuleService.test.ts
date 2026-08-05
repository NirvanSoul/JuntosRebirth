import type { Category } from '@/features/categories/types';
import {
  maxPendingLocalNotifications,
  reconcileNotificationRules,
} from '@/features/transactions/services/notificationRuleService';
import type {
  SessionTransaction,
  TransactionNotificationRule,
} from '@/features/transactions/types';

const mockListLocalNotificationRules = jest.fn();

jest.mock(
  '@/features/transactions/repositories/localTransactionNotificationRuleRepository',
  () => ({
    listLocalNotificationRules: (...args: unknown[]) =>
      mockListLocalNotificationRules(...args),
  }),
);

const mockListSchedulesForRule = jest.fn();
const mockReplaceSchedulesForRule = jest.fn();

jest.mock(
  '@/features/transactions/repositories/localNotificationRuleScheduleRepository',
  () => ({
    listSchedulesForRule: (...args: unknown[]) =>
      mockListSchedulesForRule(...args),
    replaceSchedulesForRule: (...args: unknown[]) =>
      mockReplaceSchedulesForRule(...args),
  }),
);

const mockListLocalTransactionReminders = jest.fn();

jest.mock(
  '@/features/transactions/repositories/localTransactionReminderRepository',
  () => ({
    listLocalTransactionReminders: (...args: unknown[]) =>
      mockListLocalTransactionReminders(...args),
  }),
);

const mockRequestNotificationPermission = jest.fn();
const mockScheduleLocalNotification = jest.fn();
const mockCancelLocalNotification = jest.fn();

jest.mock('@/lib/notifications/localNotifications', () => ({
  requestNotificationPermission: (...args: unknown[]) =>
    mockRequestNotificationPermission(...args),
  scheduleLocalNotification: (...args: unknown[]) =>
    mockScheduleLocalNotification(...args),
  cancelLocalNotification: (...args: unknown[]) =>
    mockCancelLocalNotification(...args),
}));

const mockBuildNotificationContent = jest.fn();

jest.mock(
  '@/features/transactions/services/notificationTemplateService',
  () => ({
    buildNotificationContent: (...args: unknown[]) =>
      mockBuildNotificationContent(...args),
  }),
);

const categories: readonly Category[] = [];

function buildRule(
  overrides: Partial<TransactionNotificationRule> = {},
): TransactionNotificationRule {
  return {
    id: 'rule-expense-personal',
    spaceId: 'personal',
    transactionType: 'expense',
    isEnabled: true,
    daysBefore: 1,
    times: ['09:00'],
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildTransaction(
  overrides: Partial<SessionTransaction> = {},
): SessionTransaction {
  return {
    id: 'tx-1',
    spaceId: 'personal',
    type: 'expense',
    amountMinor: 4500,
    currency: 'EUR',
    title: 'Alquiler',
    categoryId: 'category-1',
    occurredOn: '2026-08-05',
    recurrence: 'once',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('reconcileNotificationRules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-08-04T08:00:00'));
    mockListSchedulesForRule.mockResolvedValue([]);
    mockListLocalTransactionReminders.mockResolvedValue([]);
    mockRequestNotificationPermission.mockResolvedValue(true);
    mockScheduleLocalNotification.mockImplementation(async () => 'notif-1');
    mockReplaceSchedulesForRule.mockResolvedValue(undefined);
    mockBuildNotificationContent.mockResolvedValue({
      title: 'Recordatorio: Alquiler',
      body: 'Gasto de 45 €',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('no hace nada cuando no existe ninguna regla', async () => {
    mockListLocalNotificationRules.mockResolvedValue([]);

    await reconcileNotificationRules({ categories, transactions: [] });

    expect(mockRequestNotificationPermission).not.toHaveBeenCalled();
    expect(mockReplaceSchedulesForRule).not.toHaveBeenCalled();
  });

  it('programa una notificación el día indicado por days_before', async () => {
    mockListLocalNotificationRules.mockResolvedValue([buildRule()]);
    const transaction = buildTransaction({ occurredOn: '2026-08-05' });

    await reconcileNotificationRules({
      categories,
      transactions: [transaction],
    });

    expect(mockScheduleLocalNotification).toHaveBeenCalledTimes(1);
    expect(mockReplaceSchedulesForRule).toHaveBeenCalledWith(
      'rule-expense-personal',
      'personal',
      [
        expect.objectContaining({
          occurrenceKey: 'tx-1',
          occurredOn: '2026-08-05',
          remindOn: '2026-08-04',
          notificationIds: ['notif-1'],
        }),
      ],
    );
  });

  it('incluye ocurrencias proyectadas de series recurrentes dentro de la ventana', async () => {
    mockListLocalNotificationRules.mockResolvedValue([buildRule()]);
    const series = buildTransaction({
      id: 'tx-series-1',
      occurredOn: '2026-08-04',
      recurrence: 'weekly',
      recurrenceSeriesId: 'series-1',
      nextOccurrenceOn: '2026-08-11',
    });

    await reconcileNotificationRules({ categories, transactions: [series] });

    const scheduledKeys = mockReplaceSchedulesForRule.mock.calls[0]?.[2].map(
      (entry: { occurrenceKey: string }) => entry.occurrenceKey,
    );
    expect(scheduledKeys).toContain('projected-occurrence:series-1:2026-08-11');
  });

  it('no duplica un aviso sobre un movimiento con recordatorio manual', async () => {
    mockListLocalNotificationRules.mockResolvedValue([buildRule()]);
    mockListLocalTransactionReminders.mockResolvedValue([
      {
        id: 'reminder-1',
        transactionId: 'tx-1',
        spaceId: 'personal',
        remindOn: '2026-08-04',
        times: ['09:00'],
        notificationIds: ['manual-notif'],
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
    ]);
    const transaction = buildTransaction({ occurredOn: '2026-08-05' });

    await reconcileNotificationRules({
      categories,
      transactions: [transaction],
    });

    expect(mockScheduleLocalNotification).not.toHaveBeenCalled();
    expect(mockReplaceSchedulesForRule).toHaveBeenCalledWith(
      'rule-expense-personal',
      'personal',
      [],
    );
  });

  it('respeta el presupuesto compartido con los recordatorios manuales', async () => {
    mockListLocalNotificationRules.mockResolvedValue([buildRule()]);
    mockListLocalTransactionReminders.mockResolvedValue([
      {
        id: 'reminder-1',
        transactionId: 'tx-other',
        spaceId: 'personal',
        remindOn: '2026-08-04',
        times: [],
        notificationIds: Array.from(
          { length: maxPendingLocalNotifications - 1 },
          (_unused, index) => `manual-${index}`,
        ),
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
    ]);
    const first = buildTransaction({
      id: 'tx-first',
      occurredOn: '2026-08-05',
    });
    const second = buildTransaction({
      id: 'tx-second',
      occurredOn: '2026-08-06',
    });

    await reconcileNotificationRules({
      categories,
      transactions: [first, second],
    });

    expect(mockScheduleLocalNotification).toHaveBeenCalledTimes(1);
    const scheduledKeys = mockReplaceSchedulesForRule.mock.calls[0]?.[2].map(
      (entry: { occurrenceKey: string }) => entry.occurrenceKey,
    );
    expect(scheduledKeys).toEqual(['tx-first']);
  });

  it('cancela y limpia el schedule de una regla desactivada', async () => {
    mockListLocalNotificationRules.mockResolvedValue([
      buildRule({ isEnabled: false }),
    ]);
    mockListSchedulesForRule.mockResolvedValue([
      { notificationIds: ['stale-notif'] },
    ]);

    await reconcileNotificationRules({ categories, transactions: [] });

    expect(mockCancelLocalNotification.mock.calls[0]?.[0]).toBe('stale-notif');
    expect(mockReplaceSchedulesForRule).toHaveBeenCalledWith(
      'rule-expense-personal',
      'personal',
      [],
    );
  });

  it('no programa nada fuera de la ventana móvil de reconciliación', async () => {
    mockListLocalNotificationRules.mockResolvedValue([buildRule()]);
    const farTransaction = buildTransaction({ occurredOn: '2026-09-01' });

    await reconcileNotificationRules({
      categories,
      transactions: [farTransaction],
    });

    expect(mockScheduleLocalNotification).not.toHaveBeenCalled();
    expect(mockReplaceSchedulesForRule).toHaveBeenCalledWith(
      'rule-expense-personal',
      'personal',
      [],
    );
  });
});
