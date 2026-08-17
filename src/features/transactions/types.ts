import type { CurrencyCode } from '@/lib/currency/currencyCatalog';

export type TransactionType = 'expense' | 'income';

export type TransactionRecurrence =
  'once' | 'weekly' | 'biweekly' | 'monthly' | 'custom';

export type CreateTransactionDraft = {
  spaceId: string;
  type: TransactionType;
  amountMinor: number;
  currency: CurrencyCode;
  title: string;
  categoryId: string;
  occurredOn: string;
  recurrence: TransactionRecurrence;
  customOccurrenceDates?: readonly string[];
};

export type SessionTransaction = CreateTransactionDraft & {
  id: string;
  /**
   * Quién creó el movimiento.
   *
   * Guarda el uuid de usuario cuando había sesión al crearlo, y el id de
   * instalación cuando no la había (modo invitado) o cuando la fila es anterior
   * a esta distinción. Ese segundo caso solo puede haberse originado en este
   * mismo dispositivo: cualquier fila que venga del servidor trae uuid. Por eso
   * `resolveTransactionAuthor` puede atribuir con seguridad a la persona del
   * móvil todo id que no reconozca.
   */
  createdBy: string;
  /** Instante de creación o de última modificación, para ordenar por actividad reciente. */
  updatedAt: string;
  nextOccurrenceOn?: string;
  recurrenceGroupId?: string;
  recurrenceSeriesId?: string;
  recurrenceStartsOn?: string;
  /** Id del movimiento original si este es una copia creada en otro espacio. */
  sourceTransactionId?: string;
  note?: string;
};

/** Configuración de recordatorios locales de un movimiento: un día con una o varias horas. */
export type TransactionReminder = {
  id: string;
  transactionId: string;
  spaceId: string;
  remindOn: string;
  times: readonly string[];
  createdAt: string;
  updatedAt: string;
};

/**
 * Regla de notificación aplicada a todos los movimientos de un tipo dentro de
 * un espacio: cuántos días antes de su fecha y a qué horas avisar.
 */
export type TransactionNotificationRule = {
  id: string;
  spaceId: string;
  transactionType: TransactionType;
  isEnabled: boolean;
  daysBefore: number;
  times: readonly string[];
  createdAt: string;
  updatedAt: string;
};
