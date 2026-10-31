import { writeCategoryBudgets } from '@/features/categories/repositories/localCategoryBudgetRepository';
import type { CategoryBudgets } from '@/features/categories/types';
import type { RemoteAccountCategory } from '@/features/sync/gateways/juntossRemoteAccountGateway';
import type { LocalSqlExecutor } from '@/lib/storage/localSqlExecutor';

/**
 * Sustituye los presupuestos locales de la categoría, uno por moneda, por los
 * remotos. Se llama solo si la fila de la categoría se aplicó: con cambios
 * locales sin subir, ganan esos y llegarán al servidor en la próxima subida.
 */
export async function applyRemoteCategoryBudgets(
  transaction: LocalSqlExecutor,
  categoryId: string,
  category: RemoteAccountCategory,
): Promise<void> {
  const budgets: CategoryBudgets = Object.fromEntries(
    category.budgets
      .filter((budget) => budget.budgetMinor > 0)
      .map(({ currency, budgetMinor, schedule, overrides, history }) => [
        currency,
        {
          budgetMinor,
          ...(schedule ? { budgetSchedule: schedule } : {}),
          ...(overrides.length > 0 ? { budgetOverrides: overrides } : {}),
          ...(history.length > 0 ? { budgetHistory: history } : {}),
        },
      ]),
  );
  await writeCategoryBudgets(transaction, categoryId, budgets, 'synced', {
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  });
}
