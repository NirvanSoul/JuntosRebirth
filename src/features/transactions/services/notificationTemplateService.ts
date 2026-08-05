import {
  listNotificationTemplatesByType,
  type NotificationTemplate,
  type NotificationTemplateType,
  type NotificationTemplateVariable,
} from '@/features/transactions/constants/notificationTemplates';
import {
  listRecentTemplateUsage,
  recordTemplateUsage,
  type NotificationTemplateUsage,
} from '@/features/transactions/repositories/notificationTemplateHistoryRepository';
import { addDays } from '@/features/transactions/utils/transactionRecurrence';

/** No repetir la misma plantilla más de esta cantidad de veces en una semana. */
const weeklyRepeatLimit = 2;
const weeklyLookbackDays = 7;

function isCompatible(
  template: NotificationTemplate,
  availableVariables: ReadonlySet<NotificationTemplateVariable>,
): boolean {
  return template.requiredVariables.every((variable) =>
    availableVariables.has(variable),
  );
}

/** Reemplaza `{{variable}}` por su valor; una variable ausente se sustituye por texto vacío. */
export function interpolateTemplate(
  template: NotificationTemplate,
  variables: Partial<Record<NotificationTemplateVariable, string>>,
): { title: string; body: string } {
  const fill = (text: string) =>
    text.replace(
      /\{\{(\w+)\}\}/g,
      (_match, key: string) =>
        variables[key as NotificationTemplateVariable] ?? '',
    );

  return { title: fill(template.title), body: fill(template.body) };
}

function pickLeastRecentlyUsed(
  candidates: readonly NotificationTemplate[],
  usage: readonly NotificationTemplateUsage[],
): NotificationTemplate {
  const lastUsedByTemplate = new Map<string, string>();
  for (const entry of usage) {
    const current = lastUsedByTemplate.get(entry.templateId);
    if (!current || entry.usedOn > current) {
      lastUsedByTemplate.set(entry.templateId, entry.usedOn);
    }
  }

  return [...candidates].sort((left, right) => {
    const leftUsedOn = lastUsedByTemplate.get(left.id) ?? '';
    const rightUsedOn = lastUsedByTemplate.get(right.id) ?? '';
    return leftUsedOn.localeCompare(rightUsedOn);
  })[0]!;
}

export type SelectNotificationTemplateInput = {
  type: NotificationTemplateType;
  availableVariables: ReadonlySet<NotificationTemplateVariable>;
  /** Fecha local en la que se entregará el aviso; determina la ventana de rotación. */
  scheduledOn: string;
};

/**
 * Elige una plantilla compatible con las variables disponibles, evitando la
 * usada el día anterior y las usadas 2 o más veces en los últimos 7 días.
 * Si esas exclusiones no dejan ninguna candidata, cae de vuelta a la menos
 * usada recientemente entre todas las compatibles, para nunca dejar un
 * recordatorio sin contenido. Registra el uso elegido.
 */
export async function selectNotificationTemplate({
  type,
  availableVariables,
  scheduledOn,
}: SelectNotificationTemplateInput): Promise<NotificationTemplate> {
  const compatible = listNotificationTemplatesByType(type).filter((template) =>
    isCompatible(template, availableVariables),
  );
  if (compatible.length === 0) {
    throw new Error(
      `No hay ninguna plantilla de notificación compatible para "${type}"`,
    );
  }

  const usage = await listRecentTemplateUsage(type);
  const yesterday = addDays(scheduledOn, -1);
  const weekStart = addDays(scheduledOn, -weeklyLookbackDays);

  const usedYesterday = new Set(
    usage
      .filter((entry) => entry.usedOn === yesterday)
      .map((entry) => entry.templateId),
  );
  const usageCountsThisWeek = new Map<string, number>();
  for (const entry of usage) {
    if (entry.usedOn < weekStart || entry.usedOn >= scheduledOn) continue;
    usageCountsThisWeek.set(
      entry.templateId,
      (usageCountsThisWeek.get(entry.templateId) ?? 0) + 1,
    );
  }

  const eligible = compatible.filter(
    (template) =>
      !usedYesterday.has(template.id) &&
      (usageCountsThisWeek.get(template.id) ?? 0) < weeklyRepeatLimit,
  );

  const selected = pickLeastRecentlyUsed(
    eligible.length > 0 ? eligible : compatible,
    usage,
  );

  await recordTemplateUsage({
    type,
    templateId: selected.id,
    usedOn: scheduledOn,
  });

  return selected;
}

export type BuildNotificationContentInput = {
  type: NotificationTemplateType;
  scheduledOn: string;
  variables: Partial<Record<NotificationTemplateVariable, string>>;
};

/** Selecciona una plantilla compatible con `variables` y la interpola. */
export async function buildNotificationContent({
  type,
  scheduledOn,
  variables,
}: BuildNotificationContentInput): Promise<{ title: string; body: string }> {
  const availableVariables = new Set(
    (Object.keys(variables) as NotificationTemplateVariable[]).filter((key) =>
      Boolean(variables[key]),
    ),
  );

  const template = await selectNotificationTemplate({
    type,
    availableVariables,
    scheduledOn,
  });

  return interpolateTemplate(template, variables);
}
