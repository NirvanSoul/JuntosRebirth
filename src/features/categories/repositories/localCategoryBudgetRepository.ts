import {
  budgetIntervalDaysRange,
  type Category,
  type CategoryBudget,
  type CategoryBudgets,
} from '@/features/categories/types';
import {
  flattenBudgetSchedule,
  normalizeBudgetSchedule,
  parseBudgetHistory,
  parseBudgetOverrides,
  serializeBudgetHistory,
} from '@/features/categories/utils/categoryBudgetSerialization';
import { loadSpaces } from '@/features/spaces/repositories/localSpaceRepository';
import {
  isCurrencyCode,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import { getLocalDatabase } from '@/lib/storage/localDatabase';
import type { LocalSqlExecutor } from '@/lib/storage/localSqlExecutor';

/** Columnas de presupuesto con el mismo formato en las dos tablas. */
type BudgetColumnsRow = {
  budget_minor: number;
  period: string | null;
  interval_days: number | null;
  anchor_on: string | null;
  overrides_json: string | null;
  history_json: string | null;
};

type CategoryBudgetRow = BudgetColumnsRow & {
  category_id: string;
  currency: string;
};

const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

export function mapCategoryBudget(row: BudgetColumnsRow): CategoryBudget {
  const budgetSchedule = normalizeBudgetSchedule(
    row.period,
    row.interval_days,
    row.anchor_on,
  );
  const budgetOverrides = parseBudgetOverrides(row.overrides_json);
  const budgetHistory = parseBudgetHistory(row.history_json);
  return {
    budgetMinor: row.budget_minor,
    ...(budgetSchedule ? { budgetSchedule } : {}),
    ...(budgetOverrides.length > 0 ? { budgetOverrides } : {}),
    ...(budgetHistory.length > 0 ? { budgetHistory } : {}),
  };
}

export function assertCategoryBudgets(budgets: CategoryBudgets = {}): void {
  for (const budget of Object.values(budgets)) {
    if (!budget) continue;
    if (budget.budgetMinor <= 0) {
      throw new Error('El presupuesto debe ser mayor que cero');
    }
    const schedule = budget.budgetSchedule;
    if (
      schedule?.period === 'custom' &&
      (!Number.isInteger(schedule.intervalDays) ||
        schedule.intervalDays < budgetIntervalDaysRange.min ||
        schedule.intervalDays > budgetIntervalDaysRange.max ||
        !dateKeyPattern.test(schedule.anchorOn))
    ) {
      throw new Error('La periodicidad del presupuesto no es válida');
    }
    if (budget.budgetOverrides?.some((override) => override.amountMinor <= 0)) {
      throw new Error('El presupuesto debe ser mayor que cero');
    }
  }
}

async function insertCategoryBudget(
  executor: LocalSqlExecutor,
  categoryId: string,
  currency: string,
  budget: CategoryBudget,
  syncStatus: 'local_only' | 'pending' | 'synced',
  timestamps: { createdAt: string; updatedAt: string },
): Promise<void> {
  const { period, intervalDays, anchorOn } = flattenBudgetSchedule(
    budget.budgetSchedule ?? { period: 'month' },
  );
  await executor.runAsync(
    `INSERT INTO category_budgets (
       id, category_id, currency, budget_minor, period, interval_days,
       anchor_on, overrides_json, history_json, sync_status, created_at,
       updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (category_id, currency) DO UPDATE SET
       budget_minor = excluded.budget_minor, period = excluded.period,
       interval_days = excluded.interval_days, anchor_on = excluded.anchor_on,
       overrides_json = excluded.overrides_json,
       history_json = excluded.history_json,
       sync_status = excluded.sync_status, updated_at = excluded.updated_at`,
    `${categoryId}:${currency}`,
    categoryId,
    currency,
    budget.budgetMinor,
    period,
    intervalDays,
    anchorOn,
    JSON.stringify(budget.budgetOverrides ?? []),
    serializeBudgetHistory(budget.budgetHistory),
    syncStatus,
    timestamps.createdAt,
    timestamps.updatedAt,
  );
}

/** Sustituye todos los presupuestos de una categoría por `budgets`. */
export async function writeCategoryBudgets(
  executor: LocalSqlExecutor,
  categoryId: string,
  budgets: CategoryBudgets | undefined,
  syncStatus: 'local_only' | 'pending' | 'synced',
  timestamps: { createdAt: string; updatedAt: string },
): Promise<void> {
  await executor.runAsync(
    'DELETE FROM category_budgets WHERE category_id = ?',
    categoryId,
  );
  for (const [currency, budget] of Object.entries(budgets ?? {})) {
    if (budget) {
      await insertCategoryBudget(
        executor,
        categoryId,
        currency,
        budget,
        syncStatus,
        timestamps,
      );
    }
  }
}

export async function listLocalCategoryBudgets(
  executor: LocalSqlExecutor,
): Promise<Map<string, CategoryBudgets>> {
  const rows = await executor.getAllAsync<CategoryBudgetRow>(
    `SELECT category_id, currency, budget_minor, period, interval_days,
            anchor_on, overrides_json, history_json
       FROM category_budgets
      ORDER BY currency ASC`,
  );
  const budgetsByCategory = new Map<
    string,
    Partial<Record<CurrencyCode, CategoryBudget>>
  >();
  for (const row of rows) {
    if (!isCurrencyCode(row.currency) || row.budget_minor <= 0) continue;
    const budgets = budgetsByCategory.get(row.category_id) ?? {};
    budgets[row.currency] = mapCategoryBudget(row);
    budgetsByCategory.set(row.category_id, budgets);
  }
  return budgetsByCategory;
}

/**
 * Guarda el presupuesto de `category` en `currency` (o lo quita si no tiene)
 * y marca la categoría para sincronizar: el presupuesto viaja con ella.
 */
export async function saveLocalCategoryBudget(
  category: Category,
  currency: CurrencyCode,
): Promise<Category> {
  const budget = category.budgets?.[currency];
  assertCategoryBudgets(budget ? { [currency]: budget } : {});
  const database = await getLocalDatabase();
  const now = new Date().toISOString();

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const result = await transaction.runAsync(
      `UPDATE categories
          SET updated_at = ?,
              sync_status = CASE
                WHEN sync_status = 'local_only' THEN 'local_only'
                ELSE 'pending'
              END
        WHERE id = ? AND space_id = ? AND is_archived = 0`,
      now,
      category.id,
      category.spaceId,
    );
    if (result.changes !== 1) {
      throw new Error('La categoría local ya no está disponible');
    }
    await transaction.runAsync(
      'DELETE FROM category_budgets WHERE category_id = ? AND currency = ?',
      category.id,
      currency,
    );
    if (budget) {
      await insertCategoryBudget(
        transaction,
        category.id,
        currency,
        budget,
        'pending',
        {
          createdAt: now,
          updatedAt: now,
        },
      );
    }
  });

  return category;
}

type LegacyBudgetRow = BudgetColumnsRow & { id: string; space_id: string };

/**
 * Antes de ser por moneda, el presupuesto vivía en las columnas `budget_*` de
 * `categories` y era siempre de la moneda del espacio. Se mueve una sola vez a
 * `category_budgets` con esa moneda, que solo se conoce en el catálogo de
 * espacios, y se vacían las columnas para que no vuelva a migrarse.
 */
export async function migrateLegacyCategoryBudgets(
  executor: LocalSqlExecutor & {
    withExclusiveTransactionAsync: (
      task: (transaction: LocalSqlExecutor) => Promise<void>,
    ) => Promise<void>;
  },
): Promise<void> {
  const rows = await executor.getAllAsync<LegacyBudgetRow>(
    `SELECT id, space_id, budget_minor, budget_period AS period,
            budget_interval_days AS interval_days,
            budget_anchor_on AS anchor_on,
            budget_overrides_json AS overrides_json,
            budget_history_json AS history_json
       FROM categories
      WHERE budget_minor IS NOT NULL`,
  );
  if (rows.length === 0) return;

  const currencyBySpaceId = new Map(
    (await loadSpaces()).spaces.map((space) => [space.id, space.currency]),
  );
  const now = new Date().toISOString();
  await executor.withExclusiveTransactionAsync(async (transaction) => {
    for (const row of rows) {
      const currency = currencyBySpaceId.get(row.space_id);
      // Sin espacio conocido no hay moneda: se deja para otro arranque.
      if (!currency) continue;
      const budget = row.budget_minor > 0 ? mapCategoryBudget(row) : undefined;
      if (budget) {
        await insertCategoryBudget(
          transaction,
          row.id,
          currency,
          budget,
          'pending',
          {
            createdAt: now,
            updatedAt: now,
          },
        );
      }
      await transaction.runAsync(
        `UPDATE categories
            SET budget_minor = NULL, budget_period = 'month',
                budget_interval_days = NULL, budget_anchor_on = NULL,
                budget_overrides_json = '[]', budget_history_json = '[]',
                updated_at = ?,
                sync_status = CASE
                  WHEN sync_status = 'local_only' THEN 'local_only'
                  ELSE 'pending'
                END
          WHERE id = ?`,
        now,
        row.id,
      );
    }
  });
}
