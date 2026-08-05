/**
 * Plantillas de notificación local, transcritas de `Bible/JUNTOSS_NOTIFICATIONS.md`.
 * Ese documento es la fuente de verdad del texto; cualquier cambio de copy
 * debe hacerse ahí primero y reflejarse aquí.
 */

export type NotificationTemplateVariable =
  'category' | 'title' | 'amount' | 'date' | 'userName';

export type NotificationTemplateType = 'expense' | 'income' | 'daily';

export type NotificationTemplate = {
  id: string;
  type: NotificationTemplateType;
  title: string;
  body: string;
  requiredVariables: readonly NotificationTemplateVariable[];
};

const expenseTemplates: readonly NotificationTemplate[] = [
  {
    id: 'expense_reminder_01',
    type: 'expense',
    title: 'Recuerda este gasto',
    body: '{{category}} · {{amount}}',
    requiredVariables: ['category', 'amount'],
  },
  {
    id: 'expense_reminder_02',
    type: 'expense',
    title: 'Tienes un gasto pendiente',
    body: '{{title}} · {{amount}}',
    requiredVariables: ['title', 'amount'],
  },
  {
    id: 'expense_reminder_03',
    type: 'expense',
    title: 'Hoy toca revisar este gasto',
    body: '{{category}} por {{amount}}',
    requiredVariables: ['category', 'amount'],
  },
  {
    id: 'expense_reminder_04',
    type: 'expense',
    title: 'No olvides este gasto',
    body: '{{title}} en {{category}} · {{amount}}',
    requiredVariables: ['title', 'category', 'amount'],
  },
  {
    id: 'expense_reminder_05',
    type: 'expense',
    title: 'Este gasto está por llegar',
    body: '{{category}} · {{amount}}',
    requiredVariables: ['category', 'amount'],
  },
  {
    id: 'expense_reminder_06',
    type: 'expense',
    title: 'Ten presente este gasto',
    body: '{{title}} · {{amount}}',
    requiredVariables: ['title', 'amount'],
  },
  {
    id: 'expense_reminder_07',
    type: 'expense',
    title: 'Próximo gasto: {{category}}',
    body: 'Importe previsto: {{amount}}',
    requiredVariables: ['category', 'amount'],
  },
  {
    id: 'expense_reminder_08',
    type: 'expense',
    title: 'Recuerda registrar este gasto',
    body: '{{title}} · {{amount}}',
    requiredVariables: ['title', 'amount'],
  },
  {
    id: 'expense_reminder_09',
    type: 'expense',
    title: 'Un gasto para tener en cuenta',
    body: '{{category}} · {{amount}}',
    requiredVariables: ['category', 'amount'],
  },
  {
    id: 'expense_reminder_10',
    type: 'expense',
    title: 'Hello, revisa este movimiento',
    body: '{{title}} en {{category}} · {{amount}}',
    requiredVariables: ['title', 'category', 'amount'],
  },
];

const incomeTemplates: readonly NotificationTemplate[] = [
  {
    id: 'income_reminder_01',
    type: 'income',
    title: 'Tienes un ingreso previsto',
    body: '{{category}} · {{amount}}',
    requiredVariables: ['category', 'amount'],
  },
  {
    id: 'income_reminder_02',
    type: 'income',
    title: 'Recuerda este ingreso',
    body: '{{title}} · {{amount}}',
    requiredVariables: ['title', 'amount'],
  },
  {
    id: 'income_reminder_03',
    type: 'income',
    title: 'Hoy podrías recibir {{amount}}',
    body: '{{category}}',
    requiredVariables: ['amount', 'category'],
  },
  {
    id: 'income_reminder_04',
    type: 'income',
    title: 'Un ingreso está por llegar',
    body: '{{title}} · {{amount}}',
    requiredVariables: ['title', 'amount'],
  },
  {
    id: 'income_reminder_05',
    type: 'income',
    title: 'Revisa este cobro',
    body: '{{category}} · {{amount}}',
    requiredVariables: ['category', 'amount'],
  },
  {
    id: 'income_reminder_06',
    type: 'income',
    title: 'Tienes dinero pendiente por recibir',
    body: '{{title}} · {{amount}}',
    requiredVariables: ['title', 'amount'],
  },
  {
    id: 'income_reminder_07',
    type: 'income',
    title: 'Próximo ingreso: {{category}}',
    body: 'Importe previsto: {{amount}}',
    requiredVariables: ['category', 'amount'],
  },
  {
    id: 'income_reminder_08',
    type: 'income',
    title: 'No olvides registrar este ingreso',
    body: '{{title}} · {{amount}}',
    requiredVariables: ['title', 'amount'],
  },
  {
    id: 'income_reminder_09',
    type: 'income',
    title: 'Mantente pendiente de este ingreso',
    body: '{{category}} · {{amount}}',
    requiredVariables: ['category', 'amount'],
  },
  {
    id: 'income_reminder_10',
    type: 'income',
    title: 'Este ingreso merece seguimiento',
    body: '{{title}} en {{category}} · {{amount}}',
    requiredVariables: ['title', 'category', 'amount'],
  },
];

const dailyTemplates: readonly NotificationTemplate[] = [
  {
    id: 'daily_engagement_01',
    type: 'daily',
    title: '¿Tienes movimientos por registrar?',
    body: 'Pon tus finanzas al día en menos de un minuto.',
    requiredVariables: [],
  },
  {
    id: 'daily_engagement_02',
    type: 'daily',
    title: 'Un minuto para organizarte',
    body: 'Registra lo de hoy antes de que se te olvide.',
    requiredVariables: [],
  },
  {
    id: 'daily_engagement_03',
    type: 'daily',
    title: 'Mantén tu dinero al día',
    body: 'Añade tus últimos gastos o ingresos.',
    requiredVariables: [],
  },
  {
    id: 'daily_engagement_04',
    type: 'daily',
    title: '¿Gastaste algo hoy?',
    body: 'Regístralo ahora y evita recordarlo después.',
    requiredVariables: [],
  },
  {
    id: 'daily_engagement_05',
    type: 'daily',
    title: 'Tu resumen mejora con cada movimiento',
    body: 'Añade lo que falta de hoy.',
    requiredVariables: [],
  },
  {
    id: 'daily_engagement_06',
    type: 'daily',
    title: 'Que no se te escape ningún gasto',
    body: 'Revisa si tienes algo pendiente por registrar.',
    requiredVariables: [],
  },
  {
    id: 'daily_engagement_07',
    type: 'daily',
    title: 'Tus finanzas, un poco más claras',
    body: 'Registra tus movimientos recientes.',
    requiredVariables: [],
  },
  {
    id: 'daily_engagement_08',
    type: 'daily',
    title: 'Haz memoria de tu día',
    body: '¿Tuviste algún gasto o ingreso?',
    requiredVariables: [],
  },
  {
    id: 'daily_engagement_09',
    type: 'daily',
    title: 'Organizarte sigue siendo sencillo',
    body: 'Añade tus movimientos en juntoss.',
    requiredVariables: [],
  },
  {
    id: 'daily_engagement_10',
    type: 'daily',
    title: 'Llevar tus finanzas al día es gratis',
    body: 'Registra ahora lo que gastaste o recibiste.',
    requiredVariables: [],
  },
  {
    id: 'daily_engagement_11',
    type: 'daily',
    title: 'Un pequeño hábito ayuda mucho',
    body: 'Revisa y registra tus movimientos de hoy.',
    requiredVariables: [],
  },
  {
    id: 'daily_engagement_12',
    type: 'daily',
    title: 'Tu balance necesita lo de hoy',
    body: 'Añade cualquier gasto o ingreso pendiente.',
    requiredVariables: [],
  },
  {
    id: 'daily_engagement_13',
    type: 'daily',
    title: 'Cierra el día con tus cuentas claras',
    body: 'Registra lo que todavía falta.',
    requiredVariables: [],
  },
  {
    id: 'daily_engagement_14',
    type: 'daily',
    title: 'Lo de hoy también cuenta',
    body: 'Añade tus movimientos recientes.',
    requiredVariables: [],
  },
  {
    id: 'daily_engagement_15',
    type: 'daily',
    title: 'Tu yo de mañana te lo agradecerá',
    body: 'Registra hoy para no hacer memoria después.',
    requiredVariables: [],
  },
];

export const notificationTemplates: readonly NotificationTemplate[] = [
  ...expenseTemplates,
  ...incomeTemplates,
  ...dailyTemplates,
];

export function listNotificationTemplatesByType(
  type: NotificationTemplateType,
): readonly NotificationTemplate[] {
  return notificationTemplates.filter((template) => template.type === type);
}
