import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearDailyReminderSchedule,
  getDailyReminderSchedule,
  saveDailyReminderSchedule,
} from '@/features/transactions/repositories/dailyReminderScheduleRepository';

describe('dailyReminderScheduleRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('devuelve null cuando no hay nada programado', async () => {
    await expect(getDailyReminderSchedule()).resolves.toBeNull();
  });

  it('guarda y recupera el schedule vigente', async () => {
    await saveDailyReminderSchedule({
      notificationId: 'notif-1',
      scheduledOn: '2026-08-10',
    });

    await expect(getDailyReminderSchedule()).resolves.toEqual({
      notificationId: 'notif-1',
      scheduledOn: '2026-08-10',
    });
  });

  it('sustituye el schedule anterior al guardar uno nuevo', async () => {
    await saveDailyReminderSchedule({
      notificationId: 'notif-1',
      scheduledOn: '2026-08-10',
    });
    await saveDailyReminderSchedule({
      notificationId: 'notif-2',
      scheduledOn: '2026-08-11',
    });

    await expect(getDailyReminderSchedule()).resolves.toEqual({
      notificationId: 'notif-2',
      scheduledOn: '2026-08-11',
    });
  });

  it('borra el schedule guardado', async () => {
    await saveDailyReminderSchedule({
      notificationId: 'notif-1',
      scheduledOn: '2026-08-10',
    });

    await clearDailyReminderSchedule();

    await expect(getDailyReminderSchedule()).resolves.toBeNull();
  });

  it('ignora contenido corrupto', async () => {
    await AsyncStorage.setItem(
      '@juntoss/daily-reminder-schedule/v1',
      'no-es-json',
    );

    await expect(getDailyReminderSchedule()).resolves.toBeNull();
  });
});
