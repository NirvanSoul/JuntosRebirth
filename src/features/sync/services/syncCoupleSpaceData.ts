import { getOrCreateInstallationId } from '@/lib/storage/localIdentity';
import { getLocalDatabase } from '@/lib/storage/localDatabase';
import { syncCoupleSpaceRemotely } from '@/features/sync/gateways/supabaseCoupleSpaceSyncGateway';

type SyncRow = { id: string; updated_at: string } & Record<string, unknown>;

type CoupleSpaceSyncResult = {
  categoryCount: number;
  recurringSeriesCount: number;
  transactionCount: number;
};

const uploadableStatuses = "('local_only', 'pending', 'failed', 'syncing')";
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
  table: 'categories' | 'recurring_transaction_series' | 'transactions',
  rows: readonly SyncRow[],
): Promise<void> {
  const database = await getLocalDatabase();
  for (const row of rows) {
    await database.runAsync(
      `UPDATE ${table}
          SET sync_status = 'synced'
        WHERE id = ? AND updated_at = ? AND sync_status IN ${uploadableStatuses}`,
      row.id,
      row.updated_at,
    );
  }
}

async function syncCoupleSpaceData(input: {
  spaceId: string;
}): Promise<CoupleSpaceSyncResult> {
  const database = await getLocalDatabase();
  const installationId = await getOrCreateInstallationId(database);
  const [categories, recurringSeries, transactions] = await Promise.all([
    database.getAllAsync<SyncRow>(
      `SELECT id, name, icon, color_token AS "colorToken",
              budget_minor AS "budgetMinor", is_default AS "isDefault",
              template_key AS "templateKey", is_archived AS "isArchived",
              created_at AS "createdAt", updated_at
         FROM categories
        WHERE space_id = ? AND sync_status IN ${uploadableStatuses}`,
      input.spaceId,
    ),
    database.getAllAsync<SyncRow>(
      `SELECT id, category_id AS "categoryId", type,
              amount_minor AS "amountMinor", currency, title,
              frequency, starts_on AS "startsOn",
              generated_occurrences AS "generatedOccurrences",
              next_occurrence_on AS "nextOccurrenceOn",
              is_archived AS "isArchived", created_at AS "createdAt", updated_at
         FROM recurring_transaction_series
        WHERE space_id = ? AND sync_status IN ${uploadableStatuses}`,
      input.spaceId,
    ),
    database.getAllAsync<SyncRow>(
      `SELECT id, category_id AS "categoryId", type,
              amount_minor AS "amountMinor", currency, title,
              occurred_on AS "occurredOn", recurrence,
              recurrence_group_id AS "recurrenceGroupId",
              recurrence_series_id AS "recurrenceSeriesId",
              source_transaction_id AS "sourceTransactionId",
              is_archived AS "isArchived", created_at AS "createdAt", updated_at
         FROM transactions
        WHERE space_id = ? AND sync_status IN ${uploadableStatuses}`,
      input.spaceId,
    ),
  ]);

  if (
    categories.length === 0 &&
    recurringSeries.length === 0 &&
    transactions.length === 0
  ) {
    return { categoryCount: 0, recurringSeriesCount: 0, transactionCount: 0 };
  }

  await syncCoupleSpaceRemotely({
    installationId,
    spaceId: input.spaceId,
    categories: categories.map(serializeRow),
    recurringSeries: recurringSeries.map(serializeRow),
    transactions: transactions.map(serializeRow),
  });

  await Promise.all([
    markRowsSynced('categories', categories),
    markRowsSynced('recurring_transaction_series', recurringSeries),
    markRowsSynced('transactions', transactions),
  ]);

  return {
    categoryCount: categories.length,
    recurringSeriesCount: recurringSeries.length,
    transactionCount: transactions.length,
  };
}

/**
 * Serializa los lotes del mismo espacio. Si una persona crea una categoría y
 * acto seguido un gasto, el segundo lote ve la categoría ya confirmada o la
 * publica junto con el gasto; nunca compiten entre sí en el dispositivo.
 */
export function syncCoupleSpaceDataForCurrentSession(input: {
  spaceId: string;
}): Promise<CoupleSpaceSyncResult> {
  const previous = inFlightBySpaceId.get(input.spaceId) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(() => syncCoupleSpaceData(input));
  inFlightBySpaceId.set(input.spaceId, next);
  void next.finally(() => {
    if (inFlightBySpaceId.get(input.spaceId) === next) {
      inFlightBySpaceId.delete(input.spaceId);
    }
  });
  return next;
}
