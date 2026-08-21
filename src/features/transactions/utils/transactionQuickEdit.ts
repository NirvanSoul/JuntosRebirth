import type {
  CreateTransactionDraft,
  SessionTransaction,
  TransactionQuickEdit,
} from '@/features/transactions/types';

/**
 * Traduce un cambio puntual del detalle al borrador completo que espera
 * `updateLocalTransaction`. Se reutiliza el mismo camino de guardado que el
 * formulario —y no un UPDATE por campo— para no tener dos reglas distintas
 * sobre series recurrentes, ocurrencias proyectadas y autoría.
 */
export function applyTransactionQuickEdit(
  transaction: SessionTransaction,
  change: TransactionQuickEdit,
): CreateTransactionDraft {
  const draft: CreateTransactionDraft = {
    spaceId: transaction.spaceId,
    type: transaction.type,
    amountMinor: transaction.amountMinor,
    currency: transaction.currency,
    title: transaction.title,
    categoryId: transaction.categoryId,
    moneyAccountId: transaction.moneyAccountId,
    occurredOn: transaction.occurredOn,
    recurrence: transaction.recurrence,
    customOccurrenceDates: transaction.customOccurrenceDates,
  };

  switch (change.field) {
    case 'category':
      return { ...draft, categoryId: change.categoryId };
    case 'date':
      return { ...draft, occurredOn: change.occurredOn };
    case 'money-account':
      return { ...draft, moneyAccountId: change.moneyAccountId };
    case 'recurrence':
      return {
        ...draft,
        recurrence: change.recurrence,
        // Una recurrencia que deja de ser personalizada no conserva su lista
        // de fechas: al volver a elegirla se escogen de nuevo.
        customOccurrenceDates:
          change.recurrence === 'custom'
            ? (change.customOccurrenceDates ??
              transaction.customOccurrenceDates)
            : undefined,
      };
  }
}
