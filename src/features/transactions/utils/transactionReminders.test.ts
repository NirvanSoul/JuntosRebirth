import {
  buildReminderDateTime,
  buildReminderTemplateVariables,
  formatTimeOfDay,
  isValidReminderTime,
  normalizeReminderTimes,
  timeOfDayToDate,
} from '@/features/transactions/utils/transactionReminders';

describe('isValidReminderTime', () => {
  it('acepta horas en formato HH:mm', () => {
    expect(isValidReminderTime('09:00')).toBe(true);
    expect(isValidReminderTime('23:59')).toBe(true);
    expect(isValidReminderTime('00:00')).toBe(true);
  });

  it('rechaza formatos inválidos', () => {
    expect(isValidReminderTime('24:00')).toBe(false);
    expect(isValidReminderTime('9:00')).toBe(false);
    expect(isValidReminderTime('09:60')).toBe(false);
    expect(isValidReminderTime('mañana')).toBe(false);
  });
});

describe('normalizeReminderTimes', () => {
  it('ordena y elimina horas repetidas', () => {
    expect(normalizeReminderTimes(['20:00', '09:00', '09:00'])).toEqual([
      '09:00',
      '20:00',
    ]);
  });
});

describe('buildReminderDateTime', () => {
  it('combina fecha y hora locales en un único Date', () => {
    const date = buildReminderDateTime('2026-08-10', '09:30');

    expect(date).not.toBeNull();
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(7);
    expect(date?.getDate()).toBe(10);
    expect(date?.getHours()).toBe(9);
    expect(date?.getMinutes()).toBe(30);
  });

  it('devuelve null ante una fecha u hora inválida', () => {
    expect(buildReminderDateTime('2026-02-30', '09:00')).toBeNull();
    expect(buildReminderDateTime('2026-08-10', '25:00')).toBeNull();
  });
});

describe('buildReminderTemplateVariables', () => {
  it('incluye importe, título y categoría cuando están disponibles', () => {
    const variables = buildReminderTemplateVariables({
      amountMinor: 1050,
      currency: 'EUR',
      categoryName: 'Supermercado',
      title: 'Compra semanal',
      type: 'expense',
    });

    expect(variables.amount).toContain('10,50');
    expect(variables.title).toBe('Compra semanal');
    expect(variables.category).toBe('Supermercado');
  });

  it('omite título y categoría vacíos en vez de dejarlos en blanco', () => {
    const variables = buildReminderTemplateVariables({
      amountMinor: 500,
      currency: 'EUR',
      title: '   ',
      type: 'income',
    });

    expect(variables.title).toBeUndefined();
    expect(variables.category).toBeUndefined();
    expect(variables.amount).toBeTruthy();
  });

  it('omite el importe cuando showAmounts es falso', () => {
    const variables = buildReminderTemplateVariables(
      {
        amountMinor: 1050,
        currency: 'EUR',
        categoryName: 'Supermercado',
        title: 'Compra semanal',
        type: 'expense',
      },
      false,
    );

    expect(variables.amount).toBeUndefined();
    expect(variables.title).toBe('Compra semanal');
    expect(variables.category).toBe('Supermercado');
  });
});

describe('formatTimeOfDay y timeOfDayToDate', () => {
  it('son inversas entre sí para una hora válida', () => {
    const date = timeOfDayToDate('09:30');

    expect(date.getHours()).toBe(9);
    expect(date.getMinutes()).toBe(30);
    expect(formatTimeOfDay(date)).toBe('09:30');
  });
});
