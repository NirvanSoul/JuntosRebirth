import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { CategoryBudgetProgress } from '@/features/categories/components/CategoryBudgetProgress/CategoryBudgetProgress';
import type { Category } from '@/features/categories/types';
import {
  describeBudgetSchedule,
  formatCategoryBudgetPeriod,
  getBudgetScheduleAt,
  getCategoryBudget,
  parseBudgetDateKey,
  resolveBudgetAmount,
} from '@/features/categories/utils/categoryBudgetPeriod';
import { summarizeBudgetExpenses } from '@/features/categories/utils/categorySummary';
import type { SessionTransaction } from '@/features/transactions/types';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { toLocalDateKey } from '@/lib/date/localDate';
import { useCurrencySymbolPreference } from '@/state/appPreferences/CurrencySymbolPreferenceProvider';
import { categoryColors } from '@/theme/categoryColors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useThemedStyles } from '@/theme/useThemedStyles';

type CategoryBudgetSummaryCardProps = {
  category: Category;
  onPress: () => void;
  currency: CurrencyCode;
  /** Día cuyo periodo de presupuesto se muestra; por defecto, hoy. */
  referenceDate?: Date;
  transactions: readonly SessionTransaction[];
};

/**
 * Presupuesto en `currency` del periodo que contiene `referenceDate` (mes, semana, quincena o cada N días):
 * disponible, importe del periodo —que puede ser una excepción del importe
 * base— y progreso del gasto.
 */
export function CategoryBudgetSummaryCard({
  category,
  onPress,
  currency,
  referenceDate,
  transactions,
}: CategoryBudgetSummaryCardProps) {
  const { formatCurrency } = useCurrencySymbolPreference();
  const styles = useThemedStyles(createStyles);
  const today = referenceDate ?? new Date();
  const todayKey = toLocalDateKey(today);
  const expenseMinor = useMemo(
    () =>
      summarizeBudgetExpenses(
        [category],
        transactions,
        currency,
        parseBudgetDateKey(todayKey),
      ).get(category.id) ?? 0,
    [category, currency, todayKey, transactions],
  );
  const budget = getCategoryBudget(category, currency);
  const amountMinor = budget ? resolveBudgetAmount(budget, today) : undefined;
  if (!budget || !amountMinor) return null;

  const schedule = getBudgetScheduleAt(budget, today);
  const budgetLabel = formatCurrency(amountMinor, currency, 'es-ES');
  const available = formatCurrency(
    Math.max(amountMinor - expenseMinor, 0),
    currency,
    'es-ES',
  );
  const progress = Math.min(expenseMinor / amountMinor, 1);

  return (
    <Pressable
      accessibilityLabel="Abrir detalle de presupuesto"
      accessibilityRole="button"
      onPress={onPress}
      style={styles.card}
      testID="category-budget-summary"
    >
      <View style={styles.header}>
        <View>
          <Text tone="secondary" variant="caption">
            Disponible ({currency})
          </Text>
          <Text variant="subheading">{available}</Text>
        </View>
        <View style={styles.total}>
          <Text align="right" tone="secondary" variant="caption">
            Presupuesto ({currency})
          </Text>
          <Text align="right" variant="label" weight="semibold">
            {budgetLabel}
          </Text>
        </View>
      </View>
      <CategoryBudgetProgress
        accessibilityText={`${Math.round(progress * 100)}% utilizado, ${available} disponible`}
        color={categoryColors[category.colorToken]}
        progress={progress}
      />
      <Text testID="category-budget-period" tone="secondary" variant="caption">
        {describeBudgetSchedule(schedule)} ·{' '}
        {formatCategoryBudgetPeriod(budget, today)}
      </Text>
    </Pressable>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    card: {
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      marginTop: spacing.lg,
      padding: spacing.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    total: { flexShrink: 1 },
  });
}
