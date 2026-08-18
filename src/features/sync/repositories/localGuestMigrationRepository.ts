import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { Space } from '@/features/spaces/types';
import type {
  GuestMigrationCategory,
  GuestMigrationMoneyAccount,
  GuestMigrationPayload,
} from '@/features/sync/types';
import type {
  CategorySyncRow,
  MoneyAccountBalanceSyncRow,
  MoneyAccountSyncRow,
  SeriesSyncRow,
  SyncAccountRow,
  TransactionSyncRow,
} from '@/features/sync/repositories/guestMigrationRows';
import { getLocalDatabase } from '@/lib/storage/localDatabase';
import { getOrCreateInstallationId } from '@/lib/storage/localIdentity';

const uploadableStatuses = "('local_only', 'pending', 'failed', 'syncing')";

export class GuestDataOwnershipConfirmationRequiredError extends Error {}
export class GuestDataAccountMismatchError extends Error {}

function assertSpacesCoverPayload(
  spaces: readonly Space[],
  categories: readonly CategorySyncRow[],
  moneyAccounts: readonly MoneyAccountSyncRow[],
  series: readonly SeriesSyncRow[],
  transactions: readonly TransactionSyncRow[],
): void {
  const spaceIds = new Set(spaces.map((space) => space.id));
  const missingSpaceId = [
    ...categories,
    ...moneyAccounts,
    ...series,
    ...transactions,
  ].find((row) => !spaceIds.has(row.space_id))?.space_id;
  if (missingSpaceId) {
    throw new Error(`Falta el espacio local ${missingSpaceId} en la migración`);
  }
}

function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}

async function setRowsStatus(
  database: SQLiteDatabase,
  table:
    | 'categories'
    | 'money_accounts'
    | 'recurring_transaction_series'
    | 'transactions',
  ids: readonly string[],
  status: 'syncing' | 'synced' | 'failed',
  onlyIfSyncing = false,
): Promise<void> {
  if (ids.length === 0) return;
  await database.runAsync(
    `UPDATE ${table} SET sync_status = ?
      WHERE id IN (${placeholders(ids.length)})${onlyIfSyncing ? " AND sync_status = 'syncing'" : ''}`,
    status,
    ...ids,
  );
}

async function markRowsSyncedIfUnchanged(
  database: SQLiteDatabase,
  table:
    | 'categories'
    | 'money_accounts'
    | 'recurring_transaction_series'
    | 'transactions',
  rows: readonly { id: string; updatedAt: string }[],
): Promise<void> {
  for (const row of rows) {
    await database.runAsync(
      `UPDATE ${table} SET sync_status = 'synced'
        WHERE id = ? AND updated_at = ? AND sync_status = 'syncing'`,
      row.id,
      row.updatedAt,
    );
  }
}

export async function prepareLocalGuestMigration(
  spaces: readonly Space[],
  userId: string,
  confirmOwnership: boolean,
): Promise<GuestMigrationPayload> {
  if (!userId) throw new Error('La sesión autenticada no es válida');
  const database = await getLocalDatabase();
  const installationId = await getOrCreateInstallationId(database);
  const boundAccount = await database.getFirstAsync<SyncAccountRow>(
    'SELECT user_id FROM local_sync_account WHERE singleton_id = 1',
  );

  if (boundAccount && boundAccount.user_id !== userId) {
    throw new GuestDataAccountMismatchError(
      'Los datos invitados ya están asociados a otra cuenta',
    );
  }
  if (!boundAccount && !confirmOwnership) {
    throw new GuestDataOwnershipConfirmationRequiredError(
      'Confirma que quieres asociar estos datos locales a esta cuenta',
    );
  }
  if (!boundAccount) {
    await database.runAsync(
      `INSERT INTO local_sync_account (singleton_id, user_id, confirmed_at)
       VALUES (1, ?, ?)`,
      userId,
      new Date().toISOString(),
    );
  }

  let categories: CategorySyncRow[] = [];
  let moneyAccounts: MoneyAccountSyncRow[] = [];
  let moneyAccountBalances: MoneyAccountBalanceSyncRow[] = [];
  let series: SeriesSyncRow[] = [];
  let transactions: TransactionSyncRow[] = [];
  const batchId = randomUUID();
  const now = new Date().toISOString();
  await database.withExclusiveTransactionAsync(async (transaction) => {
    [categories, moneyAccounts, moneyAccountBalances, series, transactions] =
      await Promise.all([
        transaction.getAllAsync<CategorySyncRow>(
          `SELECT id, space_id, name, icon, color_token, budget_minor, is_default,
                template_key, source_category_id, is_archived, created_at,
                updated_at, archived_at
           FROM categories WHERE sync_status IN ${uploadableStatuses}`,
        ),
        transaction.getAllAsync<MoneyAccountSyncRow>(
          `SELECT id, space_id, name, kind, icon, color_token, currency,
                opening_balance_minor, is_archived, created_at, updated_at,
                archived_at
           FROM money_accounts WHERE sync_status IN ${uploadableStatuses}`,
        ),
        transaction.getAllAsync<MoneyAccountBalanceSyncRow>(
          `SELECT money_account_id, currency, opening_balance_minor, position
           FROM money_account_balances
          ORDER BY position ASC`,
        ),
        transaction.getAllAsync<SeriesSyncRow>(
          `SELECT id, space_id, category_id, money_account_id, type, amount_minor,
                currency, title,
                frequency, starts_on, generated_occurrences, next_occurrence_on,
                is_archived, created_at, updated_at, archived_at
           FROM recurring_transaction_series
          WHERE sync_status IN ${uploadableStatuses}`,
        ),
        transaction.getAllAsync<TransactionSyncRow>(
          `SELECT id, space_id, category_id, money_account_id, type, amount_minor,
                currency, title,
                occurred_on, recurrence, recurrence_group_id,
                recurrence_series_id, source_transaction_id, is_archived,
                created_at, updated_at, archived_at
           FROM transactions WHERE sync_status IN ${uploadableStatuses}`,
        ),
      ]);
    assertSpacesCoverPayload(
      spaces,
      categories,
      moneyAccounts,
      series,
      transactions,
    );

    await transaction.runAsync(
      `INSERT INTO local_sync_batches (
         id, user_id, installation_id, status, category_count, series_count,
         transaction_count, created_at, updated_at
       ) VALUES (?, ?, ?, 'syncing', ?, ?, ?, ?, ?)`,
      batchId,
      userId,
      installationId,
      categories.length,
      series.length,
      transactions.length,
      now,
      now,
    );
    await setRowsStatus(
      transaction,
      'categories',
      categories.map((row) => row.id),
      'syncing',
    );
    await setRowsStatus(
      transaction,
      'money_accounts',
      moneyAccounts.map((row) => row.id),
      'syncing',
    );
    await setRowsStatus(
      transaction,
      'recurring_transaction_series',
      series.map((row) => row.id),
      'syncing',
    );
    await setRowsStatus(
      transaction,
      'transactions',
      transactions.map((row) => row.id),
      'syncing',
    );
  });

  return {
    batchId,
    installationId,
    userId,
    spaces,
    categories: categories.map((row): GuestMigrationCategory => ({
      id: row.id,
      spaceId: row.space_id,
      name: row.name,
      icon: row.icon,
      colorToken: row.color_token,
      budgetMinor: row.budget_minor,
      isDefault: row.is_default === 1,
      templateKey: row.template_key,
      sourceCategoryId: row.source_category_id,
      isArchived: row.is_archived === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      archivedAt: row.archived_at,
    })),
    moneyAccounts: moneyAccounts.map((row): GuestMigrationMoneyAccount => ({
      id: row.id,
      spaceId: row.space_id,
      name: row.name,
      kind: row.kind,
      icon: row.icon,
      colorToken: row.color_token,
      currency: row.currency,
      balances: moneyAccountBalances
        .filter((balance) => balance.money_account_id === row.id)
        .map((balance) => ({
          currency: balance.currency,
          openingBalanceMinor: balance.opening_balance_minor,
          position: balance.position,
        })),
      isArchived: row.is_archived === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      archivedAt: row.archived_at,
    })),
    recurringSeries: series.map((row) => ({
      id: row.id,
      spaceId: row.space_id,
      categoryId: row.category_id,
      moneyAccountId: row.money_account_id,
      type: row.type,
      amountMinor: row.amount_minor,
      currency: row.currency,
      title: row.title,
      frequency: row.frequency,
      startsOn: row.starts_on,
      generatedOccurrences: row.generated_occurrences,
      nextOccurrenceOn: row.next_occurrence_on,
      isArchived: row.is_archived === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      archivedAt: row.archived_at,
    })),
    transactions: transactions.map((row) => ({
      id: row.id,
      spaceId: row.space_id,
      categoryId: row.category_id,
      moneyAccountId: row.money_account_id,
      type: row.type,
      amountMinor: row.amount_minor,
      currency: row.currency,
      title: row.title,
      occurredOn: row.occurred_on,
      recurrence: row.recurrence,
      recurrenceGroupId: row.recurrence_group_id,
      recurrenceSeriesId: row.recurrence_series_id,
      sourceTransactionId: row.source_transaction_id,
      isArchived: row.is_archived === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      archivedAt: row.archived_at,
    })),
  };
}

export async function completeLocalGuestMigration(
  payload: GuestMigrationPayload,
): Promise<void> {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  await database.withExclusiveTransactionAsync(async (transaction) => {
    await markRowsSyncedIfUnchanged(
      transaction,
      'categories',
      payload.categories,
    );
    await markRowsSyncedIfUnchanged(
      transaction,
      'money_accounts',
      payload.moneyAccounts,
    );
    await markRowsSyncedIfUnchanged(
      transaction,
      'recurring_transaction_series',
      payload.recurringSeries,
    );
    await markRowsSyncedIfUnchanged(
      transaction,
      'transactions',
      payload.transactions,
    );
    await transaction.runAsync(
      `UPDATE local_sync_batches
          SET status = 'completed', updated_at = ?, completed_at = ?
        WHERE id = ? AND user_id = ?`,
      now,
      now,
      payload.batchId,
      payload.userId,
    );
  });
}

export async function failLocalGuestMigration(
  payload: GuestMigrationPayload,
): Promise<void> {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  await database.withExclusiveTransactionAsync(async (transaction) => {
    await setRowsStatus(
      transaction,
      'categories',
      payload.categories.map((row) => row.id),
      'failed',
      true,
    );
    await setRowsStatus(
      transaction,
      'money_accounts',
      payload.moneyAccounts.map((row) => row.id),
      'failed',
      true,
    );
    await setRowsStatus(
      transaction,
      'recurring_transaction_series',
      payload.recurringSeries.map((row) => row.id),
      'failed',
      true,
    );
    await setRowsStatus(
      transaction,
      'transactions',
      payload.transactions.map((row) => row.id),
      'failed',
      true,
    );
    await transaction.runAsync(
      `UPDATE local_sync_batches SET status = 'failed', updated_at = ?
        WHERE id = ? AND user_id = ?`,
      now,
      payload.batchId,
      payload.userId,
    );
  });
}
