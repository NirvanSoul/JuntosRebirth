import type * as SQLite from 'expo-sqlite';

/**
 * Migración local 33. El presupuesto de una categoría deja de ser siempre
 * mensual: `budget_period` guarda la periodicidad (`custom` repite cada
 * `budget_interval_days` días desde `budget_anchor_on`) y
 * `budget_overrides_json` los importes editados para un único periodo, como
 * `[{ "periodStartOn": "YYYY-MM-DD", "amountMinor": 123 }]`. Viajan con la
 * fila de la categoría, así que el sync existente los transporta sin cola
 * propia. Las filas existentes quedan mensuales y sin excepciones.
 */
async function applyCategoryBudgetPeriodMigration(
  transaction: SQLite.SQLiteDatabase,
  currentVersion: number,
): Promise<void> {
  if (currentVersion >= 33) return;

  await transaction.execAsync(`
    ALTER TABLE categories ADD COLUMN budget_period TEXT NOT NULL DEFAULT 'month'
      CHECK (budget_period IN ('month', 'week', 'fortnight', 'custom'));
    ALTER TABLE categories ADD COLUMN budget_interval_days INTEGER
      CHECK (budget_interval_days IS NULL OR budget_interval_days BETWEEN 2 AND 365);
    ALTER TABLE categories ADD COLUMN budget_anchor_on TEXT;
    ALTER TABLE categories ADD COLUMN budget_overrides_json TEXT NOT NULL DEFAULT '[]'
      CHECK (json_valid(budget_overrides_json));
  `);
}

/**
 * Migración local 34. `budget_history_json` guarda los tramos anteriores del
 * presupuesto cuando su periodicidad cambia desde un periodo concreto:
 * `[{ "endsOn": "YYYY-MM-DD", "amountMinor": 123, "period": "month",
 * "intervalDays": null, "anchorOn": null }]`.
 */
async function applyCategoryBudgetHistoryMigration(
  transaction: SQLite.SQLiteDatabase,
  currentVersion: number,
): Promise<void> {
  if (currentVersion >= 34) return;

  await transaction.execAsync(`
    ALTER TABLE categories ADD COLUMN budget_history_json TEXT NOT NULL DEFAULT '[]'
      CHECK (json_valid(budget_history_json));
  `);
}

/**
 * Migración local 35. El presupuesto pasa a ser por moneda: cada fila de
 * `category_budgets` lleva su propia periodicidad, importes por periodo y
 * tramos, con el mismo formato que las columnas `budget_*` de `categories`.
 * Esas columnas quedan como dato heredado: `migrateLegacyCategoryBudgets`
 * las mueve a la moneda del espacio, que solo se conoce fuera de SQLite.
 */
async function applyPerCurrencyCategoryBudgetMigration(
  transaction: SQLite.SQLiteDatabase,
  currentVersion: number,
): Promise<void> {
  if (currentVersion >= 35) return;

  await transaction.execAsync(`
    ALTER TABLE category_budgets ADD COLUMN period TEXT NOT NULL DEFAULT 'month'
      CHECK (period IN ('month', 'week', 'fortnight', 'custom'));
    ALTER TABLE category_budgets ADD COLUMN interval_days INTEGER
      CHECK (interval_days IS NULL OR interval_days BETWEEN 2 AND 365);
    ALTER TABLE category_budgets ADD COLUMN anchor_on TEXT;
    ALTER TABLE category_budgets ADD COLUMN overrides_json TEXT NOT NULL DEFAULT '[]'
      CHECK (json_valid(overrides_json));
    ALTER TABLE category_budgets ADD COLUMN history_json TEXT NOT NULL DEFAULT '[]'
      CHECK (json_valid(history_json));
  `);
}

/** Periodicidad (33), tramos (34) y presupuesto por moneda (35). */
export async function applyCategoryBudgetMigrations(
  transaction: SQLite.SQLiteDatabase,
  currentVersion: number,
): Promise<void> {
  await applyCategoryBudgetPeriodMigration(transaction, currentVersion);
  await applyCategoryBudgetHistoryMigration(transaction, currentVersion);
  await applyPerCurrencyCategoryBudgetMigration(transaction, currentVersion);
}
