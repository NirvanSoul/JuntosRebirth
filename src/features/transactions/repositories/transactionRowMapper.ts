import type {
  SessionTransaction,
  TransactionRecurrence,
  TransactionType,
} from '@/features/transactions/types';
import { isCurrencyCode } from '@/lib/currency/currencyCatalog';

export type TransactionRow = {
  id: string;
  space_id: string;
  category_id: string;
  money_account_id: string | null;
  created_by: string;
  type: string;
  amount_minor: number;
  currency: string;
  title: string;
  occurred_on: string;
  recurrence: string;
  next_occurrence_on: string | null;
  recurrence_group_id: string | null;
  recurrence_series_id: string | null;
  recurrence_starts_on: string | null;
  source_transaction_id: string | null;
  note: string | null;
  updated_at: string;
};

export const transactionTypes = new Set<string>(['expense', 'income']);
export const recurrences = new Set<string>([
  'once',
  'weekly',
  'biweekly',
  'monthly',
  'custom',
]);
export const automaticRecurrences = new Set<string>([
  'weekly',
  'biweekly',
  'monthly',
]);

/**
 * Traduce una fila de SQLite al movimiento que ve la sesión.
 *
 * Valida en runtime los tres campos que llegan como texto libre desde la base
 * —tipo, recurrencia y moneda— porque el `getAllAsync<TransactionRow>` que las
 * lee es un cast, no una comprobación: sin esta guarda, una fila corrupta se
 * propagaría a la interfaz tipada como si fuera válida.
 */
export function mapTransaction(row: TransactionRow): SessionTransaction {
  if (
    !transactionTypes.has(row.type) ||
    !recurrences.has(row.recurrence) ||
    !isCurrencyCode(row.currency)
  ) {
    throw new Error('El movimiento local contiene valores no reconocidos');
  }

  return {
    id: row.id,
    spaceId: row.space_id,
    categoryId: row.category_id,
    ...(row.money_account_id === null || row.money_account_id === undefined
      ? {}
      : { moneyAccountId: row.money_account_id }),
    createdBy: row.created_by,
    type: row.type as TransactionType,
    amountMinor: row.amount_minor,
    currency: row.currency,
    title: row.title,
    occurredOn: row.occurred_on,
    recurrence: row.recurrence as TransactionRecurrence,
    nextOccurrenceOn: row.next_occurrence_on ?? undefined,
    recurrenceGroupId: row.recurrence_group_id ?? undefined,
    recurrenceSeriesId: row.recurrence_series_id ?? undefined,
    recurrenceStartsOn: row.recurrence_starts_on ?? undefined,
    sourceTransactionId: row.source_transaction_id ?? undefined,
    ...(row.note === null || row.note === undefined ? {} : { note: row.note }),
    updatedAt: row.updated_at,
  };
}
