import {
  cancelTransactionReminder,
  scheduleTransactionReminder,
} from '@/features/transactions/services/transactionReminderService';

const mockGetLocalTransactionReminder = jest.fn();
const mockSaveLocalTransactionReminder = jest.fn();
const mockDeleteLocalTransactionReminder = jest.fn();

jest.mock(
  '@/features/transactions/repositories/localTransactionReminderRepository',
  () => ({
    getLocalTransactionReminder: (...args: unknown[]) =>
      mockGetLocalTransactionReminder(...args),
    saveLocalTransactionReminder: (...args: unknown[]) =>
      mockSaveLocalTransactionReminder(...args),
    deleteLocalTransactionReminder: (...args: unknown[]) =>
      mockDeleteLocalTransactionReminder(...args),
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

const transaction = {
  amountMinor: 4500,
  currency: 'EUR' as const,
  id: 'transaction-1',
  title: 'Alquiler',
  type: 'expense' as const,
};

describe('scheduleTransactionReminder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-08-04T08:00:00'));
    mockRequestNotificationPermission.mockResolvedValue(true);
    mockGetLocalTransactionReminder.mockResolvedValue(null);
    mockScheduleLocalNotification.mockResolvedValue('notif-1');
    mockBuildNotificationContent.mockResolvedValue({
      title: 'Recordatorio: Alquiler',
      body: 'Gasto de 45 €',
    });
    mockSaveLocalTransactionReminder.mockImplementation(async (input) => ({
      id: 'reminder-1',
      createdAt: '2026-08-04T08:00:00.000Z',
      updatedAt: '2026-08-04T08:00:00.000Z',
      ...input,
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('rechaza una fecha inválida', async () => {
    await expect(
      scheduleTransactionReminder({
        remindOn: '2026-13-40',
        spaceId: 'personal',
        times: ['09:00'],
        transaction,
      }),
    ).rejects.toThrow('El recordatorio no es válido');
    expect(mockRequestNotificationPermission).not.toHaveBeenCalled();
  });

  it('rechaza más horas que el máximo permitido por día', async () => {
    await expect(
      scheduleTransactionReminder({
        remindOn: '2026-08-10',
        spaceId: 'personal',
        times: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'],
        transaction,
      }),
    ).rejects.toThrow('El recordatorio no es válido');
  });

  it('rechaza una fecha y hora ya pasadas', async () => {
    await expect(
      scheduleTransactionReminder({
        remindOn: '2026-08-04',
        spaceId: 'personal',
        times: ['07:00'],
        transaction,
      }),
    ).rejects.toThrow('Elige una fecha y hora futuras para el recordatorio');
    expect(mockRequestNotificationPermission).not.toHaveBeenCalled();
  });

  it('detiene el flujo si el permiso de notificaciones no fue concedido', async () => {
    mockRequestNotificationPermission.mockResolvedValueOnce(false);

    await expect(
      scheduleTransactionReminder({
        remindOn: '2026-08-10',
        spaceId: 'personal',
        times: ['09:00'],
        transaction,
      }),
    ).rejects.toThrow('Activa las notificaciones para programar recordatorios');
    expect(mockScheduleLocalNotification).not.toHaveBeenCalled();
  });

  it('cancela las notificaciones previas antes de programar las nuevas', async () => {
    mockGetLocalTransactionReminder.mockResolvedValueOnce({
      id: 'reminder-0',
      transactionId: 'transaction-1',
      spaceId: 'personal',
      remindOn: '2026-08-09',
      times: ['08:00'],
      notificationIds: ['old-notif'],
      createdAt: '2026-08-03T00:00:00.000Z',
      updatedAt: '2026-08-03T00:00:00.000Z',
    });

    await scheduleTransactionReminder({
      remindOn: '2026-08-10',
      spaceId: 'personal',
      times: ['09:00', '20:00'],
      transaction,
    });

    expect(mockCancelLocalNotification.mock.calls[0]?.[0]).toBe('old-notif');
    expect(mockBuildNotificationContent).toHaveBeenCalledWith({
      scheduledOn: '2026-08-10',
      type: 'expense',
      variables: expect.objectContaining({ amount: expect.any(String) }),
    });
    expect(mockScheduleLocalNotification).toHaveBeenCalledTimes(2);
    expect(mockScheduleLocalNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        body: 'Gasto de 45 €',
        title: 'Recordatorio: Alquiler',
      }),
    );
    expect(mockSaveLocalTransactionReminder).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationIds: ['notif-1', 'notif-1'],
        remindOn: '2026-08-10',
        spaceId: 'personal',
        times: ['09:00', '20:00'],
        transactionId: 'transaction-1',
      }),
    );
  });

  it('solo programa las horas futuras cuando el día elegido es hoy', async () => {
    await scheduleTransactionReminder({
      remindOn: '2026-08-04',
      spaceId: 'personal',
      times: ['07:00', '09:00'],
      transaction,
    });

    expect(mockScheduleLocalNotification).toHaveBeenCalledTimes(1);
    expect(mockSaveLocalTransactionReminder).toHaveBeenCalledWith(
      expect.objectContaining({ times: ['09:00'] }),
    );
  });
});

describe('cancelTransactionReminder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no hace nada si el movimiento no tiene recordatorio', async () => {
    mockGetLocalTransactionReminder.mockResolvedValueOnce(null);

    await cancelTransactionReminder('transaction-1');

    expect(mockCancelLocalNotification).not.toHaveBeenCalled();
    expect(mockDeleteLocalTransactionReminder).not.toHaveBeenCalled();
  });

  it('cancela cada notificación programada y elimina el recordatorio', async () => {
    mockGetLocalTransactionReminder.mockResolvedValueOnce({
      id: 'reminder-1',
      transactionId: 'transaction-1',
      spaceId: 'personal',
      remindOn: '2026-08-10',
      times: ['09:00', '20:00'],
      notificationIds: ['notif-1', 'notif-2'],
      createdAt: '2026-08-04T00:00:00.000Z',
      updatedAt: '2026-08-04T00:00:00.000Z',
    });

    await cancelTransactionReminder('transaction-1');

    const cancelledIds = mockCancelLocalNotification.mock.calls.map(
      (call) => call[0],
    );
    expect(cancelledIds).toEqual(['notif-1', 'notif-2']);
    expect(mockDeleteLocalTransactionReminder).toHaveBeenCalledWith(
      'transaction-1',
    );
  });
});
