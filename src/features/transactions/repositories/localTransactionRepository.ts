import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  CreateTransactionDraft,
  SessionTransaction,
  TransactionRecurrence,
  TransactionType,
} from '@/features/transactions/types';
import { isCurrencyCode } from '@/lib/currency/currencyCatalog';
import { getLocalTodayKey } from '@/lib/date/localDate';
import {
  getRecurrenceOccurrenceDate,
  isValidLocalDate,
  normalizeCustomOccurrenceDates,
  parseProjectedTransactionId,
  type AutomaticTransactionRecurrence,
} from '@/features/transactions/utils/transactionRecurrence';
import { getLocalDatabase } from '@/lib/storage/localDatabase';
import { getOrCreateInstallationId } from '@/lib/storage/localIdentity';

type TransactionRow = {
  id: string;
  space_id: string;
  category_id: string;
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

type RecurringSeriesRow = {
  id: string;
  space_id: string;
  category_id: string;
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

type ExistingTransactionRow = {
  occurred_on: string;
  recurrence: string;
  recurrence_series_id: string | null;
};

export type CreateLocalTransactionInput = CreateTransactionDraft & {
  id?: string;
  sourceTransactionId?: string;
};

const transactionTypes = new Set<string>(['expense', 'income']);
const recurrences = new Set<string>([
  'once',
  'weekly',
  'biweekly',
  'monthly',
  'custom',
]);
const automaticRecurrences = new Set<string>(['weekly', 'biweekly', 'monthly']);

function mapTransaction(row: TransactionRow): SessionTransaction {
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

function assertTransaction(input: CreateTransactionDraft): void {
  if (
    !input.spaceId ||
    !input.categoryId ||
    !Number.isSafeInteger(input.amountMinor) ||
    input.amountMinor <= 0 ||
    !isValidLocalDate(input.occurredOn) ||
    !recurrences.has(input.recurrence) ||
    !isCurrencyCode(input.currency)
  ) {
    throw new Error('El movimiento local no es válido');
  }
}

async function insertTransaction(
  database: SQLiteDatabase,
  input: CreateLocalTransactionInput,
  id: string,
  createdBy: string,
  occurredOn: string,
  recurrenceGroupId: string | null,
  recurrenceSeriesId: string | null,
  now: string,
): Promise<void> {
  await database.runAsync(
    `INSERT INTO transactions (
       id, space_id, category_id, created_by, type, amount_minor, currency,
       title, occurred_on, recurrence, recurrence_group_id,
       recurrence_series_id,
       source_transaction_id, sync_status, is_archived, created_at, updated_at,
       archived_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'local_only', 0, ?, ?, NULL)`,
    id,
    input.spaceId,
    input.categoryId,
    createdBy,
    input.type,
    input.amountMinor,
    input.currency,
    input.title,
    occurredOn,
    input.recurrence,
    recurrenceGroupId,
    recurrenceSeriesId,
    input.sourceTransactionId ?? null,
    now,
    now,
  );
}

async function materializeRecurringSeriesThroughDate(
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
           id, space_id, category_id, created_by, type, amount_minor,
           currency, title, occurred_on, recurrence, recurrence_group_id,
           recurrence_series_id,
           source_transaction_id, sync_status, is_archived, created_at,
           updated_at, archived_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, 'local_only', 0, ?, ?, NULL)`,
        randomUUID(),
        series.space_id,
        series.category_id,
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
    `SELECT id, space_id, category_id, created_by, type, amount_minor, currency,
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

export async function listLocalTransactions(): Promise<SessionTransaction[]> {
  const database = await getLocalDatabase();
  await materializeDueRecurringTransactions(database);
  const rows = await database.getAllAsync<TransactionRow>(
    `SELECT transactions.id, transactions.space_id, transactions.category_id,
            transactions.type, transactions.amount_minor,
            transactions.currency, transactions.title,
            transactions.occurred_on, transactions.recurrence,
            transactions.recurrence_group_id,
            transactions.recurrence_series_id, transactions.updated_at,
            transactions.source_transaction_id, transactions.note,
            recurring_transaction_series.next_occurrence_on,
            recurring_transaction_series.starts_on AS recurrence_starts_on
       FROM transactions
       LEFT JOIN recurring_transaction_series
         ON recurring_transaction_series.id = transactions.recurrence_series_id
      WHERE transactions.is_archived = 0
      ORDER BY transactions.occurred_on DESC, transactions.created_at DESC`,
  );

  return rows.map(mapTransaction);
}

export async function createLocalTransaction(
  input: CreateLocalTransactionInput,
): Promise<SessionTransaction[]> {
  assertTransaction(input);
  const database = await getLocalDatabase();
  const createdBy = await getOrCreateInstallationId(database);
  const now = new Date().toISOString();
  const automatic = automaticRecurrences.has(input.recurrence);
  const recurrenceGroupId = input.recurrence === 'custom' ? randomUUID() : null;
  const customDates =
    input.recurrence === 'custom'
      ? normalizeCustomOccurrenceDates(
          input.customOccurrenceDates?.length
            ? input.customOccurrenceDates
            : [input.occurredOn],
        )
      : [input.occurredOn];
  const seriesId = automatic ? randomUUID() : null;
  let nextOccurrenceOn: string | undefined;
  const occurrenceDates = [...customDates];
  if (automatic) {
    let occurrenceIndex = 1;
    let nextDate = getRecurrenceOccurrenceDate(
      input.occurredOn,
      input.recurrence as AutomaticTransactionRecurrence,
      occurrenceIndex,
    );
    const today = getLocalTodayKey();
    while (nextDate <= today) {
      occurrenceDates.push(nextDate);
      occurrenceIndex += 1;
      nextDate = getRecurrenceOccurrenceDate(
        input.occurredOn,
        input.recurrence as AutomaticTransactionRecurrence,
        occurrenceIndex,
      );
    }
  }
  const ids = occurrenceDates.map((_, index) =>
    index === 0 && input.id ? input.id : randomUUID(),
  );

  await database.withExclusiveTransactionAsync(async (transaction) => {
    if (seriesId) {
      const nextOccurrence = getRecurrenceOccurrenceDate(
        input.occurredOn,
        input.recurrence as AutomaticTransactionRecurrence,
        occurrenceDates.length,
      );
      nextOccurrenceOn = nextOccurrence;
      await transaction.runAsync(
        `INSERT INTO recurring_transaction_series (
           id, space_id, category_id, created_by, type, amount_minor, currency,
           title, frequency, starts_on, generated_occurrences,
           next_occurrence_on, sync_status, is_archived, created_at, updated_at,
           archived_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'local_only', 0, ?, ?, NULL)`,
        seriesId,
        input.spaceId,
        input.categoryId,
        createdBy,
        input.type,
        input.amountMinor,
        input.currency,
        input.title,
        input.recurrence,
        input.occurredOn,
        occurrenceDates.length,
        nextOccurrence,
        now,
        now,
      );
    }

    for (const [index, occurredOn] of occurrenceDates.entries()) {
      await insertTransaction(
        transaction,
        input,
        ids[index]!,
        createdBy,
        occurredOn,
        recurrenceGroupId,
        seriesId,
        now,
      );
    }
  });

  return occurrenceDates.map((occurredOn, index) => ({
    id: ids[index]!,
    spaceId: input.spaceId,
    categoryId: input.categoryId,
    type: input.type,
    amountMinor: input.amountMinor,
    currency: input.currency,
    title: input.title,
    occurredOn,
    recurrence: input.recurrence,
    nextOccurrenceOn,
    recurrenceGroupId: recurrenceGroupId ?? undefined,
    recurrenceSeriesId: seriesId ?? undefined,
    recurrenceStartsOn: automatic ? input.occurredOn : undefined,
    sourceTransactionId: input.sourceTransactionId,
    updatedAt: now,
  }));
}

/**
 * Inserta varios movimientos únicos en una sola transacción SQLite,
 * siguiendo el mismo patrón que `createLocalCategories`. A diferencia de
 * `createLocalTransaction`, no materializa series recurrentes: está pensada
 * para importación por lotes, donde cada fila ya es una ocurrencia concreta
 * con fecha propia (Bible §55-§57).
 */
export async function createLocalTransactions(
  inputs: readonly CreateLocalTransactionInput[],
): Promise<SessionTransaction[]> {
  if (inputs.length === 0) return [];
  inputs.forEach((input) => {
    assertTransaction(input);
    if (input.recurrence !== 'once') {
      throw new Error(
        'La creación en lote solo admite movimientos sin recurrencia',
      );
    }
  });

  const database = await getLocalDatabase();
  const createdBy = await getOrCreateInstallationId(database);
  const now = new Date().toISOString();
  const ids = inputs.map((input) => input.id ?? randomUUID());

  await database.withExclusiveTransactionAsync(async (transaction) => {
    for (const [index, input] of inputs.entries()) {
      await insertTransaction(
        transaction,
        input,
        ids[index]!,
        createdBy,
        input.occurredOn,
        null,
        null,
        now,
      );
    }
  });

  return inputs.map((input, index) => ({
    id: ids[index]!,
    spaceId: input.spaceId,
    categoryId: input.categoryId,
    type: input.type,
    amountMinor: input.amountMinor,
    currency: input.currency,
    title: input.title,
    occurredOn: input.occurredOn,
    recurrence: 'once',
    sourceTransactionId: input.sourceTransactionId,
    updatedAt: now,
  }));
}

export async function updateLocalTransaction(
  id: string,
  draft: CreateTransactionDraft,
): Promise<SessionTransaction[]> {
  assertTransaction(draft);
  const database = await getLocalDatabase();
  const projectedIdentity = parseProjectedTransactionId(id);

  if (projectedIdentity) {
    const series = await database.getFirstAsync<RecurringSeriesRow>(
      `SELECT id, space_id, category_id, created_by, type, amount_minor,
              currency, title, frequency, starts_on, generated_occurrences,
              next_occurrence_on
         FROM recurring_transaction_series
        WHERE id = ? AND space_id = ? AND is_archived = 0`,
      projectedIdentity.seriesId,
      draft.spaceId,
    );
    if (!series) {
      throw new Error('La serie recurrente ya no está disponible');
    }

    await materializeRecurringSeriesThroughDate(
      database,
      series,
      projectedIdentity.occurredOn,
    );
    const materializedOccurrence = await database.getFirstAsync<{ id: string }>(
      `SELECT id
         FROM transactions
        WHERE recurrence_series_id = ? AND occurred_on = ?
          AND space_id = ? AND is_archived = 0`,
      projectedIdentity.seriesId,
      projectedIdentity.occurredOn,
      draft.spaceId,
    );
    if (!materializedOccurrence) {
      throw new Error('No pudimos preparar la ocurrencia futura');
    }

    return updateLocalTransaction(materializedOccurrence.id, draft);
  }

  const now = new Date().toISOString();
  const existingTransaction =
    await database.getFirstAsync<ExistingTransactionRow>(
      `SELECT occurred_on, recurrence, recurrence_series_id
         FROM transactions
        WHERE id = ? AND space_id = ? AND is_archived = 0`,
      id,
      draft.spaceId,
    );

  if (draft.recurrence === 'custom') {
    const occurrenceDates = normalizeCustomOccurrenceDates(
      draft.customOccurrenceDates?.length
        ? draft.customOccurrenceDates
        : [draft.occurredOn],
    );
    const recurrenceGroupId = randomUUID();
    const occurrenceIds = occurrenceDates.map((_, index) =>
      index === 0 ? id : randomUUID(),
    );
    const createdBy = await getOrCreateInstallationId(database);

    await database.withExclusiveTransactionAsync(async (transaction) => {
      const result = await transaction.runAsync(
        `UPDATE transactions
            SET category_id = ?, type = ?, amount_minor = ?, currency = ?,
                title = ?, occurred_on = ?, recurrence = 'custom',
                recurrence_group_id = ?, recurrence_series_id = NULL,
                updated_at = ?,
                sync_status = CASE
                  WHEN sync_status = 'local_only' THEN 'local_only'
                  ELSE 'pending'
                END
          WHERE id = ? AND space_id = ? AND is_archived = 0`,
        draft.categoryId,
        draft.type,
        draft.amountMinor,
        draft.currency,
        draft.title,
        occurrenceDates[0]!,
        recurrenceGroupId,
        now,
        id,
        draft.spaceId,
      );
      if (result.changes !== 1) {
        throw new Error('El movimiento local ya no está disponible');
      }

      if (existingTransaction?.recurrence_series_id) {
        await transaction.runAsync(
          `UPDATE transactions
              SET is_archived = 1, archived_at = ?, updated_at = ?,
                  sync_status = CASE
                    WHEN sync_status = 'local_only' THEN 'local_only'
                    ELSE 'pending'
                  END
            WHERE recurrence_series_id = ? AND occurred_on > ?
              AND space_id = ? AND is_archived = 0`,
          now,
          now,
          existingTransaction.recurrence_series_id,
          existingTransaction.occurred_on,
          draft.spaceId,
        );
        await transaction.runAsync(
          `UPDATE recurring_transaction_series
              SET is_archived = 1, archived_at = ?, updated_at = ?,
                  sync_status = CASE
                    WHEN sync_status = 'local_only' THEN 'local_only'
                    ELSE 'pending'
                  END
            WHERE id = ? AND space_id = ? AND is_archived = 0`,
          now,
          now,
          existingTransaction.recurrence_series_id,
          draft.spaceId,
        );
      }

      for (let index = 1; index < occurrenceDates.length; index += 1) {
        await insertTransaction(
          transaction,
          draft,
          occurrenceIds[index]!,
          createdBy,
          occurrenceDates[index]!,
          recurrenceGroupId,
          null,
          now,
        );
      }
    });

    return occurrenceDates.map((occurredOn, index) => ({
      id: occurrenceIds[index]!,
      spaceId: draft.spaceId,
      categoryId: draft.categoryId,
      type: draft.type,
      amountMinor: draft.amountMinor,
      currency: draft.currency,
      title: draft.title,
      occurredOn,
      recurrence: 'custom',
      recurrenceGroupId,
      updatedAt: now,
    }));
  }

  const startsNewAutomaticSeries =
    automaticRecurrences.has(draft.recurrence) &&
    (!existingTransaction?.recurrence_series_id ||
      existingTransaction.recurrence !== draft.recurrence ||
      existingTransaction.occurred_on !== draft.occurredOn);

  if (startsNewAutomaticSeries) {
    const recurrence = draft.recurrence as AutomaticTransactionRecurrence;
    const seriesId = randomUUID();
    const createdBy = await getOrCreateInstallationId(database);
    const occurrenceDates = [draft.occurredOn];
    let nextOccurrenceOn = getRecurrenceOccurrenceDate(
      draft.occurredOn,
      recurrence,
      1,
    );
    const today = getLocalTodayKey();
    while (nextOccurrenceOn <= today) {
      occurrenceDates.push(nextOccurrenceOn);
      nextOccurrenceOn = getRecurrenceOccurrenceDate(
        draft.occurredOn,
        recurrence,
        occurrenceDates.length,
      );
    }
    const occurrenceIds = occurrenceDates.map((_, index) =>
      index === 0 ? id : randomUUID(),
    );

    await database.withExclusiveTransactionAsync(async (transaction) => {
      if (existingTransaction?.recurrence_series_id) {
        await transaction.runAsync(
          `UPDATE transactions
              SET is_archived = 1, archived_at = ?, updated_at = ?,
                  sync_status = CASE
                    WHEN sync_status = 'local_only' THEN 'local_only'
                    ELSE 'pending'
                  END
            WHERE recurrence_series_id = ? AND occurred_on > ?
              AND space_id = ? AND is_archived = 0`,
          now,
          now,
          existingTransaction.recurrence_series_id,
          existingTransaction.occurred_on,
          draft.spaceId,
        );
        await transaction.runAsync(
          `UPDATE recurring_transaction_series
              SET is_archived = 1, archived_at = ?, updated_at = ?,
                  sync_status = CASE
                    WHEN sync_status = 'local_only' THEN 'local_only'
                    ELSE 'pending'
                  END
            WHERE id = ? AND space_id = ? AND is_archived = 0`,
          now,
          now,
          existingTransaction.recurrence_series_id,
          draft.spaceId,
        );
      }

      await transaction.runAsync(
        `INSERT INTO recurring_transaction_series (
           id, space_id, category_id, created_by, type, amount_minor, currency,
           title, frequency, starts_on, generated_occurrences,
           next_occurrence_on, sync_status, is_archived, created_at, updated_at,
           archived_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'local_only', 0, ?, ?, NULL)`,
        seriesId,
        draft.spaceId,
        draft.categoryId,
        createdBy,
        draft.type,
        draft.amountMinor,
        draft.currency,
        draft.title,
        recurrence,
        draft.occurredOn,
        occurrenceDates.length,
        nextOccurrenceOn,
        now,
        now,
      );

      const result = await transaction.runAsync(
        `UPDATE transactions
            SET category_id = ?, type = ?, amount_minor = ?, currency = ?,
                title = ?, occurred_on = ?, recurrence = ?,
                recurrence_group_id = NULL, recurrence_series_id = ?,
                updated_at = ?,
                sync_status = CASE
                  WHEN sync_status = 'local_only' THEN 'local_only'
                  ELSE 'pending'
                END
          WHERE id = ? AND space_id = ? AND is_archived = 0`,
        draft.categoryId,
        draft.type,
        draft.amountMinor,
        draft.currency,
        draft.title,
        draft.occurredOn,
        recurrence,
        seriesId,
        now,
        id,
        draft.spaceId,
      );
      if (result.changes !== 1) {
        throw new Error('El movimiento local ya no está disponible');
      }

      for (let index = 1; index < occurrenceDates.length; index += 1) {
        await insertTransaction(
          transaction,
          draft,
          occurrenceIds[index]!,
          createdBy,
          occurrenceDates[index]!,
          null,
          seriesId,
          now,
        );
      }
    });

    return occurrenceDates.map((occurredOn, index) => ({
      ...draft,
      id: occurrenceIds[index]!,
      occurredOn,
      recurrence,
      nextOccurrenceOn,
      recurrenceSeriesId: seriesId,
      recurrenceStartsOn: draft.occurredOn,
      updatedAt: now,
    }));
  }

  const updatesAutomaticSeries = Boolean(
    existingTransaction?.recurrence_series_id &&
    automaticRecurrences.has(draft.recurrence) &&
    draft.recurrence === existingTransaction.recurrence,
  );

  if (existingTransaction && updatesAutomaticSeries) {
    const recurrenceSeriesId = existingTransaction.recurrence_series_id!;

    await database.withExclusiveTransactionAsync(async (transaction) => {
      const result = await transaction.runAsync(
        `UPDATE transactions
            SET category_id = ?, type = ?, amount_minor = ?, currency = ?,
                title = ?, occurred_on = ?, recurrence = ?,
                recurrence_group_id = NULL, updated_at = ?,
                sync_status = CASE
                  WHEN sync_status = 'local_only' THEN 'local_only'
                  ELSE 'pending'
                END
          WHERE id = ? AND space_id = ? AND is_archived = 0`,
        draft.categoryId,
        draft.type,
        draft.amountMinor,
        draft.currency,
        draft.title,
        draft.occurredOn,
        draft.recurrence,
        now,
        id,
        draft.spaceId,
      );
      if (result.changes !== 1) {
        throw new Error('El movimiento local ya no está disponible');
      }

      await transaction.runAsync(
        `UPDATE transactions
            SET category_id = ?, type = ?, amount_minor = ?, currency = ?,
                title = ?, updated_at = ?,
                sync_status = CASE
                  WHEN sync_status = 'local_only' THEN 'local_only'
                  ELSE 'pending'
                END
          WHERE recurrence_series_id = ? AND occurred_on > ?
            AND space_id = ? AND is_archived = 0`,
        draft.categoryId,
        draft.type,
        draft.amountMinor,
        draft.currency,
        draft.title,
        now,
        recurrenceSeriesId,
        existingTransaction.occurred_on,
        draft.spaceId,
      );

      await transaction.runAsync(
        `UPDATE recurring_transaction_series
            SET category_id = ?, type = ?, amount_minor = ?, currency = ?,
                title = ?, updated_at = ?,
                sync_status = CASE
                  WHEN sync_status = 'local_only' THEN 'local_only'
                  ELSE 'pending'
                END
          WHERE id = ? AND space_id = ? AND is_archived = 0`,
        draft.categoryId,
        draft.type,
        draft.amountMinor,
        draft.currency,
        draft.title,
        now,
        recurrenceSeriesId,
        draft.spaceId,
      );
    });

    const updatedRows = await database.getAllAsync<TransactionRow>(
      `SELECT transactions.id, transactions.space_id,
              transactions.category_id, transactions.type,
              transactions.amount_minor, transactions.currency,
              transactions.title, transactions.occurred_on,
              transactions.recurrence, transactions.recurrence_group_id,
              transactions.recurrence_series_id, transactions.updated_at,
              transactions.source_transaction_id,
              recurring_transaction_series.next_occurrence_on,
              recurring_transaction_series.starts_on AS recurrence_starts_on
         FROM transactions
         LEFT JOIN recurring_transaction_series
           ON recurring_transaction_series.id = transactions.recurrence_series_id
        WHERE transactions.is_archived = 0
          AND transactions.space_id = ?
          AND (transactions.id = ? OR (
            transactions.recurrence_series_id = ?
            AND transactions.occurred_on > ?
          ))
        ORDER BY transactions.occurred_on DESC`,
      draft.spaceId,
      id,
      recurrenceSeriesId,
      existingTransaction.occurred_on,
    );

    return updatedRows.map(mapTransaction);
  }

  if (existingTransaction?.recurrence_series_id) {
    await database.withExclusiveTransactionAsync(async (transaction) => {
      const result = await transaction.runAsync(
        `UPDATE transactions
            SET category_id = ?, type = ?, amount_minor = ?, currency = ?,
                title = ?, occurred_on = ?, recurrence = ?,
                recurrence_group_id = NULL, recurrence_series_id = NULL,
                updated_at = ?,
                sync_status = CASE
                  WHEN sync_status = 'local_only' THEN 'local_only'
                  ELSE 'pending'
                END
          WHERE id = ? AND space_id = ? AND is_archived = 0`,
        draft.categoryId,
        draft.type,
        draft.amountMinor,
        draft.currency,
        draft.title,
        draft.occurredOn,
        draft.recurrence,
        now,
        id,
        draft.spaceId,
      );
      if (result.changes !== 1) {
        throw new Error('El movimiento local ya no está disponible');
      }
      await transaction.runAsync(
        `UPDATE transactions
            SET is_archived = 1, archived_at = ?, updated_at = ?,
                sync_status = CASE
                  WHEN sync_status = 'local_only' THEN 'local_only'
                  ELSE 'pending'
                END
          WHERE recurrence_series_id = ? AND occurred_on > ?
            AND space_id = ? AND is_archived = 0`,
        now,
        now,
        existingTransaction.recurrence_series_id,
        existingTransaction.occurred_on,
        draft.spaceId,
      );
      await transaction.runAsync(
        `UPDATE recurring_transaction_series
            SET is_archived = 1, archived_at = ?, updated_at = ?,
                sync_status = CASE
                  WHEN sync_status = 'local_only' THEN 'local_only'
                  ELSE 'pending'
                END
          WHERE id = ? AND space_id = ? AND is_archived = 0`,
        now,
        now,
        existingTransaction.recurrence_series_id,
        draft.spaceId,
      );
    });
  } else {
    const result = await database.runAsync(
      `UPDATE transactions
          SET category_id = ?, type = ?, amount_minor = ?, currency = ?,
              title = ?, occurred_on = ?, recurrence = ?,
              recurrence_group_id = NULL, recurrence_series_id = NULL,
              updated_at = ?,
              sync_status = CASE
                WHEN sync_status = 'local_only' THEN 'local_only'
                ELSE 'pending'
              END
        WHERE id = ? AND space_id = ? AND is_archived = 0`,
      draft.categoryId,
      draft.type,
      draft.amountMinor,
      draft.currency,
      draft.title,
      draft.occurredOn,
      draft.recurrence,
      now,
      id,
      draft.spaceId,
    );
    if (result.changes !== 1) {
      throw new Error('El movimiento local ya no está disponible');
    }
  }

  return [{ ...draft, id, updatedAt: now }];
}

export async function archiveLocalTransaction(
  transactionId: string,
  spaceId: string,
): Promise<void> {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  const result = await database.runAsync(
    `UPDATE transactions
        SET is_archived = 1, archived_at = ?, updated_at = ?,
            sync_status = CASE
              WHEN sync_status = 'local_only' THEN 'local_only'
              ELSE 'pending'
            END
      WHERE id = ? AND space_id = ? AND is_archived = 0`,
    now,
    now,
    transactionId,
    spaceId,
  );
  if (result.changes !== 1) {
    throw new Error('El movimiento local ya no está disponible');
  }
}

export async function updateLocalTransactionNote(
  transactionId: string,
  spaceId: string,
  note: string | null,
): Promise<void> {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  const result = await database.runAsync(
    `UPDATE transactions
        SET note = ?, updated_at = ?,
            sync_status = CASE
              WHEN sync_status = 'local_only' THEN 'local_only'
              ELSE 'pending'
            END
      WHERE id = ? AND space_id = ? AND is_archived = 0`,
    note,
    now,
    transactionId,
    spaceId,
  );
  if (result.changes !== 1) {
    throw new Error('El movimiento local ya no está disponible');
  }
}
