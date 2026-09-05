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
  custom_rate_id: string | null;
  accounting_amount_minor_usd: number | null;
  exchange_snapshot_json: string | null;
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

  let exchangeSnapshot: SessionTransaction['exchangeSnapshot'];
  if (row.exchange_snapshot_json) {
    try {
      exchangeSnapshot = JSON.parse(
        row.exchange_snapshot_json,
      ) as SessionTransaction['exchangeSnapshot'];
    } catch {
      throw new Error(
        'El movimiento local contiene un snapshot de tasa inválido',
      );
    }
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
    ...(row.custom_rate_id ? { customRateId: row.custom_rate_id } : {}),
    ...(row.accounting_amount_minor_usd === null ||
    row.accounting_amount_minor_usd === undefined
      ? {}
      : { accountingAmountMinorUsd: row.accounting_amount_minor_usd }),
    ...(exchangeSnapshot === undefined ? {} : { exchangeSnapshot }),
    updatedAt: row.updated_at,
  };
}
