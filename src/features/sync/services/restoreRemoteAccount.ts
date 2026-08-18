import { type RemoteAccountSnapshot } from '@/features/sync/gateways/supabaseRemoteAccountGateway';
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
import { getConfiguredSupabaseClient } from '@/lib/supabase/supabaseClient';
import { fetchRemoteAccountSnapshot } from '@/features/sync/gateways/supabaseRemoteAccountGateway';
import {
  fetchRemoteImportReviews,
  type RemoteImportReview,
} from '@/features/import/gateways/supabaseImportReviewReadGateway';

export type RestoredRemoteAccount = {
  spaces: readonly Space[];
  localCategoryIdByRemoteId: ReadonlyMap<string, string>;
  localSpaceIdByRemoteId: ReadonlyMap<string, string>;
};

function optionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

/**
 * Materializa solo entidades remotas que no tienen modificaciones locales.
 * Los enlaces persistentes evitan inferir categorías por nombre y conservan
 * una identidad local estable entre restauraciones.
 */
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
        remoteCategory.budgetMinor,
        remoteCategory.isDefault ? 1 : 0,
        remoteCategory.templateKey,
        remoteCategory.remoteId,
        input.userId,
        remoteCategory.isArchived ? 1 : 0,
        remoteCategory.createdAt,
        remoteCategory.updatedAt,
      );
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

      // Las monedas se reescriben enteras, como en la subida: si el otro
      // dispositivo retiró una divisa, aquí tampoco debe quedar.
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
      const spaceId = localSpaceIdByRemoteId.get(String(series.space_id));
      const categoryId = localCategoryIdByRemoteId.get(
        String(series.category_id),
      );
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
        String(series.id),
        spaceId,
        categoryId,
        localMoneyAccountIdByRemoteId.get(String(series.money_account_id)) ??
          null,
        String(series.created_by),
        String(series.type),
        Number(series.amount_minor),
        String(series.currency),
        String(series.title),
        String(series.frequency),
        String(series.starts_on),
        Number(series.generated_occurrences),
        String(series.next_occurrence_on),
        series.is_archived ? 1 : 0,
        String(series.created_at),
        String(series.updated_at),
        optionalString(series.archived_at),
      );
    }
    for (const remoteTransaction of input.snapshot.transactions) {
      const spaceId = localSpaceIdByRemoteId.get(
        String(remoteTransaction.space_id),
      );
      const categoryId = localCategoryIdByRemoteId.get(
        String(remoteTransaction.category_id),
      );
      if (!spaceId || !categoryId) continue;
      const transactionId = await linkRemoteEntity({
        executor: transaction,
        userId: input.userId,
        entityType: 'transaction',
        remoteId: String(remoteTransaction.id),
        localId: String(remoteTransaction.id),
      });
      await transaction.runAsync(
        `INSERT INTO transactions (
           id, space_id, category_id, money_account_id, created_by, type,
           amount_minor, currency,
           title, occurred_on, recurrence, recurrence_group_id,
           recurrence_series_id, source_transaction_id, note, sync_status,
           is_archived, created_at, updated_at, archived_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'synced', ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           category_id = excluded.category_id,
           money_account_id = excluded.money_account_id, type = excluded.type,
           amount_minor = excluded.amount_minor, currency = excluded.currency,
           title = excluded.title, occurred_on = excluded.occurred_on,
           recurrence = excluded.recurrence,
           recurrence_group_id = excluded.recurrence_group_id,
           recurrence_series_id = excluded.recurrence_series_id,
           is_archived = excluded.is_archived, updated_at = excluded.updated_at,
           archived_at = excluded.archived_at
         WHERE transactions.sync_status = 'synced'`,
        transactionId,
        spaceId,
        categoryId,
        localMoneyAccountIdByRemoteId.get(
          String(remoteTransaction.money_account_id),
        ) ?? null,
        String(remoteTransaction.created_by),
        String(remoteTransaction.type),
        Number(remoteTransaction.amount_minor),
        String(remoteTransaction.currency),
        String(remoteTransaction.title),
        String(remoteTransaction.occurred_on),
        String(remoteTransaction.recurrence),
        optionalString(remoteTransaction.recurrence_group_id),
        optionalString(remoteTransaction.recurrence_series_id),
        optionalString(remoteTransaction.source_local_transaction_id),
        remoteTransaction.is_archived ? 1 : 0,
        String(remoteTransaction.created_at),
        String(remoteTransaction.updated_at),
        optionalString(remoteTransaction.archived_at),
      );
    }
  });

  return { spaces, localCategoryIdByRemoteId, localSpaceIdByRemoteId };
}

export async function restoreRemoteAccountForCurrentSession(): Promise<RestoredRemoteAccount> {
  const client = getConfiguredSupabaseClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    throw new Error('Debes iniciar sesión antes de restaurar tus datos');
  }
  const snapshot = await fetchRemoteAccountSnapshot(client);
  const restored = await restoreRemoteAccount({
    userId: data.user.id,
    snapshot,
  });
  await restoreRemoteImportReviews({
    reviews: await fetchRemoteImportReviews({
      client,
      spaceRemoteIds: snapshot.spaces.map((space) => space.remoteId),
    }),
    restored,
  });
  return restored;
}

async function restoreRemoteImportReviews(input: {
  reviews: readonly RemoteImportReview[];
  restored: RestoredRemoteAccount;
}): Promise<void> {
  const database = await getLocalDatabase();
  await database.withExclusiveTransactionAsync(async (transaction) => {
    for (const review of input.reviews) {
      const spaceId = input.restored.localSpaceIdByRemoteId.get(
        review.spaceRemoteId,
      );
      if (!spaceId) continue;
      await transaction.runAsync(
        `INSERT INTO import_batches (
           id, space_id, source_type, status, total_items, review_items,
           duplicate_items, sync_status, created_at, updated_at, completed_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           status = excluded.status, total_items = excluded.total_items,
           review_items = excluded.review_items,
           duplicate_items = excluded.duplicate_items,
           updated_at = excluded.updated_at, completed_at = excluded.completed_at
         WHERE import_batches.sync_status = 'synced'`,
        review.id,
        spaceId,
        review.sourceType,
        review.status,
        review.totalItems,
        review.reviewItems,
        review.duplicateItems,
        review.createdAt,
        review.updatedAt,
        review.completedAt,
      );
      for (const item of review.items) {
        const categoryId = item.categoryRemoteId
          ? (input.restored.localCategoryIdByRemoteId.get(
              item.categoryRemoteId,
            ) ?? null)
          : null;
        await transaction.runAsync(
          `INSERT INTO import_items (
             id, batch_id, space_id, source_row, raw_description,
             normalized_merchant, occurred_on, amount_minor, currency,
             movement_type, suggested_category_id, final_category_id,
             duplicate_status, item_status, is_selected, issues, sync_status,
             created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, 'synced', ?, ?)
           ON CONFLICT (id) DO UPDATE SET
             final_category_id = excluded.final_category_id,
             duplicate_status = excluded.duplicate_status,
             item_status = excluded.item_status,
             is_selected = excluded.is_selected, issues = excluded.issues,
             updated_at = excluded.updated_at
           WHERE import_items.sync_status = 'synced'`,
          item.id,
          review.id,
          spaceId,
          item.sourceRow,
          item.rawDescription,
          item.normalizedMerchant,
          item.occurredOn,
          item.amountMinor,
          item.currency,
          item.movementType,
          categoryId,
          item.duplicateStatus,
          item.itemStatus,
          item.selected ? 1 : 0,
          JSON.stringify(item.issues),
          item.createdAt,
          item.updatedAt,
        );
      }
    }
  });
}
