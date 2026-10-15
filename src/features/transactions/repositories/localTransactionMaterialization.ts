import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  automaticRecurrences,
  transactionTypes,
} from '@/features/transactions/repositories/transactionRowMapper';
import {
  getRecurrenceOccurrenceDate,
  type AutomaticTransactionRecurrence,
  type ProjectedTransactionIdentity,
} from '@/features/transactions/utils/transactionRecurrence';
import { isCurrencyCode } from '@/lib/currency/currencyCatalog';
import { getLocalTodayKey } from '@/lib/date/localDate';

export type RecurringSeriesRow = {
  id: string;
  space_id: string;
  category_id: string;
  money_account_id: string | null;
  created_by: string;
  type: string;
  amount_minor: number;
  currency: string;
  title: string;
  frequency: string;
  starts_on: string;
  generated_occurrences: number;
  next_occurrence_on: string;
};

function assertRecurringSeries(series: RecurringSeriesRow): void {
  if (
    !transactionTypes.has(series.type) ||
    !automaticRecurrences.has(series.frequency) ||
    !isCurrencyCode(series.currency)
  ) {
    throw new Error('La serie recurrente contiene valores no reconocidos');
  }
}

async function findActiveSeries(
  transaction: SQLiteDatabase,
  seriesId: string,
  spaceId: string,
): Promise<RecurringSeriesRow> {
  const series = await transaction.getFirstAsync<RecurringSeriesRow>(
    `SELECT id, space_id, category_id, money_account_id, created_by, type,
            amount_minor, currency, title, frequency, starts_on,
            generated_occurrences, next_occurrence_on
       FROM recurring_transaction_series
      WHERE id = ? AND space_id = ? AND is_archived = 0`,
    seriesId,
    spaceId,
  );
  if (!series) throw new Error('La serie recurrente ya no está disponible');
  assertRecurringSeries(series);
  return series;
}

async function materializeSeriesWithinTransaction(
  transaction: SQLiteDatabase,
  series: RecurringSeriesRow,
  throughDate: string,
): Promise<void> {
  let generatedOccurrences = series.generated_occurrences;
  let occurrenceDate = series.next_occurrence_on;
  const now = new Date().toISOString();

  while (occurrenceDate <= throughDate) {
    await transaction.runAsync(
      `INSERT OR IGNORE INTO transactions (
           id, space_id, category_id, money_account_id, created_by, type,
           amount_minor,
           currency, title, occurred_on, recurrence, recurrence_group_id,
           recurrence_series_id,
           source_transaction_id, sync_status, is_archived, created_at,
           updated_at, archived_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, 'local_only', 0, ?, ?, NULL)`,
      randomUUID(),
      series.space_id,
      series.category_id,
      series.money_account_id,
      series.created_by,
      series.type,
      series.amount_minor,
      series.currency,
      series.title,
      occurrenceDate,
      series.frequency,
      series.id,
      now,
      now,
    );
    generatedOccurrences += 1;
    occurrenceDate = getRecurrenceOccurrenceDate(
      series.starts_on,
      series.frequency as AutomaticTransactionRecurrence,
      generatedOccurrences,
    );
  }

  await transaction.runAsync(
    `UPDATE recurring_transaction_series
          SET generated_occurrences = ?, next_occurrence_on = ?, updated_at = ?,
              sync_status = CASE
                WHEN sync_status = 'local_only' THEN 'local_only'
                ELSE 'pending'
              END
        WHERE id = ? AND is_archived = 0`,
    generatedOccurrences,
    occurrenceDate,
    now,
    series.id,
  );
}

export async function materializeRecurringSeriesThroughDate(
  database: SQLiteDatabase,
  series: RecurringSeriesRow,
  throughDate: string,
): Promise<void> {
  await database.withExclusiveTransactionAsync(async (transaction) => {
    const currentSeries = await findActiveSeries(
      transaction,
      series.id,
      series.space_id,
    );
    await materializeSeriesWithinTransaction(
      transaction,
      currentSeries,
      throughDate,
    );
  });
}

/** Convierte una preview futura concreta en una fila local editable. */
export async function materializeProjectedTransaction(
  database: SQLiteDatabase,
  identity: ProjectedTransactionIdentity,
  spaceId: string,
): Promise<string> {
  let occurrenceId: string | undefined;
  await database.withExclusiveTransactionAsync(async (transaction) => {
    const series = await findActiveSeries(
      transaction,
      identity.seriesId,
      spaceId,
    );
    await materializeSeriesWithinTransaction(
      transaction,
      series,
      identity.occurredOn,
    );
    occurrenceId = (
      await transaction.getFirstAsync<{ id: string }>(
        `SELECT id FROM transactions
          WHERE recurrence_series_id = ? AND occurred_on = ?
            AND space_id = ? AND is_archived = 0`,
        identity.seriesId,
        identity.occurredOn,
        spaceId,
      )
    )?.id;
    if (!occurrenceId) {
      throw new Error('No pudimos preparar la ocurrencia futura');
    }
  });
  return occurrenceId!;
}

/** Materializa y archiva una preview futura como una sola mutación local. */
export async function archiveProjectedTransaction(
  database: SQLiteDatabase,
  identity: ProjectedTransactionIdentity,
  spaceId: string,
): Promise<void> {
  await database.withExclusiveTransactionAsync(async (transaction) => {
    const series = await findActiveSeries(
      transaction,
      identity.seriesId,
      spaceId,
    );
    await materializeSeriesWithinTransaction(
      transaction,
      series,
      identity.occurredOn,
    );
    const now = new Date().toISOString();
    const result = await transaction.runAsync(
      `UPDATE transactions
          SET is_archived = 1, archived_at = ?, updated_at = ?,
              sync_status = CASE
                WHEN sync_status = 'local_only' THEN 'local_only'
                ELSE 'pending'
              END
        WHERE recurrence_series_id = ? AND occurred_on = ?
          AND space_id = ? AND is_archived = 0`,
      now,
      now,
      identity.seriesId,
      identity.occurredOn,
      spaceId,
    );
    if (result.changes !== 1) {
      throw new Error('No pudimos preparar la ocurrencia futura');
    }
  });
}

export async function materializeDueRecurringTransactions(
  database: SQLiteDatabase,
  throughDate = getLocalTodayKey(),
): Promise<void> {
  const dueSeries = await database.getAllAsync<RecurringSeriesRow>(
    `SELECT id, space_id, category_id, money_account_id, created_by, type,
            amount_minor, currency,
            title, frequency, starts_on, generated_occurrences,
            next_occurrence_on
       FROM recurring_transaction_series
      WHERE is_archived = 0 AND next_occurrence_on <= ?
      ORDER BY next_occurrence_on ASC`,
    throughDate,
  );

  for (const series of dueSeries) {
    await materializeRecurringSeriesThroughDate(database, series, throughDate);
  }
}
