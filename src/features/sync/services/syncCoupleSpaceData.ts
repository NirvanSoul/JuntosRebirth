import { getOrCreateInstallationId } from '@/lib/storage/localIdentity';
import { getLocalDatabase } from '@/lib/storage/localDatabase';
import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import { syncCoupleSpaceRemotely } from '@/features/sync/gateways/juntossCoupleSpaceSyncGateway';
import { findRemoteIdForLocalEntity } from '@/features/sync/repositories/localRemoteEntityLinkRepository';

type SyncRow = { id: string; updated_at: string } & Record<string, unknown>;

type MoneyAccountBalanceRow = {
  money_account_id: string;
} & Record<string, unknown>;

type CategoryBudgetRow = {
  category_id: string;
  currency: string;
  budgetAmountMinor: number;
};

type CoupleSpaceSyncResult = {
  categoryCount: number;
  moneyAccountCount: number;
  recurringSeriesCount: number;
  transactionCount: number;
};

const uploadableStatuses = (includeLocalOnly: boolean) =>
  includeLocalOnly
    ? "('local_only', 'pending', 'failed', 'syncing')"
    : "('pending', 'failed', 'syncing')";
const markableStatuses = "('local_only', 'pending', 'failed', 'syncing')";
const inFlightBySpaceId = new Map<string, Promise<CoupleSpaceSyncResult>>();

function serializeRow(row: SyncRow): Record<string, unknown> {
  const { updated_at: updatedAt, ...rest } = row;
  return {
    ...rest,
    ...(typeof rest.isDefault === 'number'
      ? { isDefault: rest.isDefault === 1 }
      : {}),
    ...(typeof rest.isArchived === 'number'
      ? { isArchived: rest.isArchived === 1 }
      : {}),
    remoteId: row.id,
    updatedAt,
  };
}

async function markRowsSynced(
  table:
    | 'categories'
    | 'money_accounts'
    | 'recurring_transaction_series'
    | 'transactions',
  rows: readonly SyncRow[],
): Promise<void> {
  const database = await getLocalDatabase();
  for (const row of rows) {
    await database.runAsync(
      `UPDATE ${table}
          SET sync_status = 'synced'
        WHERE id = ? AND updated_at = ? AND sync_status IN ${markableStatuses}`,
      row.id,
      row.updated_at,
    );
  }
}

async function syncSpaceData(input: {
  spaceId: string;
  includeLocalOnly?: boolean;
}): Promise<CoupleSpaceSyncResult> {
  const database = await getLocalDatabase();
  const installationId = await getOrCreateInstallationId(database);
  const userId = await getAuthenticatedUserId();
  if (!userId) throw new Error('Debes iniciar sesión antes de sincronizar');
  const remoteSpaceId =
    (await findRemoteIdForLocalEntity({
      executor: database,
      userId,
      entityType: 'space',
      localId: input.spaceId,
    })) ?? input.spaceId;
  const statuses = uploadableStatuses(input.includeLocalOnly ?? true);
  const [
    categories,
    categoryBudgets,
    moneyAccounts,
    moneyAccountBalances,
    recurringSeries,
    transactions,
  ] = await Promise.all([
    database.getAllAsync<SyncRow>(
      `SELECT id, name, icon, color_token AS "colorToken",
              budget_minor AS "budgetMinor", is_default AS "isDefault",
              template_key AS "templateKey", is_archived AS "isArchived",
              created_at AS "createdAt", updated_at
         FROM categories
        WHERE space_id = ? AND sync_status IN ${statuses}`,
      input.spaceId,
    ),
    // Los presupuestos por moneda viven en su propia tabla desde que un
    // movimiento puede estar en cualquier divisa. Se leen para todas las
    // categorías del espacio, no solo para las que viajan en este lote: el
    // presupuesto puede cambiar sin que cambie la categoría, y hasta ahora no
    // salía nunca del dispositivo.
    database.getAllAsync<CategoryBudgetRow>(
      `SELECT category_budgets.category_id,
              category_budgets.currency,
              category_budgets.budget_minor AS "budgetAmountMinor"
         FROM category_budgets
         JOIN categories ON categories.id = category_budgets.category_id
        WHERE categories.space_id = ?
        ORDER BY category_budgets.currency ASC`,
      input.spaceId,
    ),
    database.getAllAsync<SyncRow>(
      `SELECT id, name, kind, icon, color_token AS "colorToken", currency,
              is_archived AS "isArchived", created_at AS "createdAt",
              updated_at
         FROM money_accounts
        WHERE space_id = ? AND sync_status IN ${statuses}`,
      input.spaceId,
    ),
    database.getAllAsync<MoneyAccountBalanceRow>(
      `SELECT money_account_id, currency,
              opening_balance_minor AS "openingBalanceMinor", position
         FROM money_account_balances
        WHERE money_account_id IN (
          SELECT id FROM money_accounts WHERE space_id = ?
        )
        ORDER BY position ASC`,
      input.spaceId,
    ),
    database.getAllAsync<SyncRow>(
      `SELECT id, category_id AS "categoryId",
              money_account_id AS "moneyAccountId", type,
              amount_minor AS "amountMinor", currency, title,
              frequency, starts_on AS "startsOn",
              generated_occurrences AS "generatedOccurrences",
              next_occurrence_on AS "nextOccurrenceOn",
              is_archived AS "isArchived", created_at AS "createdAt", updated_at
         FROM recurring_transaction_series
        WHERE space_id = ? AND sync_status IN ${statuses}`,
      input.spaceId,
    ),
    database.getAllAsync<SyncRow>(
      `SELECT id, category_id AS "categoryId",
              money_account_id AS "moneyAccountId", type,
              amount_minor AS "amountMinor", currency, title,
              occurred_on AS "occurredOn", note, recurrence,
              recurrence_group_id AS "recurrenceGroupId",
              recurrence_series_id AS "recurrenceSeriesId",
              source_transaction_id AS "sourceTransactionId",
              is_archived AS "isArchived", created_at AS "createdAt", updated_at
         FROM transactions
        WHERE space_id = ? AND sync_status IN ${statuses}`,
      input.spaceId,
    ),
  ]);

  if (
    categories.length === 0 &&
    moneyAccounts.length === 0 &&
    recurringSeries.length === 0 &&
    transactions.length === 0
  ) {
    return {
      categoryCount: 0,
      moneyAccountCount: 0,
      recurringSeriesCount: 0,
      transactionCount: 0,
    };
  }

  await syncCoupleSpaceRemotely({
    installationId,
    spaceId: remoteSpaceId,
    // Cada categoría viaja con sus presupuestos por moneda. `budgetMinor`
    // sigue yendo para el servidor que solo entiende un importe único, en la
    // moneda del espacio; `budgets` lleva el modelo multidivisa completo.
    categories: categories.map((row) => {
      const budgets = categoryBudgets
        .filter((budget) => budget.category_id === row.id)
        .map(({ category_id: _categoryId, ...budget }) => budget);
      return { ...serializeRow(row), budgets };
    }),
    // Cada cuenta viaja con sus monedas: el RPC las reescribe enteras, así
    // que una divisa retirada aquí desaparece también en el otro dispositivo.
    moneyAccounts: moneyAccounts.map((row) => ({
      ...serializeRow(row),
      balances: moneyAccountBalances
        .filter((balance) => balance.money_account_id === row.id)
        .map(({ money_account_id: _accountId, ...balance }) => balance),
    })),
    recurringSeries: recurringSeries.map(serializeRow),
    transactions: transactions.map(serializeRow),
  });

  await Promise.all([
    markRowsSynced('categories', categories),
    markRowsSynced('money_accounts', moneyAccounts),
    markRowsSynced('recurring_transaction_series', recurringSeries),
    markRowsSynced('transactions', transactions),
  ]);

  return {
    categoryCount: categories.length,
    moneyAccountCount: moneyAccounts.length,
    recurringSeriesCount: recurringSeries.length,
    transactionCount: transactions.length,
  };
}

/**
 * Serializa los lotes de cada espacio accesible, incluido el personal. Si una
 * persona crea una categoría y acto seguido un gasto, el segundo lote ve la
 * categoría ya confirmada o la publica junto con el gasto; nunca compiten en
 * el dispositivo.
 */
export function syncSpaceDataForCurrentSession(input: {
  spaceId: string;
  /** Los datos de invitado se suben solo tras confirmar su migración. */
  includeLocalOnly?: boolean;
}): Promise<CoupleSpaceSyncResult> {
  const previous = inFlightBySpaceId.get(input.spaceId) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(() => syncSpaceData(input));
  inFlightBySpaceId.set(input.spaceId, next);
  void next.finally(() => {
    if (inFlightBySpaceId.get(input.spaceId) === next) {
      inFlightBySpaceId.delete(input.spaceId);
    }
  });
  return next;
}
