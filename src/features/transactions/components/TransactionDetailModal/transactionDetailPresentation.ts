import type { TransactionRecurrence } from '@/features/transactions/types';

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
