import { getOrCreateInstallationId } from '@/lib/storage/localIdentity';
import { getLocalDatabase } from '@/lib/storage/localDatabase';
import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import {
  type CoupleSpaceSyncCollection,
  type CoupleSpaceSyncConflict,
  syncCoupleSpaceRemotely,
} from '@/features/sync/gateways/juntossCoupleSpaceSyncGateway';
import { clearRemoteChangesCursor } from '@/features/sync/repositories/localSyncCursorRepository';
import { sendWithOccurredTimeSupport } from '@/features/sync/services/occurredTimeUploadSupport';
import { findRemoteIdForLocalEntity } from '@/features/sync/repositories/localRemoteEntityLinkRepository';
import { assertLocalCacheOwnedBy } from '@/features/sync/repositories/localSyncAccountRepository';
import {
  flattenBudgetSchedule,
  parseBudgetHistory,
  parseBudgetOverrides,
} from '@/features/categories/utils/categoryBudgetSerialization';
import { migrateLegacyCategoryBudgets } from '@/features/categories/repositories/localCategoryBudgetRepository';

type SyncRow = { id: string; updated_at: string } & Record<string, unknown>;

type MoneyAccountBalanceRow = {
  money_account_id: string;
} & Record<string, unknown>;

type CategoryBudgetRow = {
  category_id: string;
  currency: string;
  budget_minor: number;
  period: string;
  interval_days: number | null;
  anchor_on: string | null;
  overrides_json: string;
  history_json: string;
};

/** Presupuestos de una categoría, uno por moneda, con su periodicidad. */
function buildCategoryBudgets(
  categoryId: string,
  rows: readonly CategoryBudgetRow[],
): Record<string, unknown>[] {
  return rows
    .filter((row) => row.category_id === categoryId)
    .map((row) => ({
      currency: row.currency,
      budgetAmountMinor: row.budget_minor,
      period: row.period,
      intervalDays: row.interval_days,
      anchorOn: row.anchor_on,
      overrides: parseBudgetOverrides(row.overrides_json).map(
        ({ periodStartOn, amountMinor }) => ({
          periodStartOn,
          budgetAmountMinor: amountMinor,
        }),
      ),
      history: parseBudgetHistory(row.history_json).map(
        ({ endsOn, amountMinor, schedule }) => ({
          endsOn,
          budgetAmountMinor: amountMinor,
          ...flattenBudgetSchedule(schedule),
        }),
      ),
    }));
}

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

function emptySyncResult(): CoupleSpaceSyncResult {
  return {
    categoryCount: 0,
    moneyAccountCount: 0,
    recurringSeriesCount: 0,
    transactionCount: 0,
  };
}

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
  // La sesión puede desaparecer entre una interacción local y esta subida en
  // segundo plano. No hay nada que publicar sin un propietario remoto y no se
  // debe convertir esa retirada normal en un rechazo sin manejar.
  const userId = await getAuthenticatedUserId();
  if (!userId) return emptySyncResult();

  const database = await getLocalDatabase();
  // Nunca se firman con esta sesión filas de una caché que no es suya.
  await assertLocalCacheOwnedBy(database, userId);
  const installationId = await getOrCreateInstallationId(database);
  const remoteSpaceId =
    (await findRemoteIdForLocalEntity({
      executor: database,
      userId,
      entityType: 'space',
      localId: input.spaceId,
    })) ?? input.spaceId;
  const statuses = uploadableStatuses(input.includeLocalOnly ?? true);
  // Un presupuesto heredado sin mover no tendría moneda con la que viajar.
  await migrateLegacyCategoryBudgets(database);
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
              is_default AS "isDefault",
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
      `SELECT category_budgets.category_id, category_budgets.currency,
              category_budgets.budget_minor, category_budgets.period,
              category_budgets.interval_days, category_budgets.anchor_on,
              category_budgets.overrides_json, category_budgets.history_json
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
              money_account_id AS "moneyAccountId", created_by AS "createdBy",
              type, amount_minor AS "amountMinor", currency,
              COALESCE(
                NULLIF(TRIM(recurring_transaction_series.title), ''),
                (
                  SELECT categories.name
                    FROM categories
                   WHERE categories.id = recurring_transaction_series.category_id
                ),
                'Movimiento'
              ) AS title,
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
              money_account_id AS "moneyAccountId", created_by AS "createdBy",
              type, amount_minor AS "amountMinor", currency,
              COALESCE(
                NULLIF(TRIM(transactions.title), ''),
                (
                  SELECT categories.name
                    FROM categories
                   WHERE categories.id = transactions.category_id
                ),
                'Movimiento'
              ) AS title,
              occurred_on AS "occurredOn",
              occurred_time AS "occurredTime", note, recurrence,
              recurrence_group_id AS "recurrenceGroupId",
              recurrence_series_id AS "recurrenceSeriesId",
              source_transaction_id AS "sourceTransactionId",
              custom_rate_id AS "customRateId",
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
    return emptySyncResult();
  }

  const remoteResult = await sendWithOccurredTimeSupport(
    transactions.map(serializeRow),
    (serializedTransactions) =>
      syncCoupleSpaceRemotely({
        installationId,
        spaceId: remoteSpaceId,
        // Cada categoría viaja con todos sus presupuestos por moneda: el
        // servidor los reescribe enteros, así que quitar uno aquí lo quita allí.
        categories: categories.map((row) => ({
          ...serializeRow(row),
          budgets: buildCategoryBudgets(row.id, categoryBudgets),
        })),
        // Cada cuenta viaja con sus monedas: el RPC las reescribe enteras, así
        // que una divisa retirada aquí desaparece también en el otro dispositivo.
        moneyAccounts: moneyAccounts.map((row) => ({
          ...serializeRow(row),
          balances: moneyAccountBalances
            .filter((balance) => balance.money_account_id === row.id)
            .map(({ money_account_id: _accountId, ...balance }) => balance),
        })),
        recurringSeries: recurringSeries.map(serializeRow),
        transactions: serializedTransactions,
      }),
  );

  const rejected = rejectedLocalIds(remoteResult.conflicts);
  const hasNewerVersion = [...rejected.values()].includes('NEWER_VERSION');
  if (hasNewerVersion) {
    // El servidor conservó otra versión. Su versión canónica llega por
    // `/v1/sync/changes`, pero una restauración incremental que corriera
    // mientras la fila seguía pendiente ya habría avanzado el cursor sin
    // aplicarla: sin cursor, la próxima restauración es un snapshot completo.
    // Se borra antes de marcar para que un cierre a medias nunca deje filas
    // obsoletas como sincronizadas con el cursor intacto. `NOT_IN_SPACE` no
    // lo borra: el servidor no republica nada y la fila sigue pendiente, así
    // que cada sondeo forzaría un snapshot completo sin ganar nada.
    await clearRemoteChangesCursor(database, userId);
  }

  for (const syncedTransaction of remoteResult.transactions ?? []) {
    // Una versión descartada no trae valores que guardar sobre la local.
    if (
      syncedTransaction.applied === false ||
      rejected.has(conflictKey('transactions', syncedTransaction.localId))
    ) {
      continue;
    }
    await database.runAsync(
      `UPDATE transactions
          SET accounting_amount_minor_usd = ?, exchange_snapshot_json = ?
        WHERE id = ? AND updated_at = ?`,
      syncedTransaction.accountingAmountMinorUsd ?? null,
      syncedTransaction.exchangeSnapshot
        ? JSON.stringify(syncedTransaction.exchangeSnapshot)
        : null,
      syncedTransaction.localId,
      syncedTransaction.updatedAt,
    );
  }

  // Una versión `NEWER_VERSION` sin cambios desde el envío se marca
  // sincronizada para que la canónica la sustituya; si cambió durante el
  // envío, `markRowsSynced` la deja pendiente. Una `NOT_IN_SPACE` no se
  // guardó en ninguna parte: sigue pendiente y no se presenta como subida.
  const keep = (collection: CoupleSpaceSyncCollection) => (row: SyncRow) =>
    rejected.get(conflictKey(collection, row.id)) !== 'NOT_IN_SPACE';
  await Promise.all([
    markRowsSynced('categories', categories.filter(keep('categories'))),
    markRowsSynced(
      'money_accounts',
      moneyAccounts.filter(keep('moneyAccounts')),
    ),
    markRowsSynced(
      'recurring_transaction_series',
      recurringSeries.filter(keep('recurringSeries')),
    ),
    markRowsSynced('transactions', transactions.filter(keep('transactions'))),
  ]);
  // Una restauración que empezó entre el primer borrado y el marcado pudo
  // saltarse la versión canónica (la fila aún estaba pendiente) sin ver
  // cambiar la generación: se borra otra vez para que no escriba su cursor.
  if (hasNewerVersion) await clearRemoteChangesCursor(database, userId);

  return {
    categoryCount: categories.length,
    moneyAccountCount: moneyAccounts.length,
    recurringSeriesCount: recurringSeries.length,
    transactionCount: transactions.length,
  };
}

const conflictKey = (collection: CoupleSpaceSyncCollection, localId: string) =>
  `${collection}:${localId}`;

/** Motivo de cada versión descartada, por colección e id local. */
function rejectedLocalIds(
  conflicts: readonly CoupleSpaceSyncConflict[] | undefined,
) {
  const rejected = new Map<string, CoupleSpaceSyncConflict['reason']>();
  // Una respuesta con otra forma no se interpreta: se ignora como una API
  // que no informa de conflictos.
  if (!Array.isArray(conflicts)) return rejected;
  for (const conflict of conflicts) {
    if (typeof conflict?.localId !== 'string') continue;
    rejected.set(
      conflictKey(conflict.collection, conflict.localId),
      conflict.reason,
    );
  }
  return rejected;
}

/**
 * Serializa los lotes de cada espacio accesible, incluido el personal. Si una
 * persona crea una categoría y acto seguido un gasto, el segundo lote ve la
 * categoría ya confirmada o la publica junto con el gasto; nunca compiten en
 * el dispositivo.
 */
export function syncSpaceDataForCurrentSession(input: {
  spaceId: string;
  /** Incluye filas locales aún pendientes de la sesión actual. */
  includeLocalOnly?: boolean;
}): Promise<CoupleSpaceSyncResult> {
  const previous = inFlightBySpaceId.get(input.spaceId) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(() => syncSpaceData(input));
  inFlightBySpaceId.set(input.spaceId, next);
  const clearInFlight = () => {
    if (inFlightBySpaceId.get(input.spaceId) === next) {
      inFlightBySpaceId.delete(input.spaceId);
    }
  };
  // `finally` propaga el rechazo y, al ignorar la promesa que devuelve, crea
  // una segunda excepción no capturada. Ambas ramas solo limpian el bloqueo.
  void next.then(clearInFlight, clearInFlight);
  return next;
}
