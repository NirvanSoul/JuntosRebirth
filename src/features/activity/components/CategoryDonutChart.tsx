import { useMemo, useState } from 'react';

import {
  DonutBreakdownChart,
  type DonutBreakdownMode,
} from '@/components/ui/Charts/DonutBreakdownChart';
import type { Category } from '@/features/categories/types';
import {
  formatMonthKey,
  getCurrentMonthKey,
  listTransactionsByMonth,
  shiftMonthKey,
  summarizeCategories,
} from '@/features/categories/utils/categorySummary';
import type { SessionTransaction } from '@/features/transactions/types';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { categoryColors } from '@/theme/categoryColors';

type CategoryDonutChartProps = {
  categories: readonly Category[];
  currency: CurrencyCode;
  onOpenCategoryDetail?: (categoryId: string) => void;
  /** Cambia (p. ej. al reenfocar la pantalla) para reiniciar el revelado. */
  resetKey?: number;
  transactions: readonly SessionTransaction[];
};

/** Reparto por categoría del mes elegido, sobre el donut compartido. */
export function CategoryDonutChart({
  categories,
  currency,
  onOpenCategoryDetail,
  resetKey,
  transactions,
}: CategoryDonutChartProps) {
  const [mode, setMode] = useState<DonutBreakdownMode>('expense');
  const currentMonthKey = getCurrentMonthKey();
  const [monthKey, setMonthKey] = useState(currentMonthKey);
  const slices = useMemo(
    () =>
      summarizeCategories(
        categories,
        listTransactionsByMonth(transactions, monthKey),
        currency,
      ).map((category) => ({
        color: categoryColors[category.colorToken],
        id: category.id,
        label: category.name,
        valueMinor:
          mode === 'expense' ? category.expenseMinor : category.incomeMinor,
      })),
    [categories, currency, mode, monthKey, transactions],
  );

  return (
    <DonutBreakdownChart
      currency={currency}
      emptyMessage={`Para ver ${
        mode === 'expense' ? 'gastos' : 'ingresos'
      } por categoría, registra un ${
        mode === 'expense' ? 'gasto' : 'ingreso'
      } y asócialo a una categoría.`}
      idPrefix="category"
      isCurrentMonth={monthKey === currentMonthKey}
      mode={mode}
      monthLabel={formatMonthKey(monthKey)}
      onModeChange={setMode}
      onMonthChange={(offset) =>
        setMonthKey((current) => shiftMonthKey(current, offset))
      }
      onSlicePress={onOpenCategoryDetail}
      resetKey={resetKey}
      slicePressHint="Abre el detalle de la categoría"
      size={195}
      slices={slices}
      strokeWidth={12}
    />
  );
}
