import {
  buildNotificationContent,
  interpolateTemplate,
  selectNotificationTemplate,
} from '@/features/transactions/services/notificationTemplateService';
import type { NotificationTemplate } from '@/features/transactions/constants/notificationTemplates';

const mockListRecentTemplateUsage = jest.fn();
const mockRecordTemplateUsage = jest.fn();

jest.mock(
  '@/features/transactions/repositories/notificationTemplateHistoryRepository',
  () => ({
    listRecentTemplateUsage: (...args: unknown[]) =>
      mockListRecentTemplateUsage(...args),
    recordTemplateUsage: (...args: unknown[]) =>
      mockRecordTemplateUsage(...args),
  }),
);

describe('interpolateTemplate', () => {
  it('reemplaza cada variable por su valor', () => {
    const template: NotificationTemplate = {
      id: 't1',
      type: 'expense',
      title: 'Recuerda este gasto',
      body: '{{category}} · {{amount}}',
      requiredVariables: ['category', 'amount'],
    };

    const content = interpolateTemplate(template, {
      category: 'Transporte',
      amount: '42,90 €',
    });

    expect(content).toEqual({
      title: 'Recuerda este gasto',
      body: 'Transporte · 42,90 €',
    });
  });

  it('sustituye una variable ausente por texto vacío', () => {
    const template: NotificationTemplate = {
      id: 't2',
      type: 'expense',
      title: 'Próximo gasto: {{category}}',
      body: 'Importe previsto: {{amount}}',
      requiredVariables: ['category', 'amount'],
    };

    const content = interpolateTemplate(template, { amount: '10 €' });

    expect(content.title).toBe('Próximo gasto: ');
    expect(content.body).toBe('Importe previsto: 10 €');
  });
});

describe('selectNotificationTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListRecentTemplateUsage.mockResolvedValue([]);
    mockRecordTemplateUsage.mockResolvedValue(undefined);
  });

  it('solo elige entre plantillas compatibles con las variables disponibles', async () => {
    const availableVariables = new Set(['amount', 'title'] as const);

    const template = await selectNotificationTemplate({
      type: 'income',
      availableVariables,
      scheduledOn: '2026-08-10',
    });

    expect(
      template.requiredVariables.every((variable) =>
        availableVariables.has(variable as 'amount' | 'title'),
      ),
    ).toBe(true);
  });

  it('lanza un error si ninguna plantilla es compatible con las variables disponibles', async () => {
    await expect(
      selectNotificationTemplate({
        // Cada tipo real tiene una plantilla de reserva sin variables
        // requeridas (para no dejar nunca un recordatorio sin contenido),
        // así que este caso solo puede darse con un tipo inexistente.
        type: 'invalid-type' as never,
        availableVariables: new Set(['amount']),
        scheduledOn: '2026-08-10',
      }),
    ).rejects.toThrow('No hay ninguna plantilla de notificación compatible');
  });

  it('cae de vuelta a la plantilla sin variables si ninguna con importe es compatible', async () => {
    const template = await selectNotificationTemplate({
      type: 'income',
      availableVariables: new Set(),
      scheduledOn: '2026-08-10',
    });

    expect(template.requiredVariables).toEqual([]);
  });

  it('excluye la plantilla usada el día anterior', async () => {
    mockListRecentTemplateUsage.mockResolvedValue([
      {
        type: 'daily',
        templateId: 'daily_engagement_01',
        usedOn: '2026-08-09',
      },
    ]);

    const template = await selectNotificationTemplate({
      type: 'daily',
      availableVariables: new Set(),
      scheduledOn: '2026-08-10',
    });

    expect(template.id).not.toBe('daily_engagement_01');
  });

  it('excluye una plantilla usada 2 o más veces en los últimos 7 días', async () => {
    mockListRecentTemplateUsage.mockResolvedValue([
      {
        type: 'daily',
        templateId: 'daily_engagement_01',
        usedOn: '2026-08-04',
      },
      {
        type: 'daily',
        templateId: 'daily_engagement_01',
        usedOn: '2026-08-06',
      },
    ]);

    const template = await selectNotificationTemplate({
      type: 'daily',
      availableVariables: new Set(),
      scheduledOn: '2026-08-10',
    });

    expect(template.id).not.toBe('daily_engagement_01');
  });

  it('registra el uso de la plantilla elegida', async () => {
    const template = await selectNotificationTemplate({
      type: 'daily',
      availableVariables: new Set(),
      scheduledOn: '2026-08-10',
    });

    expect(mockRecordTemplateUsage).toHaveBeenCalledWith({
      type: 'daily',
      templateId: template.id,
      usedOn: '2026-08-10',
    });
  });

  it('cae de vuelta a la menos usada recientemente si las exclusiones dejan cero candidatas', async () => {
    // Las 15 plantillas diarias usadas ayer o 2+ veces esta semana: ninguna
    // queda "elegible" tras las exclusiones, pero debe devolver igualmente
    // una plantilla compatible en vez de lanzar un error.
    const usage = Array.from({ length: 15 }, (_unused, index) => ({
      type: 'daily' as const,
      templateId: `daily_engagement_${String(index + 1).padStart(2, '0')}`,
      usedOn: '2026-08-09',
    }));
    mockListRecentTemplateUsage.mockResolvedValue(usage);

    const template = await selectNotificationTemplate({
      type: 'daily',
      availableVariables: new Set(),
      scheduledOn: '2026-08-10',
    });

    expect(template.type).toBe('daily');
  });
});

describe('buildNotificationContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListRecentTemplateUsage.mockResolvedValue([]);
    mockRecordTemplateUsage.mockResolvedValue(undefined);
  });

  it('no ofrece como disponible una variable con valor vacío', async () => {
    const content = await buildNotificationContent({
      type: 'expense',
      scheduledOn: '2026-08-10',
      variables: { amount: '10 €', category: 'Transporte', title: '' },
    });

    expect(content.title).not.toContain('{{');
    expect(content.body).not.toContain('{{');
    expect(content.title + content.body).not.toContain('undefined');
  });
});
