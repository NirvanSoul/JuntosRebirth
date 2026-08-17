import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  automaticRecurrences,
  transactionTypes,
} from '@/features/transactions/repositories/transactionRowMapper';
import {
  getRecurrenceOccurrenceDate,
  type AutomaticTransactionRecurrence,
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

export async function materializeRecurringSeriesThroughDate(
  database: SQLiteDatabase,
  series: RecurringSeriesRow,
  throughDate: string,
): Promise<void> {
  if (
    !transactionTypes.has(series.type) ||
    !automaticRecurrences.has(series.frequency) ||
    !isCurrencyCode(series.currency)
  ) {
    throw new Error('La serie recurrente contiene valores no reconocidos');
  }

  await database.withExclusiveTransactionAsync(async (transaction) => {
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
          SET generated_occurrences = ?, next_occurrence_on = ?, updated_at = ?
        WHERE id = ? AND is_archived = 0`,
      generatedOccurrences,
      occurrenceDate,
      now,
      series.id,
    );
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
