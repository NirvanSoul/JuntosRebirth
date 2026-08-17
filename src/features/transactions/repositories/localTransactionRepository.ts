import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  CreateTransactionDraft,
  SessionTransaction,
} from '@/features/transactions/types';
import {
  materializeDueRecurringTransactions,
  materializeRecurringSeriesThroughDate,
  type RecurringSeriesRow,
} from '@/features/transactions/repositories/localTransactionMaterialization';
import {
  assertMoneyAccountAssignment,
  assertTransaction,
  resolveLocalAuthorId,
} from '@/features/transactions/repositories/localTransactionGuards';
import {
  automaticRecurrences,
  mapTransaction,
  type TransactionRow,
} from '@/features/transactions/repositories/transactionRowMapper';
import { getLocalTodayKey } from '@/lib/date/localDate';
import {
  getRecurrenceOccurrenceDate,
  normalizeCustomOccurrenceDates,
  parseProjectedTransactionId,
  type AutomaticTransactionRecurrence,
} from '@/features/transactions/utils/transactionRecurrence';
import { getLocalDatabase } from '@/lib/storage/localDatabase';
import { getOrCreateInstallationId } from '@/lib/storage/localIdentity';

type ExistingTransactionRow = {
  occurred_on: string;
  recurrence: string;
  recurrence_series_id: string | null;
  created_by: string;
};

export { materializeDueRecurringTransactions };

export type CreateLocalTransactionInput = CreateTransactionDraft & {
  id?: string;
  sourceTransactionId?: string;
};

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
       id, space_id, category_id, money_account_id, created_by, type,
       amount_minor, currency,
       title, occurred_on, recurrence, recurrence_group_id,
       recurrence_series_id,
       source_transaction_id, sync_status, is_archived, created_at, updated_at,
       archived_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'local_only', 0, ?, ?, NULL)`,
    id,
    input.spaceId,
    input.categoryId,
    input.moneyAccountId ?? null,
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

export async function listLocalTransactions(): Promise<SessionTransaction[]> {
  const database = await getLocalDatabase();
  await materializeDueRecurringTransactions(database);
  const rows = await database.getAllAsync<TransactionRow>(
    `SELECT transactions.id, transactions.space_id, transactions.category_id,
            transactions.money_account_id,
            transactions.created_by,
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
  await assertMoneyAccountAssignment(database, input);
  const createdBy = await resolveLocalAuthorId(database);
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
           id, space_id, category_id, money_account_id, created_by, type,
           amount_minor, currency,
           title, frequency, starts_on, generated_occurrences,
           next_occurrence_on, sync_status, is_archived, created_at, updated_at,
           archived_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'local_only', 0, ?, ?, NULL)`,
        seriesId,
        input.spaceId,
        input.categoryId,
        input.moneyAccountId ?? null,
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
    moneyAccountId: input.moneyAccountId,
    createdBy,
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
  for (const input of inputs) {
    await assertMoneyAccountAssignment(database, input);
  }
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
    moneyAccountId: input.moneyAccountId,
    createdBy,
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
  await assertMoneyAccountAssignment(database, draft);
  const projectedIdentity = parseProjectedTransactionId(id);

  if (projectedIdentity) {
    const series = await database.getFirstAsync<RecurringSeriesRow>(
      `SELECT id, space_id, category_id, money_account_id, created_by, type,
              amount_minor,
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
      `SELECT occurred_on, recurrence, recurrence_series_id, created_by
         FROM transactions
        WHERE id = ? AND space_id = ? AND is_archived = 0`,
      id,
      draft.spaceId,
    );
  // Editar un movimiento no reasigna su autoría: quien lo creó sigue siendo su
  // autor aunque lo modifique la otra persona del espacio.
  const createdBy =
    existingTransaction?.created_by ?? (await resolveLocalAuthorId(database));

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
            SET category_id = ?, money_account_id = ?, type = ?,
                amount_minor = ?, currency = ?,
                title = ?, occurred_on = ?, recurrence = 'custom',
                recurrence_group_id = ?, recurrence_series_id = NULL,
                updated_at = ?,
                sync_status = CASE
                  WHEN sync_status = 'local_only' THEN 'local_only'
                  ELSE 'pending'
                END
          WHERE id = ? AND space_id = ? AND is_archived = 0`,
        draft.categoryId,
        draft.moneyAccountId ?? null,
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
      moneyAccountId: draft.moneyAccountId,
      createdBy,
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
           id, space_id, category_id, money_account_id, created_by, type,
           amount_minor, currency,
           title, frequency, starts_on, generated_occurrences,
           next_occurrence_on, sync_status, is_archived, created_at, updated_at,
           archived_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'local_only', 0, ?, ?, NULL)`,
        seriesId,
        draft.spaceId,
        draft.categoryId,
        draft.moneyAccountId ?? null,
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
            SET category_id = ?, money_account_id = ?, type = ?,
                amount_minor = ?, currency = ?,
                title = ?, occurred_on = ?, recurrence = ?,
                recurrence_group_id = NULL, recurrence_series_id = ?,
                updated_at = ?,
                sync_status = CASE
                  WHEN sync_status = 'local_only' THEN 'local_only'
                  ELSE 'pending'
                END
          WHERE id = ? AND space_id = ? AND is_archived = 0`,
        draft.categoryId,
        draft.moneyAccountId ?? null,
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
      createdBy,
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
            SET category_id = ?, money_account_id = ?, type = ?,
                amount_minor = ?, currency = ?,
                title = ?, occurred_on = ?, recurrence = ?,
                recurrence_group_id = NULL, updated_at = ?,
                sync_status = CASE
                  WHEN sync_status = 'local_only' THEN 'local_only'
                  ELSE 'pending'
                END
          WHERE id = ? AND space_id = ? AND is_archived = 0`,
        draft.categoryId,
        draft.moneyAccountId ?? null,
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
            SET category_id = ?, money_account_id = ?, type = ?,
                amount_minor = ?, currency = ?,
                title = ?, updated_at = ?,
                sync_status = CASE
                  WHEN sync_status = 'local_only' THEN 'local_only'
                  ELSE 'pending'
                END
          WHERE recurrence_series_id = ? AND occurred_on > ?
            AND space_id = ? AND is_archived = 0`,
        draft.categoryId,
        draft.moneyAccountId ?? null,
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
            SET category_id = ?, money_account_id = ?, type = ?,
                amount_minor = ?, currency = ?,
                title = ?, updated_at = ?,
                sync_status = CASE
                  WHEN sync_status = 'local_only' THEN 'local_only'
                  ELSE 'pending'
                END
          WHERE id = ? AND space_id = ? AND is_archived = 0`,
        draft.categoryId,
        draft.moneyAccountId ?? null,
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
              transactions.category_id, transactions.money_account_id,
              transactions.created_by,
              transactions.type,
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
            SET category_id = ?, money_account_id = ?, type = ?,
                amount_minor = ?, currency = ?,
                title = ?, occurred_on = ?, recurrence = ?,
                recurrence_group_id = NULL, recurrence_series_id = NULL,
                updated_at = ?,
                sync_status = CASE
                  WHEN sync_status = 'local_only' THEN 'local_only'
                  ELSE 'pending'
                END
          WHERE id = ? AND space_id = ? AND is_archived = 0`,
        draft.categoryId,
        draft.moneyAccountId ?? null,
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
          SET category_id = ?, money_account_id = ?, type = ?,
              amount_minor = ?, currency = ?,
              title = ?, occurred_on = ?, recurrence = ?,
              recurrence_group_id = NULL, recurrence_series_id = NULL,
              updated_at = ?,
              sync_status = CASE
                WHEN sync_status = 'local_only' THEN 'local_only'
                ELSE 'pending'
              END
        WHERE id = ? AND space_id = ? AND is_archived = 0`,
      draft.categoryId,
      draft.moneyAccountId ?? null,
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

  return [{ ...draft, id, createdBy, updatedAt: now }];
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
