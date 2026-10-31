import { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';

import {
  DonutBreakdownChart,
  type DonutBreakdownMode,
} from '@/components/ui/Charts/DonutBreakdownChart';
import { CreatePreviewBadge } from '@/components/ui/CreatePreviewBadge/CreatePreviewBadge';
import type { Category } from '@/features/categories/types';
import { useBreakdownPeriod } from '@/features/activity/components/useBreakdownPeriod';
import { CategoryDetailPeriodFilter } from '@/features/categories/components/CategoryDetailModal/CategoryDetailPeriodFilter';
import { summarizeCategories } from '@/features/categories/utils/categorySummary';
import type { SessionTransaction } from '@/features/transactions/types';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { categoryColors } from '@/theme/categoryColors';
import { spacing } from '@/theme/spacing';

type CategoryDonutChartProps = {
  categories: readonly Category[];
  currency: CurrencyCode;
  onCreateMovement?: () => void;
  onDataAvailabilityChange?: (hasData: boolean) => void;
  onOpenCategoryDetail?: (categoryId: string) => void;
  /** Cambia (p. ej. al reenfocar la pantalla) para reiniciar el revelado. */
  resetKey?: number;
  transactions: readonly SessionTransaction[];
};

/** Reparto por categoría del mes elegido, sobre el donut compartido. */
export function CategoryDonutChart({
  categories,
  currency,
  onCreateMovement,
  onDataAvailabilityChange,
  onOpenCategoryDetail,
  resetKey,
  transactions,
}: CategoryDonutChartProps) {
  const [mode, setMode] = useState<DonutBreakdownMode>('expense');
  const { filter, nextDisabled, periodKey, periodTransactions, setFilter } =
    useBreakdownPeriod(transactions);
  const slices = useMemo(
    () =>
      summarizeCategories(categories, periodTransactions, currency).map(
        (category) => ({
          color: categoryColors[category.colorToken],
          id: category.id,
          label: category.name,
          valueMinor:
            mode === 'expense' ? category.expenseMinor : category.incomeMinor,
        }),
      ),
    [categories, currency, mode, periodTransactions],
  );

  return (
    <DonutBreakdownChart
      currency={currency}
      emptyContent={
        <CreatePreviewBadge
          accessibilityLabel="Crear movimiento"
          bordered
          label="Crear movimiento"
          onPress={onCreateMovement}
          testID="activity-add-category"
        />
      }
      idPrefix="category"
      mode={mode}
      onModeChange={setMode}
      onDataAvailabilityChange={onDataAvailabilityChange}
      onSlicePress={onOpenCategoryDetail}
      periodControl={
        <CategoryDetailPeriodFilter
          filter={filter}
          nextDisabled={nextDisabled}
          onChange={setFilter}
          optionsStyle={styles.periodOptions}
          testID="category-period-selector"
        />
      }
      periodKey={periodKey}
      resetKey={resetKey}
      slicePressHint="Abre el detalle de la categoría"
      size={205}
      slices={slices}
    />
  );
}

const styles = StyleSheet.create({
  periodOptions: { marginBottom: spacing.lg },
});
