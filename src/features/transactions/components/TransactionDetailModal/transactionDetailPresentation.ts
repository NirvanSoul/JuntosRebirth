import type {
  SessionTransaction,
  TransactionRecurrence,
} from '@/features/transactions/types';

/**
 * El servidor congela las tasas aplicables de un movimiento de Venezuela. Solo
 * con ellas puede leerse su importe en otra divisa sin recalcular nada.
 */
export function hasVenezuelaExchangeSnapshot(
  transaction: SessionTransaction,
): boolean {
  const rates = transaction.exchangeSnapshot?.rates;
  return rates !== undefined && rates !== null && Object.keys(rates).length > 0;
}

export const transactionRecurrenceLabels: Record<
  TransactionRecurrence,
  string
> = {
  once: 'Único',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  custom: 'Personalizada',
};

export function formatTransactionDetailDate(occurredOn: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${occurredOn}T12:00:00`));
}

export function getNextRecurrenceLabel(
  recurrence: TransactionRecurrence,
  nextOccurrenceOn?: string,
): string {
  if (nextOccurrenceOn) {
    return formatTransactionDetailDate(nextOccurrenceOn);
  }
  if (recurrence === 'once') {
    return 'No se repetirá';
  }
  if (recurrence === 'custom') {
    return 'No quedan repeticiones';
  }
  return 'Sin próxima fecha';
}
