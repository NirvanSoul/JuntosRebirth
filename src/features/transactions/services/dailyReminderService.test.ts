import {
  hasLoggedTransactionToday,
  reconcileDailyReminder,
} from '@/features/transactions/services/dailyReminderService';
import type { SessionTransaction } from '@/features/transactions/types';

const mockGetDailyReminderSchedule = jest.fn();
const mockSaveDailyReminderSchedule = jest.fn();
const mockClearDailyReminderSchedule = jest.fn();

jest.mock(
  '@/features/transactions/repositories/dailyReminderScheduleRepository',
  () => ({
    getDailyReminderSchedule: (...args: unknown[]) =>
      mockGetDailyReminderSchedule(...args),
    saveDailyReminderSchedule: (...args: unknown[]) =>
      mockSaveDailyReminderSchedule(...args),
    clearDailyReminderSchedule: (...args: unknown[]) =>
      mockClearDailyReminderSchedule(...args),
  }),
);

const mockBuildNotificationContent = jest.fn();

jest.mock(
  '@/features/transactions/services/notificationTemplateService',
  () => ({
    buildNotificationContent: (...args: unknown[]) =>
      mockBuildNotificationContent(...args),
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

function buildTransaction(
  overrides: Partial<SessionTransaction> = {},
): SessionTransaction {
  return {
    id: 'tx-1',
    spaceId: 'personal',
    type: 'expense',
    amountMinor: 1000,
    currency: 'EUR',
    title: 'Café',
    categoryId: 'category-1',
    occurredOn: '2026-08-10',
    recurrence: 'once',
    updatedAt: '2026-08-10T09:00:00.000Z',
    ...overrides,
  };
}

describe('hasLoggedTransactionToday', () => {
  it('es verdadero cuando algún movimiento se actualizó hoy', () => {
    const transactions = [
      buildTransaction({ updatedAt: '2026-08-10T09:00:00.000Z' }),
    ];
    expect(hasLoggedTransactionToday(transactions, '2026-08-10')).toBe(true);
  });

  it('es falso cuando ningún movimiento se actualizó hoy', () => {
    const transactions = [
      buildTransaction({ updatedAt: '2026-08-09T09:00:00.000Z' }),
    ];
    expect(hasLoggedTransactionToday(transactions, '2026-08-10')).toBe(false);
  });
});

describe('reconcileDailyReminder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-08-10T08:00:00'));
    mockGetDailyReminderSchedule.mockResolvedValue(null);
    mockRequestNotificationPermission.mockResolvedValue(true);
    mockScheduleLocalNotification.mockResolvedValue('daily-notif-1');
    mockBuildNotificationContent.mockResolvedValue({
      title: 'Un minuto para organizarte',
      body: 'Registra lo de hoy antes de que se te olvide.',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('cancela cualquier aviso previo antes de reprogramar', async () => {
    mockGetDailyReminderSchedule.mockResolvedValue({
      notificationId: 'stale-notif',
      scheduledOn: '2026-08-09',
    });

    await reconcileDailyReminder({ transactions: [] });

    expect(mockCancelLocalNotification).toHaveBeenCalledWith('stale-notif');
    expect(mockClearDailyReminderSchedule).toHaveBeenCalled();
  });

  it('programa siempre el aviso de hoy cuando la hora no pasó y no se registró nada', async () => {
    await reconcileDailyReminder({ transactions: [] });

    expect(mockScheduleLocalNotification).toHaveBeenCalledTimes(1);
    expect(mockScheduleLocalNotification).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'dailyEngagement' }),
    );
    expect(mockSaveDailyReminderSchedule).toHaveBeenCalledWith({
      notificationId: 'daily-notif-1',
      scheduledOn: '2026-08-10',
    });
  });

  it('programa el aviso de mañana si la hora de hoy ya pasó', async () => {
    jest.setSystemTime(new Date('2026-08-10T21:00:00'));

    await reconcileDailyReminder({ transactions: [] });

    expect(mockSaveDailyReminderSchedule).toHaveBeenCalledWith({
      notificationId: 'daily-notif-1',
      scheduledOn: '2026-08-11',
    });
  });

  it('programa el aviso de mañana si ya se registró un movimiento hoy', async () => {
    const transactions = [
      buildTransaction({ updatedAt: '2026-08-10T07:30:00.000Z' }),
    ];

    await reconcileDailyReminder({ transactions });

    expect(mockSaveDailyReminderSchedule).toHaveBeenCalledWith({
      notificationId: 'daily-notif-1',
      scheduledOn: '2026-08-11',
    });
  });

  it('no programa nada si el permiso de notificaciones no fue concedido', async () => {
    mockRequestNotificationPermission.mockResolvedValue(false);

    await reconcileDailyReminder({ transactions: [] });

    expect(mockScheduleLocalNotification).not.toHaveBeenCalled();
    expect(mockSaveDailyReminderSchedule).not.toHaveBeenCalled();
  });
});
