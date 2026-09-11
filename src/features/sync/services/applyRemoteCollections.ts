import type {
  RemoteAccountCategory,
  RemoteAccountMoneyAccount,
  RemoteAccountSeries,
  RemoteAccountTransaction,
} from '@/features/sync/gateways/juntossRemoteAccountGateway';
import {
  loadRemoteEntityLinks,
  upsertRemoteEntityLink,
  type RemoteEntityType,
} from '@/features/sync/repositories/localRemoteEntityLinkRepository';
import type { LocalSqlExecutor } from '@/lib/storage/localSqlExecutor';

export async function createLinkResolver(input: {
  executor: LocalSqlExecutor;
  userId: string;
  entityType: RemoteEntityType;
  resolveOnly?: boolean;
}): Promise<(remoteId: string) => Promise<string | null>> {
  const links = await loadRemoteEntityLinks(input);
  return async (remoteId) => {
    const existing = links.get(remoteId);
    if (input.resolveOnly) {
      return existing ?? null;
    }
    const localId = existing ?? remoteId;
    await upsertRemoteEntityLink({ ...input, remoteId, localId });
    return localId;
  };
}

export type ApplyRemoteCollectionsInput = {
  userId: string;
  collections: {
    categories: readonly RemoteAccountCategory[];
    moneyAccounts: readonly RemoteAccountMoneyAccount[];
    recurringSeries: readonly RemoteAccountSeries[];
    transactions: readonly RemoteAccountTransaction[];
  };
  localSpaceIdByRemoteId: ReadonlyMap<string, string>;
  currencyBySpaceRemoteId: ReadonlyMap<string, string>;
  linkMode: 'full' | 'delta';
};

export async function applyRemoteCollections(
  transaction: LocalSqlExecutor,
  input: ApplyRemoteCollectionsInput,
): Promise<{
  receivedRows: number;
  localCategoryIdByRemoteId: Map<string, string>;
}> {
  const linkCategory = await createLinkResolver({
    executor: transaction,
    userId: input.userId,
    entityType: 'category',
  });
  const linkMoneyAccount = await createLinkResolver({
    executor: transaction,
    userId: input.userId,
    entityType: 'money_account',
  });
  const linkTransaction = await createLinkResolver({
    executor: transaction,
    userId: input.userId,
    entityType: 'transaction',
  });

  const resolveCategoryOnly =
    input.linkMode === 'delta'
      ? await createLinkResolver({
          executor: transaction,
          userId: input.userId,
          entityType: 'category',
          resolveOnly: true,
        })
      : null;

  const resolveMoneyAccountOnly =
    input.linkMode === 'delta'
      ? await createLinkResolver({
          executor: transaction,
          userId: input.userId,
          entityType: 'money_account',
          resolveOnly: true,
        })
      : null;

  const localCategoryIdByRemoteId = new Map<string, string>();
  const localMoneyAccountIdByRemoteId = new Map<string, string>();

  for (const remoteCategory of input.collections.categories) {
    const spaceId = input.localSpaceIdByRemoteId.get(
      remoteCategory.spaceRemoteId,
    );
    if (!spaceId) continue;
    const categoryId = (await linkCategory(remoteCategory.remoteId))!;
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
          input.currencyBySpaceRemoteId.get(remoteCategory.spaceRemoteId),
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

  for (const remoteAccount of input.collections.moneyAccounts) {
    const spaceId = input.localSpaceIdByRemoteId.get(
      remoteAccount.spaceRemoteId,
    );
    if (!spaceId) continue;
    const moneyAccountId = (await linkMoneyAccount(remoteAccount.remoteId))!;
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

  for (const series of input.collections.recurringSeries) {
    const spaceId = input.localSpaceIdByRemoteId.get(series.spaceRemoteId);
    let categoryId = localCategoryIdByRemoteId.get(series.categoryRemoteId);
    if (!categoryId && resolveCategoryOnly) {
      categoryId =
        (await resolveCategoryOnly(series.categoryRemoteId)) ?? undefined;
    }
    if (!spaceId || !categoryId) continue;

    let moneyAccountId = series.moneyAccountRemoteId
      ? localMoneyAccountIdByRemoteId.get(series.moneyAccountRemoteId)
      : null;
    if (
      !moneyAccountId &&
      series.moneyAccountRemoteId &&
      resolveMoneyAccountOnly
    ) {
      moneyAccountId =
        (await resolveMoneyAccountOnly(series.moneyAccountRemoteId)) ?? null;
    }

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
      moneyAccountId ?? null,
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

  for (const remoteTransaction of input.collections.transactions) {
    const spaceId = input.localSpaceIdByRemoteId.get(
      remoteTransaction.spaceRemoteId,
    );
    let categoryId = localCategoryIdByRemoteId.get(
      remoteTransaction.categoryRemoteId,
    );
    if (!categoryId && resolveCategoryOnly) {
      categoryId =
        (await resolveCategoryOnly(remoteTransaction.categoryRemoteId)) ??
        undefined;
    }
    if (!spaceId || !categoryId) continue;

    let moneyAccountId = remoteTransaction.moneyAccountRemoteId
      ? localMoneyAccountIdByRemoteId.get(
          remoteTransaction.moneyAccountRemoteId,
        )
      : null;
    if (
      !moneyAccountId &&
      remoteTransaction.moneyAccountRemoteId &&
      resolveMoneyAccountOnly
    ) {
      moneyAccountId =
        (await resolveMoneyAccountOnly(
          remoteTransaction.moneyAccountRemoteId,
        )) ?? null;
    }

    const transactionId = (await linkTransaction(remoteTransaction.remoteId))!;
    await transaction.runAsync(
      `INSERT INTO transactions (
         id, space_id, category_id, money_account_id, created_by, type,
         amount_minor, currency,
         title, occurred_on, recurrence, recurrence_group_id,
         recurrence_series_id, source_transaction_id, note, sync_status,
           accounting_amount_minor_usd, exchange_snapshot_json,
         is_archived, created_at, updated_at, archived_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                 'synced', ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         category_id = excluded.category_id,
         money_account_id = excluded.money_account_id, type = excluded.type,
         amount_minor = excluded.amount_minor, currency = excluded.currency,
         title = excluded.title, occurred_on = excluded.occurred_on,
         recurrence = excluded.recurrence,
         recurrence_group_id = excluded.recurrence_group_id,
         recurrence_series_id = excluded.recurrence_series_id,
         note = excluded.note,
         accounting_amount_minor_usd = excluded.accounting_amount_minor_usd,
         exchange_snapshot_json = excluded.exchange_snapshot_json,
         is_archived = excluded.is_archived, updated_at = excluded.updated_at,
         archived_at = excluded.archived_at
       WHERE transactions.sync_status = 'synced'`,
      transactionId,
      spaceId,
      categoryId,
      moneyAccountId ?? null,
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
      remoteTransaction.accountingAmountMinorUsd ?? null,
      remoteTransaction.exchangeSnapshot
        ? JSON.stringify(remoteTransaction.exchangeSnapshot)
        : null,
      remoteTransaction.isArchived ? 1 : 0,
      remoteTransaction.createdAt,
      remoteTransaction.updatedAt,
      remoteTransaction.archivedAt,
    );
  }

  const receivedRows =
    input.collections.categories.length +
    input.collections.moneyAccounts.length +
    input.collections.recurringSeries.length +
    input.collections.transactions.length;

  return { receivedRows, localCategoryIdByRemoteId };
}
