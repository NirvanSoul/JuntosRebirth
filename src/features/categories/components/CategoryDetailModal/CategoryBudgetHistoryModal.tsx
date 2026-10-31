import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  ReduceMotion,
} from 'react-native-reanimated';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import { TransactionDateRangePickerModal } from '@/features/activity/components/TransactionDateRangePickerModal';
import { CategoryBudgetProgress } from '@/features/categories/components/CategoryBudgetProgress/CategoryBudgetProgress';
import { CategoryBudgetModal } from '@/features/categories/components/CategoryDetailModal/CategoryBudgetModal';
import type { Category, CategoryBudget } from '@/features/categories/types';
import {
  type CategoryBudgetChange,
  describeBudgetSchedule,
  formatBudgetDateRange,
  formatCategoryBudgetPeriod,
  getBudgetScheduleAt,
  getProratedBudgetAmount,
  hasBudgetOverride,
  isCategoryBudgetPeriod,
  isSameBudgetSchedule,
  parseBudgetDateKey,
  resolveBudgetAmount,
  shiftCategoryBudgetPeriod,
} from '@/features/categories/utils/categoryBudgetPeriod';
import {
  type BudgetHistoryFilter,
  getBudgetHistoryFilterRange,
  getNativeBudgetHistoryFilter,
  shiftBudgetHistoryFilter,
} from '@/features/categories/utils/categoryBudgetHistoryFilter';
import { summarizeCategoryExpenseInRange } from '@/features/categories/utils/categorySummary';
import { TransactionPeriodSelector } from '@/features/transactions/components/TransactionPeriodSelector/TransactionPeriodSelector';
import type { SessionTransaction } from '@/features/transactions/types';
import { useDepsChanged } from '@/hooks/useDepsChanged';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { getLocalTodayKey } from '@/lib/date/localDate';
import { useCurrencySymbolPreference } from '@/state/appPreferences/CurrencySymbolPreferenceProvider';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { layout } from '@/theme/layout';
import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { getDisclosureLayoutTransition } from '@/theme/transitions';
import type { ColorTokens } from '@/theme/types';
import { useThemedStyles } from '@/theme/useThemedStyles';

type CategoryBudgetHistoryModalProps = {
  /** Presupuesto de la categoría en `currency`. */
  budget: CategoryBudget;
  category: Category;
  categoryColor: string;
  onClose: () => void;
  onSaveBudget: (change: CategoryBudgetChange) => void;
  currency: CurrencyCode;
  transactions: readonly SessionTransaction[];
  visible: boolean;
};

const buttonEntering = FadeIn.duration(motion.floatingButtonVisibilityDuration)
  .easing(Easing.inOut(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const buttonExiting = FadeOut.duration(motion.floatingButtonVisibilityDuration)
  .easing(Easing.inOut(Easing.cubic))
  .reduceMotion(ReduceMotion.System);

/**
 * Presupuesto de una categoría periodo a periodo. Por defecto recorre los
 * periodos del propio presupuesto; al pulsar el periodo se puede ver por
 * semana, quincena, mes, año o un rango propio, con el presupuesto
 * proporcional a los días. Solo un periodo del presupuesto se puede editar.
 */
export function CategoryBudgetHistoryModal({
  budget,
  category,
  categoryColor,
  onClose,
  onSaveBudget,
  currency,
  transactions,
  visible,
}: CategoryBudgetHistoryModalProps) {
  const { formatCurrency } = useCurrencySymbolPreference();
  const styles = useThemedStyles(createStyles);
  const density = useLayoutDensity();
  const [filter, setFilter] = useState<BudgetHistoryFilter>(() =>
    getNativeBudgetHistoryFilter(budget, new Date()),
  );
  const [isRangePickerVisible, setRangePickerVisible] = useState(false);
  const [isEditVisible, setEditVisible] = useState(false);

  if (useDepsChanged([visible, category.id, currency]) && visible) {
    setFilter(getNativeBudgetHistoryFilter(budget, new Date()));
    setRangePickerVisible(false);
    setEditVisible(false);
  }

  const { startKey, endKey } = getBudgetHistoryFilterRange(filter);
  const startDate = parseBudgetDateKey(startKey);
  const isNative = isCategoryBudgetPeriod(budget, startKey, endKey);
  const schedule = getBudgetScheduleAt(budget, startDate);
  const todayRange = getBudgetHistoryFilterRange(
    getNativeBudgetHistoryFilter(budget, new Date()),
  );
  const isToday = isNative && todayRange.startKey === startKey;
  const rangeLabel = formatBudgetDateRange({
    start: startDate,
    end: parseBudgetDateKey(endKey),
  });
  const amountMinor = isNative
    ? (resolveBudgetAmount(budget, startDate) ?? 0)
    : getProratedBudgetAmount(budget, startKey, endKey);
  const expenseMinor = summarizeCategoryExpenseInRange(
    category.id,
    transactions,
    currency,
    startKey,
    endKey,
  );
  const isEdited = isNative && hasBudgetOverride(budget, startDate);
  const isFuture = startKey > getLocalTodayKey();
  const availableMinor = Math.max(amountMinor - expenseMinor, 0);
  const overspentMinor = Math.max(expenseMinor - amountMinor, 0);
  const progress = amountMinor ? Math.min(expenseMinor / amountMinor, 1) : 0;
  const format = (value: number) => formatCurrency(value, currency, 'es-ES');
  const shift = (offset: -1 | 1) =>
    setFilter((current) =>
      isNative
        ? getNativeBudgetHistoryFilter(
            budget,
            shiftCategoryBudgetPeriod(budget, startDate, offset),
          )
        : shiftBudgetHistoryFilter(current, offset),
    );

  return (
    <>
      <AppModal
        onClose={onClose}
        stackBehavior="push"
        testID="category-budget-history-modal"
        visible={visible}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <ModalCloseButton onPress={onClose} variant="back" />
            <View style={styles.headerCopy}>
              <Text accessibilityRole="header" variant="heading">
                Detalle de Presupuesto
              </Text>
              <Text
                numberOfLines={1}
                tone="secondary"
                variant="footnote"
                weight="medium"
              >
                {category.name} · {describeBudgetSchedule(schedule)}
              </Text>
            </View>
          </View>

          <TransactionPeriodSelector
            collapsible
            customLabel={rangeLabel}
            customSelected={filter.period === 'custom'}
            includeCustomOption
            onNext={() => shift(1)}
            onPrevious={() => shift(-1)}
            onSelectCustom={() => setRangePickerVisible(true)}
            onSelectPeriod={(period) =>
              setFilter({ period, selectedDate: startDate })
            }
            optionsStyle={styles.periodOptions}
            period={filter.period === 'custom' ? null : filter.period}
            selectedDate={startDate}
            testID="category-budget-history-navigator"
          />

          <View style={styles.card} testID="category-budget-history-summary">
            <View style={styles.cardHeader}>
              <View style={styles.cardColumn}>
                <Text tone="secondary" variant="caption">
                  {isFuture ? 'Previsto' : 'Gastado'}
                </Text>
                <Text
                  testID="category-budget-history-expense"
                  variant="subheading"
                >
                  {format(expenseMinor)}
                </Text>
              </View>
              <View style={[styles.cardColumn, styles.cardColumnEnd]}>
                <View style={styles.amountLabel}>
                  {isEdited ? (
                    <View
                      style={styles.editedBadge}
                      testID="category-budget-history-edited"
                    >
                      <Text variant="caption" weight="medium">
                        Editado
                      </Text>
                    </View>
                  ) : null}
                  <Text align="right" tone="secondary" variant="caption">
                    {isNative ? 'Presupuesto' : 'Presupuesto proporcional'}
                  </Text>
                </View>
                <Text
                  align="right"
                  testID="category-budget-history-amount"
                  variant="label"
                  weight="semibold"
                >
                  {format(amountMinor)}
                </Text>
              </View>
            </View>
            <CategoryBudgetProgress
              accessibilityText={`${Math.round(progress * 100)}% utilizado`}
              color={categoryColor}
              progress={progress}
            />
            <Text tone="secondary" variant="caption">
              {overspentMinor > 0
                ? `Excedido en ${format(overspentMinor)}`
                : `Disponible: ${format(availableMinor)}`}
            </Text>
          </View>

          <View style={styles.actions}>
            {isToday ? null : (
              <Animated.View entering={buttonEntering} exiting={buttonExiting}>
                <Pressable
                  accessibilityLabel="Volver al periodo actual"
                  accessibilityRole="button"
                  onPress={() =>
                    setFilter(getNativeBudgetHistoryFilter(budget, new Date()))
                  }
                  style={[
                    styles.secondaryButton,
                    { minHeight: layout.actionHeight[density] },
                  ]}
                  testID="category-budget-history-today"
                >
                  <Text variant="bodyStrong" weight="medium">
                    Hoy
                  </Text>
                </Pressable>
              </Animated.View>
            )}
            {isNative ? (
              <Animated.View
                entering={buttonEntering}
                exiting={buttonExiting}
                layout={getDisclosureLayoutTransition()}
                style={styles.primaryButton}
              >
                <ModalPrimaryAction
                  accessibilityLabel="Editar este periodo"
                  gradientColor={categoryColor}
                  label="Editar este periodo"
                  onPress={() => setEditVisible(true)}
                  testID="category-budget-history-edit"
                />
              </Animated.View>
            ) : null}
          </View>
        </View>
      </AppModal>

      <TransactionDateRangePickerModal
        initialRange={
          filter.period === 'custom'
            ? { startDate: startKey, endDate: endKey }
            : undefined
        }
        onClose={() => setRangePickerVisible(false)}
        onSelect={(range) => {
          setFilter({ ...range, period: 'custom' });
          setRangePickerVisible(false);
        }}
        visible={visible && isRangePickerVisible}
      />

      <CategoryBudgetModal
        categoryColor={categoryColor}
        categoryIcon={category.icon}
        categoryName={category.name}
        initialBudgetMinor={amountMinor}
        initialSchedule={schedule}
        onClose={() => setEditVisible(false)}
        onRemove={() => {
          onSaveBudget({ kind: 'period', periodStartOn: startKey });
          setEditVisible(false);
        }}
        onSave={(budgetMinor, nextSchedule) => {
          onSaveBudget(
            isSameBudgetSchedule(schedule, nextSchedule)
              ? {
                  kind: 'period',
                  periodStartOn: startKey,
                  amountMinor: budgetMinor,
                }
              : {
                  kind: 'from',
                  startsOn: startKey,
                  amountMinor: budgetMinor,
                  schedule: nextSchedule,
                },
          );
          setEditVisible(false);
        }}
        periodLabel={formatCategoryBudgetPeriod(budget, startDate)}
        periodStartOn={startKey}
        removable={isEdited}
        currency={currency}
        visible={visible && isEditVisible}
      />
    </>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: { gap: spacing.lg },
    header: {
      minHeight: layout.minTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    headerCopy: { flex: 1, gap: spacing.xxs },
    periodOptions: { marginTop: spacing.sm },
    card: {
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      padding: spacing.lg,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    cardColumn: { flexShrink: 1, gap: spacing.xxs },
    cardColumnEnd: { alignItems: 'flex-end' },
    amountLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    editedBadge: {
      backgroundColor: colors.background,
      borderRadius: radii.sm,
      paddingHorizontal: spacing.xs,
    },
    actions: { flexDirection: 'row', gap: spacing.sm },
    secondaryButton: {
      minHeight: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      paddingHorizontal: spacing.lg,
    },
    primaryButton: { flex: 1 },
  });
}
