import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  listRecentTemplateUsage,
  recordTemplateUsage,
} from '@/features/transactions/repositories/notificationTemplateHistoryRepository';

describe('notificationTemplateHistoryRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.useFakeTimers().setSystemTime(new Date('2026-08-10T08:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('no tiene historial cuando nunca se guardó nada', async () => {
    await expect(listRecentTemplateUsage('expense')).resolves.toEqual([]);
  });

  it('guarda y recupera el uso filtrado por tipo', async () => {
    await recordTemplateUsage({
      type: 'expense',
      templateId: 'expense_reminder_01',
      usedOn: '2026-08-09',
    });
    await recordTemplateUsage({
      type: 'income',
      templateId: 'income_reminder_01',
      usedOn: '2026-08-09',
    });

    await expect(listRecentTemplateUsage('expense')).resolves.toEqual([
      {
        type: 'expense',
        templateId: 'expense_reminder_01',
        usedOn: '2026-08-09',
      },
    ]);
    await expect(listRecentTemplateUsage('income')).resolves.toEqual([
      {
        type: 'income',
        templateId: 'income_reminder_01',
        usedOn: '2026-08-09',
      },
    ]);
  });

  it('poda entradas más antiguas que la ventana de retención', async () => {
    await recordTemplateUsage({
      type: 'expense',
      templateId: 'expense_reminder_01',
      usedOn: '2026-07-20',
    });
    await recordTemplateUsage({
      type: 'expense',
      templateId: 'expense_reminder_02',
      usedOn: '2026-08-09',
    });

    const usage = await listRecentTemplateUsage('expense');
    expect(usage.map((entry) => entry.templateId)).toEqual([
      'expense_reminder_02',
    ]);
  });

  it('ignora contenido corrupto y empieza de cero', async () => {
    await AsyncStorage.setItem(
      '@juntoss/notification-template-history/v1',
      'no-es-json',
    );

    await expect(listRecentTemplateUsage('expense')).resolves.toEqual([]);
  });
});
