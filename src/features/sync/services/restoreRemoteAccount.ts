import { type RemoteAccountSnapshot } from '@/features/sync/gateways/juntossRemoteAccountGateway';
import {
  findLocalIdForRemoteEntity,
  linkRemoteEntity,
} from '@/features/sync/repositories/localRemoteEntityLinkRepository';
import {
  loadSpaces,
  saveSpaces,
} from '@/features/spaces/repositories/localSpaceRepository';
import type { Space } from '@/features/spaces/types';
import { getLocalDatabase } from '@/lib/storage/localDatabase';
import { fetchRemoteAccountSnapshot } from '@/features/sync/gateways/juntossRemoteAccountGateway';
import { fetchRemoteImportReviews } from '@/features/import/gateways/juntossImportReviewGateway';
import { authClient } from '@/lib/auth-client';
import { restoreRemoteImportReviews } from '@/features/sync/services/restoreRemoteImportReviews';

export type RestoredRemoteAccount = {
  spaces: readonly Space[];
  localCategoryIdByRemoteId: ReadonlyMap<string, string>;
  localSpaceIdByRemoteId: ReadonlyMap<string, string>;
};

let restoreQueue: Promise<void> = Promise.resolve();

export async function restoreRemoteAccount(input: {
  userId: string;
  snapshot: RemoteAccountSnapshot;
}): Promise<RestoredRemoteAccount> {
  const stored = await loadSpaces();
  const database = await getLocalDatabase();
  const localSpaceIdByRemoteId = new Map<string, string>();
  const remoteSpaces: Space[] = [];

  for (const remoteSpace of input.snapshot.spaces) {
    const linked = await findLocalIdForRemoteEntity({
      executor: database,
      userId: input.userId,
      entityType: 'space',
      remoteId: remoteSpace.remoteId,
    });
    const localId =
      linked ??
      (remoteSpace.type === 'personal' ? 'personal' : remoteSpace.remoteId);
    await linkRemoteEntity({
      executor: database,
      userId: input.userId,
      entityType: 'space',
      remoteId: remoteSpace.remoteId,
      localId,
    });
    localSpaceIdByRemoteId.set(remoteSpace.remoteId, localId);
    remoteSpaces.push({
      id: localId,
      name: remoteSpace.name,
      type: remoteSpace.type,
      currency: remoteSpace.currency,
    });
  }

  const remoteIds = new Set(remoteSpaces.map((space) => space.id));
  const localOnlySpaces = stored.spaces.filter(
    (space) => !remoteIds.has(space.id),
  );
  const spaces = [...localOnlySpaces, ...remoteSpaces];
  const activeSpaceId = spaces.some(
    (space) => space.id === stored.activeSpaceId,
  )
    ? stored.activeSpaceId
    : spaces[0]?.id;
  if (!activeSpaceId)
    throw new Error('La cuenta remota no tiene espacios activos');
  await saveSpaces({ spaces, activeSpaceId });

  const localCategoryIdByRemoteId = new Map<string, string>();
  const localMoneyAccountIdByRemoteId = new Map<string, string>();
  const currencyBySpaceRemoteId = new Map(
    input.snapshot.spaces.map((space) => [space.remoteId, space.currency]),
  );
  await database.withExclusiveTransactionAsync(async (transaction) => {
    for (const remoteCategory of input.snapshot.categories) {
      const spaceId = localSpaceIdByRemoteId.get(remoteCategory.spaceRemoteId);
      if (!spaceId) continue;
      const linked = await findLocalIdForRemoteEntity({
        executor: transaction,
        userId: input.userId,
        entityType: 'category',
        remoteId: remoteCategory.remoteId,
      });
      const categoryId = await linkRemoteEntity({
        executor: transaction,
        userId: input.userId,
        entityType: 'category',
        remoteId: remoteCategory.remoteId,
        localId: linked ?? remoteCategory.remoteId,
      });
      localCategoryIdByRemoteId.set(remoteCategory.remoteId, categoryId);
      await transaction.runAsync(
        `INSERT INTO categories (
           id, space_id, name, icon, color_token, budget_minor, is_default,
           template_key, note, source_category_id, created_by, sync_status,
           is_archived, created_at, updated_at, archived_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, 'synced', ?, ?, ?, NULL)
         ON CONFLICT (id) DO UPDATE SET
           space_id = excluded.space_id, name = excluded.name,
           icon = excluded.icon, color_token = excluded.color_token,
           budget_minor = excluded.budget_minor,
           is_default = excluded.is_default, template_key = excluded.template_key,
           is_archived = excluded.is_archived, updated_at = excluded.updated_at
         WHERE categories.sync_status = 'synced'`,
        categoryId,
        spaceId,
        remoteCategory.name,
        remoteCategory.icon,
        remoteCategory.colorToken,
        remoteCategory.budgets.find(
          (budget) =>
            budget.currency ===
            currencyBySpaceRemoteId.get(remoteCategory.spaceRemoteId),
        )?.budgetMinor ?? null,
        remoteCategory.isDefault ? 1 : 0,
        remoteCategory.templateKey,
        remoteCategory.remoteId,
        input.userId,
        remoteCategory.isArchived ? 1 : 0,
        remoteCategory.createdAt,
        remoteCategory.updatedAt,
      );

      for (const budget of remoteCategory.budgets) {
        await transaction.runAsync(
          `INSERT INTO category_budgets (
             id, category_id, currency, budget_minor, sync_status,
             created_at, updated_at
           ) VALUES (?, ?, ?, ?, 'synced', ?, ?)
           ON CONFLICT (category_id, currency) DO UPDATE SET
             budget_minor = excluded.budget_minor,
             updated_at = excluded.updated_at
           WHERE category_budgets.sync_status = 'synced'`,
          `${categoryId}:${budget.currency}`,
          categoryId,
          budget.currency,
          budget.budgetMinor,
          remoteCategory.createdAt,
          remoteCategory.updatedAt,
        );
      }
    }
    for (const remoteAccount of input.snapshot.moneyAccounts) {
      const spaceId = localSpaceIdByRemoteId.get(remoteAccount.spaceRemoteId);
      if (!spaceId) continue;
      const linked = await findLocalIdForRemoteEntity({
        executor: transaction,
        userId: input.userId,
        entityType: 'money_account',
        remoteId: remoteAccount.remoteId,
      });
      const moneyAccountId = await linkRemoteEntity({
        executor: transaction,
        userId: input.userId,
        entityType: 'money_account',
        remoteId: remoteAccount.remoteId,
        localId: linked ?? remoteAccount.remoteId,
      });
      localMoneyAccountIdByRemoteId.set(remoteAccount.remoteId, moneyAccountId);
      await transaction.runAsync(
        `INSERT INTO money_accounts (
           id, space_id, name, kind, icon, color_token, currency,
           opening_balance_minor, created_by, sync_status, is_archived,
           created_at, updated_at, archived_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'synced', ?, ?, ?, NULL)
         ON CONFLICT (id) DO UPDATE SET
           space_id = excluded.space_id, name = excluded.name,
           kind = excluded.kind, icon = excluded.icon,
           color_token = excluded.color_token, currency = excluded.currency,
           is_archived = excluded.is_archived, updated_at = excluded.updated_at
         WHERE money_accounts.sync_status = 'synced'`,
        moneyAccountId,
        spaceId,
        remoteAccount.name,
        remoteAccount.kind,
        remoteAccount.icon,
        remoteAccount.colorToken,
        remoteAccount.currency,
        input.userId,
        remoteAccount.isArchived ? 1 : 0,
        remoteAccount.createdAt,
        remoteAccount.updatedAt,
      );

      await transaction.runAsync(
        `DELETE FROM money_account_balances WHERE money_account_id = ?`,
        moneyAccountId,
      );
      for (const [position, balance] of remoteAccount.balances.entries()) {
        await transaction.runAsync(
          `INSERT INTO money_account_balances (
             id, money_account_id, currency, opening_balance_minor, position,
             created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          `${moneyAccountId}--${balance.currency}`,
          moneyAccountId,
          balance.currency,
          balance.openingBalanceMinor,
          position,
          remoteAccount.createdAt,
          remoteAccount.updatedAt,
        );
      }
    }
    for (const series of input.snapshot.recurringSeries) {
      const spaceId = localSpaceIdByRemoteId.get(series.spaceRemoteId);
      const categoryId = localCategoryIdByRemoteId.get(series.categoryRemoteId);
      if (!spaceId || !categoryId) continue;
      await transaction.runAsync(
        `INSERT INTO recurring_transaction_series (
           id, space_id, category_id, money_account_id, created_by, type,
           amount_minor, currency,
           title, frequency, starts_on, generated_occurrences, next_occurrence_on,
           sync_status, is_archived, created_at, updated_at, archived_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           category_id = excluded.category_id,
           money_account_id = excluded.money_account_id, type = excluded.type,
           amount_minor = excluded.amount_minor, currency = excluded.currency,
           title = excluded.title, frequency = excluded.frequency,
           starts_on = excluded.starts_on,
           generated_occurrences = excluded.generated_occurrences,
           next_occurrence_on = excluded.next_occurrence_on,
           is_archived = excluded.is_archived, updated_at = excluded.updated_at,
           archived_at = excluded.archived_at
         WHERE recurring_transaction_series.sync_status = 'synced'`,
        series.remoteId,
        spaceId,
        categoryId,
        (series.moneyAccountRemoteId
          ? localMoneyAccountIdByRemoteId.get(series.moneyAccountRemoteId)
          : null) ?? null,
        // La API permite movimientos antiguos sin autor. SQLite no: al
        // restaurarlos se atribuyen a la cuenta propietaria de esta copia.
        series.createdBy ?? input.userId,
        series.type,
        series.amountMinor,
        series.currency,
        series.title,
        series.frequency,
        series.startsOn,
        series.generatedOccurrences,
        series.nextOccurrenceOn,
        series.isArchived ? 1 : 0,
        series.createdAt,
        series.updatedAt,
        series.archivedAt,
      );
    }
    for (const remoteTransaction of input.snapshot.transactions) {
      const spaceId = localSpaceIdByRemoteId.get(
        remoteTransaction.spaceRemoteId,
      );
      const categoryId = localCategoryIdByRemoteId.get(
        remoteTransaction.categoryRemoteId,
      );
      if (!spaceId || !categoryId) continue;
      const transactionId = await linkRemoteEntity({
        executor: transaction,
        userId: input.userId,
        entityType: 'transaction',
        remoteId: remoteTransaction.remoteId,
        localId: remoteTransaction.remoteId,
      });
      await transaction.runAsync(
        `INSERT INTO transactions (
           id, space_id, category_id, money_account_id, created_by, type,
           amount_minor, currency,
           title, occurred_on, recurrence, recurrence_group_id,
           recurrence_series_id, source_transaction_id, note, sync_status,
           is_archived, created_at, updated_at, archived_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           category_id = excluded.category_id,
           money_account_id = excluded.money_account_id, type = excluded.type,
           amount_minor = excluded.amount_minor, currency = excluded.currency,
           title = excluded.title, occurred_on = excluded.occurred_on,
           recurrence = excluded.recurrence,
           recurrence_group_id = excluded.recurrence_group_id,
           recurrence_series_id = excluded.recurrence_series_id,
           note = excluded.note,
           is_archived = excluded.is_archived, updated_at = excluded.updated_at,
           archived_at = excluded.archived_at
         WHERE transactions.sync_status = 'synced'`,
        transactionId,
        spaceId,
        categoryId,
        (remoteTransaction.moneyAccountRemoteId
          ? localMoneyAccountIdByRemoteId.get(
              remoteTransaction.moneyAccountRemoteId,
            )
          : null) ?? null,
        remoteTransaction.createdBy ?? input.userId,
        remoteTransaction.type,
        remoteTransaction.amountMinor,
        remoteTransaction.currency,
        remoteTransaction.title,
        remoteTransaction.occurredOn,
        remoteTransaction.recurrence,
        remoteTransaction.recurrenceGroupId,
        remoteTransaction.recurrenceSeriesRemoteId,
        remoteTransaction.sourceTransactionId,
        remoteTransaction.note,
        remoteTransaction.isArchived ? 1 : 0,
        remoteTransaction.createdAt,
        remoteTransaction.updatedAt,
        remoteTransaction.archivedAt,
      );
    }
  });

  return { spaces, localCategoryIdByRemoteId, localSpaceIdByRemoteId };
}

export async function restoreRemoteAccountForCurrentSession(): Promise<RestoredRemoteAccount> {
  const { data } = await authClient.getSession();
  const userId = data?.user?.id;
  if (!userId) {
    throw new Error('Debes iniciar sesión antes de restaurar tus datos');
  }

  const task = restoreQueue
    .catch(() => undefined)
    .then(async () => {
      const snapshot = await fetchRemoteAccountSnapshot();
      const restored = await restoreRemoteAccount({ userId, snapshot });
      // La API ya filtra las revisiones por usuario, así que no hace falta pasarle
      // los espacios.
      await restoreRemoteImportReviews({
        reviews: await fetchRemoteImportReviews(),
        restored,
      });
      return restored;
    });
  restoreQueue = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
}
