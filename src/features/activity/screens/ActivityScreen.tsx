import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/feedback/EmptyState/EmptyState';
import { Screen } from '@/components/layout/Screen/Screen';
import { Text } from '@/components/ui/Text/Text';
import {
  ActivityCollapsibleSection,
  getActivityLayoutTransition,
} from '@/features/activity/components/ActivityCollapsibleSection';
import { CategoryDonutChart } from '@/features/activity/components/CategoryDonutChart';
import {
  type CategoryFilter,
  type RecurrenceFilter,
  TransactionFiltersModal,
  type TransactionTypeFilter,
} from '@/features/activity/components/TransactionFiltersModal';
import {
  getComparisonPeriodLabel,
  getPreviousDateFilter,
  matchesTransactionDateFilter,
  type TransactionDateFilter,
} from '@/features/activity/utils/transactionDateFilter';
import { CategoryPreviewCard } from '@/features/categories/components/CategoryPreviewCard/CategoryPreviewCard';
import type { Category } from '@/features/categories/types';
import { summarizeCategories } from '@/features/categories/utils/categorySummary';
import {
  TransactionPeriodModal,
  type TransactionPeriodModalType,
} from '@/features/dashboard/components/TransactionPeriodModal/TransactionPeriodModal';
import { TransactionPreviewList } from '@/features/transactions/components/TransactionPreviewList/TransactionPreviewList';
import { TransactionSummaryBadges } from '@/features/transactions/components/TransactionSummaryBadges/TransactionSummaryBadges';
import type { SessionTransaction } from '@/features/transactions/types';
import {
  getAvailableCurrencies,
  pickEffectiveCurrency,
} from '@/features/transactions/utils/transactionCurrencyGrouping';
import { calculatePeriodComparison } from '@/features/transactions/utils/periodComparison';
import {
  listTransactionsThroughCurrentMonth,
  summarizeTransactionTotals,
} from '@/features/transactions/utils/transactionSummary';
import {
  defaultCurrencyCode,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import { iconSize, minTouchTarget } from '@/theme/layout';
import { motion } from '@/theme/motion';
import { previewCardLayout } from '@/theme/previewCard';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type ActivityScreenProps = {
  categories?: readonly Category[];
  /** Moneda elegida en el encabezado global; nunca se mezclan importes aquí. */
  currency?: CurrencyCode;
  /** Moneda del espacio activo para presupuestos. */
  spaceCurrency?: CurrencyCode;
  /** Cambia al reenfocar la pantalla para reiniciar el donut de categorías. */
  focusResetKey?: number;
  onCreateCategory?: () => void;
  onCreateExpense?: () => void;
  onCreateIncome?: () => void;
  onCreateMovement?: () => void;
  onOpenCategoryDetail?: (categoryId: string, currency?: CurrencyCode) => void;
  onOpenTransactionDetail?: (transactionId: string) => void;
  onScrollDirectionChange?: (direction: 'down' | 'up') => void;
  onSummaryPinnedChange?: (pinned: boolean) => void;
  summaryPinned?: boolean;
  targetRequestId?: number;
  targetSection?: 'categories' | 'movements';
  transactions?: readonly SessionTransaction[];
};

export function ActivityScreen({
  categories = [],
  currency = defaultCurrencyCode,
  focusResetKey,
  onCreateCategory,
  onCreateExpense,
  onCreateIncome,
  onCreateMovement,
  onOpenCategoryDetail,
  onOpenTransactionDetail,
  onScrollDirectionChange,
  onSummaryPinnedChange,
  spaceCurrency = defaultCurrencyCode,
  summaryPinned = false,
  targetRequestId,
  targetSection,
  transactions = [],
}: ActivityScreenProps) {
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const handledTargetKeyRef = useRef<string | null>(null);
  const hasPinnedStateMountedRef = useRef(false);
  const scrollOffsetRef = useRef(0);
  const summaryOffsetRef = useRef(0);
  const summaryPulse = useSharedValue(1);
  const [movementsOffset, setMovementsOffset] = useState(0);
  const [areCategoriesExpanded, setCategoriesExpanded] = useState(true);
  const [transactionFilter, setTransactionFilter] =
    useState<TransactionTypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>([]);
  const [recurrenceFilter, setRecurrenceFilter] =
    useState<RecurrenceFilter>('all');
  const [dateFilter, setDateFilter] = useState<TransactionDateFilter>('all');
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode | null>(
    null,
  );
  const [isFiltersModalVisible, setFiltersModalVisible] = useState(false);
  const [periodModalType, setPeriodModalType] =
    useState<TransactionPeriodModalType | null>(null);
  const transactionsThroughCurrentMonth = useMemo(
    () => listTransactionsThroughCurrentMonth(transactions),
    [transactions],
  );
  const availableCurrencies = useMemo(
    () => getAvailableCurrencies(transactions),
    [transactions],
  );
  const effectiveCurrency = pickEffectiveCurrency(
    availableCurrencies,
    selectedCurrency ?? currency,
    currency,
  );
  const currencyTransactionsThroughCurrentMonth = useMemo(
    () =>
      transactionsThroughCurrentMonth.filter(
        (t) => t.currency === effectiveCurrency,
      ),
    [effectiveCurrency, transactionsThroughCurrentMonth],
  );
  const categorySummaries = useMemo(
    () =>
      summarizeCategories(
        categories,
        transactionsThroughCurrentMonth,
        effectiveCurrency,
      ),
    [categories, effectiveCurrency, transactionsThroughCurrentMonth],
  );
  const budgetSummaries = useMemo(
    () =>
      effectiveCurrency === spaceCurrency
        ? categorySummaries
        : summarizeCategories(
            categories,
            transactionsThroughCurrentMonth,
            spaceCurrency,
          ),
    [
      categories,
      categorySummaries,
      effectiveCurrency,
      spaceCurrency,
      transactionsThroughCurrentMonth,
    ],
  );
  const budgetExpenseByCategoryId = useMemo(
    () => new Map(budgetSummaries.map((item) => [item.id, item.expenseMinor])),
    [budgetSummaries],
  );
  const matchesNonDateFilters = useCallback(
    (transaction: SessionTransaction) =>
      (transactionFilter === 'all' || transaction.type === transactionFilter) &&
      (categoryFilter.length === 0 ||
        categoryFilter.includes(transaction.categoryId)) &&
      (recurrenceFilter === 'all' ||
        transaction.recurrence === recurrenceFilter),
    [categoryFilter, recurrenceFilter, transactionFilter],
  );
  const filteredTransactions = useMemo(
    () =>
      transactionsThroughCurrentMonth.filter(
        (transaction) =>
          transaction.currency === effectiveCurrency &&
          matchesNonDateFilters(transaction) &&
          matchesTransactionDateFilter(transaction.occurredOn, dateFilter),
      ),
    [
      dateFilter,
      effectiveCurrency,
      matchesNonDateFilters,
      transactionsThroughCurrentMonth,
    ],
  );
  const activeFilterCount =
    Number(transactionFilter !== 'all') +
    Number(categoryFilter.length > 0) +
    Number(recurrenceFilter !== 'all') +
    Number(dateFilter !== 'all');
  const filteredSummary = useMemo(
    () => summarizeTransactionTotals(filteredTransactions),
    [filteredTransactions],
  );
  const previousDateFilter = useMemo(
    () => getPreviousDateFilter(dateFilter),
    [dateFilter],
  );
  const previousFilteredSummary = useMemo(() => {
    if (!previousDateFilter) return null;
    const previousTransactions = transactionsThroughCurrentMonth.filter(
      (transaction) =>
        transaction.currency === effectiveCurrency &&
        matchesNonDateFilters(transaction) &&
        matchesTransactionDateFilter(
          transaction.occurredOn,
          previousDateFilter,
        ),
    );
    return summarizeTransactionTotals(previousTransactions);
  }, [
    effectiveCurrency,
    matchesNonDateFilters,
    previousDateFilter,
    transactionsThroughCurrentMonth,
  ]);
  const comparisonPeriodLabel = getComparisonPeriodLabel(dateFilter);
  const incomeComparison = previousFilteredSummary
    ? (calculatePeriodComparison(
        filteredSummary.incomeMinor,
        previousFilteredSummary.incomeMinor,
      ) ?? undefined)
    : undefined;
  const expenseComparison = previousFilteredSummary
    ? (calculatePeriodComparison(
        filteredSummary.expenseMinor,
        previousFilteredSummary.expenseMinor,
      ) ?? undefined)
    : undefined;
  const balanceComparison = previousFilteredSummary
    ? (calculatePeriodComparison(
        filteredSummary.balanceMinor,
        previousFilteredSummary.balanceMinor,
      ) ?? undefined)
    : undefined;
  const updateSummaryPinnedState = (scrollOffset: number) => {
    if (summaryOffsetRef.current <= 0) {
      return;
    }

    onSummaryPinnedChange?.(summaryOffsetRef.current - scrollOffset <= 0);
  };
  useEffect(() => {
    if (!hasPinnedStateMountedRef.current) {
      hasPinnedStateMountedRef.current = true;
      return;
    }

    summaryPulse.value = withSequence(
      withTiming(0.97, {
        duration: motion.stickySummaryPulseDuration,
        reduceMotion: ReduceMotion.System,
      }),
      withSpring(1, {
        ...motion.disclosureSpring,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [summaryPinned, summaryPulse]);
  const summaryAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: summaryPulse.value }],
  }));
  useEffect(() => {
    if (!targetSection) {
      return;
    }

    const targetKey = `${targetRequestId ?? 'initial'}:${targetSection}`;

    if (
      handledTargetKeyRef.current === targetKey ||
      (targetSection === 'movements' && movementsOffset <= 0)
    ) {
      return;
    }

    if (targetSection === 'categories') {
      setCategoriesExpanded(true);
    }

    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        animated: false,
        y: targetSection === 'movements' ? movementsOffset : 0,
      });
      handledTargetKeyRef.current = targetKey;
    });

    return () => cancelAnimationFrame(frame);
  }, [movementsOffset, targetRequestId, targetSection]);

  return (
    <>
      <Screen
        onScrollOffsetChange={(offset) => {
          scrollOffsetRef.current = offset;
          updateSummaryPinnedState(offset);
        }}
        onScrollDirectionChange={onScrollDirectionChange}
        scrollRef={scrollRef}
        stickyHeaderIndices={[2]}
        testID="activity-screen"
        transparentBackground
      >
        <ActivityCollapsibleSection
          expanded={areCategoriesExpanded}
          onToggle={() => setCategoriesExpanded((expanded) => !expanded)}
          testID="categories-section"
          title="Categorías"
        >
          <CategoryDonutChart
            categories={categories}
            currency={effectiveCurrency}
            onOpenCategoryDetail={(categoryId) =>
              onOpenCategoryDetail?.(categoryId, effectiveCurrency)
            }
            resetKey={focusResetKey}
            transactions={currencyTransactionsThroughCurrentMonth}
          />
          <Animated.View
            layout={getActivityLayoutTransition()}
            testID="activity-category-detail"
          >
            <Text
              accessibilityRole="header"
              style={styles.categoryDetailTitle}
              variant="label"
            >
              Detalle por categoría
            </Text>
            {categorySummaries.length > 0 ? (
              <View
                style={styles.categoryGroupShadow}
                testID="activity-category-preview-group"
              >
                <View
                  style={styles.categoryGroup}
                  testID="activity-category-preview-list"
                >
                  {categorySummaries.map(({ id, ...category }, index) => (
                    <View key={id}>
                      <CategoryPreviewCard
                        {...category}
                        budgetExpenseMinor={
                          budgetExpenseByCategoryId.get(id) ?? 0
                        }
                        displayCurrency={effectiveCurrency}
                        onPress={() =>
                          onOpenCategoryDetail?.(id, effectiveCurrency)
                        }
                        spaceCurrency={spaceCurrency}
                      />
                      {index < categorySummaries.length - 1 ? (
                        <View
                          accessibilityElementsHidden
                          importantForAccessibility="no"
                          style={styles.categorySeparator}
                          testID="activity-category-separator"
                        />
                      ) : null}
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <EmptyState
                accessibilityLabel="Crear primera categoría"
                description="Crea una categoría para organizar tus movimientos."
                icon="pie-chart-outline"
                iconBackgroundColor={colors.categoryAction}
                onPress={onCreateCategory}
                testID="activity-empty-categories"
                title="Aún no hay categorías"
              />
            )}
          </Animated.View>
        </ActivityCollapsibleSection>

        <Animated.View
          layout={getActivityLayoutTransition()}
          onLayout={({ nativeEvent }) =>
            setMovementsOffset(nativeEvent.layout.y)
          }
          style={styles.movementsHeader}
          testID="activity-movements-header"
        >
          <Text accessibilityRole="header" variant="subheading">
            Movimientos
          </Text>
          <Pressable
            accessibilityHint="Abre las opciones de filtrado"
            accessibilityLabel={
              activeFilterCount > 0
                ? `Filtros, ${activeFilterCount} activos`
                : 'Filtros'
            }
            accessibilityRole="button"
            onPress={() => setFiltersModalVisible(true)}
            style={({ pressed }) => [
              styles.filterLink,
              pressed ? styles.filterLinkPressed : null,
            ]}
          >
            <Ionicons
              color={colors.textSecondary}
              name="filter-circle-outline"
              size={iconSize.xs}
              testID="activity-filter-icon"
            />
            <Text tone="secondary" variant="footnote" weight="light">
              Filtrar
            </Text>
          </Pressable>
        </Animated.View>

        <View
          onLayout={({ nativeEvent }) => {
            summaryOffsetRef.current = nativeEvent.layout.y;
            updateSummaryPinnedState(scrollOffsetRef.current);
          }}
          style={{
            marginTop: -insets.top,
            paddingTop: insets.top + spacing.sm,
          }}
          testID="activity-summary-anchor"
        >
          <Animated.View style={summaryAnimatedStyle}>
            <TransactionSummaryBadges
              accessibilityContext="de los movimientos mostrados"
              balanceComparison={balanceComparison}
              balanceMinor={filteredSummary.balanceMinor}
              bordered={summaryPinned}
              compact
              comparisonPeriodLabel={comparisonPeriodLabel}
              expenseComparison={expenseComparison}
              expenseMinor={filteredSummary.expenseMinor}
              incomeComparison={incomeComparison}
              incomeMinor={filteredSummary.incomeMinor}
              onBalancePress={() => setPeriodModalType('balance')}
              onExpensePress={() => setPeriodModalType('expense')}
              onIncomePress={() => setPeriodModalType('income')}
              style={styles.movementSummary}
              testIDPrefix="activity"
            />
          </Animated.View>
        </View>

        {filteredTransactions.length > 0 ? (
          <Animated.View layout={getActivityLayoutTransition()}>
            <TransactionPreviewList
              categories={categories}
              groupingTransactions={transactions}
              onOpenTransactionDetail={onOpenTransactionDetail}
              testID="activity-transaction-preview-list"
              transactions={filteredTransactions}
            />
          </Animated.View>
        ) : (
          <Animated.View layout={getActivityLayoutTransition()}>
            {transactionsThroughCurrentMonth.length === 0 ? (
              <EmptyState
                accessibilityLabel="Crear primer gasto"
                description="Registra un gasto para empezar a ver tu actividad."
                icon="swap-vertical-outline"
                iconBackgroundColor={colors.cta}
                onPress={onCreateExpense}
                testID="activity-empty-movements"
                title="Todavía no hay movimientos"
              />
            ) : (
              <EmptyState
                description="Prueba con otro filtro para ver más resultados."
                icon="receipt-outline"
                iconBackgroundColor={colors.brand}
                testID="activity-empty-filtered-movements"
                title="No hay movimientos de este tipo"
              />
            )}
          </Animated.View>
        )}
      </Screen>
      <TransactionFiltersModal
        categories={categories}
        currencies={availableCurrencies}
        filters={{
          category: categoryFilter,
          currency: effectiveCurrency,
          date: dateFilter,
          recurrence: recurrenceFilter,
          type: transactionFilter,
        }}
        onApply={(filters) => {
          setTransactionFilter(filters.type);
          setCategoryFilter(filters.category);
          setRecurrenceFilter(filters.recurrence);
          setDateFilter(filters.date);
          setSelectedCurrency(filters.currency);
          setFiltersModalVisible(false);
        }}
        onClose={() => setFiltersModalVisible(false)}
        visible={isFiltersModalVisible}
      />
      {periodModalType ? (
        <TransactionPeriodModal
          categories={categories}
          onAdd={() => {
            const currentType = periodModalType;
            setPeriodModalType(null);
            if (currentType === 'income') onCreateIncome?.();
            else if (currentType === 'expense') onCreateExpense?.();
            else onCreateMovement?.();
          }}
          onClose={() => setPeriodModalType(null)}
          onOpenTransactionDetail={(transactionId) => {
            setPeriodModalType(null);
            onOpenTransactionDetail?.(transactionId);
          }}
          transactions={transactions}
          type={periodModalType}
          visible
        />
      ) : null}
    </>
  );
}

function createStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    movementsHeader: {
      minHeight: minTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.xxl,
      marginBottom: spacing.md,
    },
    movementSummary: {
      marginBottom: spacing.lg,
    },
    filterLink: {
      minHeight: minTouchTarget,
      justifyContent: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingLeft: spacing.lg,
    },
    filterLinkPressed: {
      opacity: 0.64,
    },
    categoryGroupShadow: {
      ...shadows.subtle,
      borderRadius: previewCardLayout.borderRadius,
    },
    categoryGroup: {
      overflow: 'hidden',
      backgroundColor: colors.surface,
      borderColor: colors.categoryPreviewBorder,
      borderRadius: previewCardLayout.borderRadius,
      borderWidth: 2,
    },
    categorySeparator: {
      height: 1,
      backgroundColor: colors.categoryPreviewBorder,
    },
    categoryDetailTitle: {
      marginBottom: spacing.md,
      marginTop: spacing.xl,
    },
  });
}
