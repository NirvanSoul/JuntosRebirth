import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useScrollToTop } from '@react-navigation/native';
import { ScrollView, View } from 'react-native';
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
import type { MoneyAccount } from '@/features/accounts/types';
import { summarizeMoneyAccounts } from '@/features/accounts/utils/moneyAccountSummary';
import { ActivityAccountsSection } from '@/features/activity/components/ActivityAccountsSection';
import { ActivityCategoryDetail } from '@/features/activity/components/ActivityCategoryDetail';
import {
  ActivityCollapsibleSection,
  getActivityLayoutTransition,
} from '@/features/activity/components/ActivityCollapsibleSection';
import { ActivityMovementsHeader } from '@/features/activity/components/ActivityMovementsHeader';
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
import { createStyles } from '@/features/activity/screens/ActivityScreen.styles';
import { motion } from '@/theme/motion';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type ActivityScreenProps = {
  categories?: readonly Category[];
  categoriesExpanded?: boolean;
  categoryView?: 'grid' | 'list';
  moneyAccounts?: readonly MoneyAccount[];
  /** Moneda elegida en el encabezado global; nunca se mezclan importes aquí. */
  currency?: CurrencyCode;
  /** Moneda del espacio activo para presupuestos. */
  spaceCurrency?: CurrencyCode;
  /** Cambia al reenfocar la pantalla para reiniciar el donut de categorías. */
  focusResetKey?: number;
  onCreateCategory?: () => void;
  onCategoriesExpandedChange?: (expanded: boolean) => void;
  onCategoryViewChange?: (view: 'grid' | 'list') => void;
  onCreateExpense?: () => void;
  onCreateMoneyAccount?: () => void;
  onCreateIncome?: () => void;
  onCreateMovement?: () => void;
  onImport?: () => void;
  onOpenCategoryDetail?: (categoryId: string, currency?: CurrencyCode) => void;
  onAccountsExpandedChange?: (expanded: boolean) => void;
  accountsExpanded?: boolean;
  onOpenMoneyAccountDetail?: (moneyAccountId: string) => void;
  onOpenTransactionDetail?: (transactionId: string) => void;
  onScrollDirectionChange?: (direction: 'down' | 'up') => void;
  onSummaryPinnedChange?: (pinned: boolean) => void;
  summaryPinned?: boolean;
  targetRequestId?: number;
  targetSection?: 'accounts' | 'categories' | 'movements';
  transactions?: readonly SessionTransaction[];
};

export function ActivityScreen({
  categories = [],
  categoriesExpanded,
  categoryView = 'list',
  currency = defaultCurrencyCode,
  focusResetKey,
  moneyAccounts = [],
  onCreateCategory,
  onCategoriesExpandedChange,
  onCategoryViewChange,
  onCreateExpense,
  onCreateIncome,
  onCreateMoneyAccount,
  onCreateMovement,
  onImport,
  onOpenCategoryDetail,
  onAccountsExpandedChange,
  accountsExpanded,
  onOpenMoneyAccountDetail,
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
  useScrollToTop(scrollRef);
  const handledTargetKeyRef = useRef<string | null>(null);
  const hasPinnedStateMountedRef = useRef(false);
  const scrollOffsetRef = useRef(0);
  const summaryOffsetRef = useRef(0);
  const summaryPulse = useSharedValue(1);
  const [movementsOffset, setMovementsOffset] = useState(0);
  const [accountsOffset, setAccountsOffset] = useState(0);
  const [areCategoriesExpanded, setCategoriesExpanded] = useState(
    categoriesExpanded ?? true,
  );
  const [areAccountsExpanded, setAccountsExpanded] = useState(
    accountsExpanded ?? true,
  );
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
  useEffect(() => {
    if (categoriesExpanded !== undefined) {
      setCategoriesExpanded(categoriesExpanded);
    }
  }, [categoriesExpanded]);
  useEffect(() => {
    if (accountsExpanded !== undefined) {
      setAccountsExpanded(accountsExpanded);
    }
  }, [accountsExpanded]);
  const handleCategoriesToggle = () => {
    setCategoriesExpanded((expanded) => {
      const next = !expanded;
      onCategoriesExpandedChange?.(next);
      return next;
    });
  };
  const handleAccountsToggle = () => {
    setAccountsExpanded((expanded) => {
      const next = !expanded;
      onAccountsExpandedChange?.(next);
      return next;
    });
  };
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
  // Cada tarjeta lleva su propia moneda, así que la selección de moneda de
  // los movimientos no filtra las cuentas ni mezcla divisas en un saldo.
  const moneyAccountSummaries = useMemo(
    () => summarizeMoneyAccounts(moneyAccounts, transactions),
    [moneyAccounts, transactions],
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
      (targetSection === 'movements' && movementsOffset <= 0) ||
      (targetSection === 'accounts' && accountsOffset <= 0)
    ) {
      return;
    }

    if (targetSection === 'categories') {
      setCategoriesExpanded(true);
    }
    if (targetSection === 'accounts') {
      setAccountsExpanded(true);
    }

    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        animated: false,
        y:
          targetSection === 'movements'
            ? movementsOffset
            : targetSection === 'accounts'
              ? accountsOffset
              : 0,
      });
      handledTargetKeyRef.current = targetKey;
    });

    return () => cancelAnimationFrame(frame);
  }, [accountsOffset, movementsOffset, targetRequestId, targetSection]);

  return (
    <>
      <Screen
        onScrollOffsetChange={(offset) => {
          scrollOffsetRef.current = offset;
          updateSummaryPinnedState(offset);
        }}
        onScrollDirectionChange={onScrollDirectionChange}
        scrollRef={scrollRef}
        stickyHeaderIndices={[3]}
        testID="activity-screen"
        transparentBackground
      >
        <ActivityCollapsibleSection
          expanded={areCategoriesExpanded}
          onToggle={handleCategoriesToggle}
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
          <ActivityCategoryDetail
            budgetExpenseByCategoryId={budgetExpenseByCategoryId}
            categories={categorySummaries}
            categoryView={categoryView}
            currency={effectiveCurrency}
            onCreateCategory={onCreateCategory}
            onOpenCategoryDetail={onOpenCategoryDetail}
            onCategoryViewChange={onCategoryViewChange}
            spaceCurrency={spaceCurrency}
          />
        </ActivityCollapsibleSection>

        <Animated.View
          layout={getActivityLayoutTransition()}
          onLayout={({ nativeEvent }) =>
            setAccountsOffset(nativeEvent.layout.y)
          }
          style={{ marginTop: -(spacing.sm * 0.12) }}
          testID="activity-accounts-anchor"
        >
          <ActivityAccountsSection
            accounts={moneyAccountSummaries}
            currency={effectiveCurrency}
            expanded={areAccountsExpanded}
            onCreateMoneyAccount={onCreateMoneyAccount}
            onOpenMoneyAccountDetail={onOpenMoneyAccountDetail}
            onToggle={handleAccountsToggle}
            resetKey={focusResetKey}
            transactions={currencyTransactionsThroughCurrentMonth}
          />
        </Animated.View>

        <ActivityMovementsHeader
          activeFilterCount={activeFilterCount}
          onLayout={({ nativeEvent }) =>
            setMovementsOffset(nativeEvent.layout.y)
          }
          onOpenFilters={() => setFiltersModalVisible(true)}
          onOpenImport={onImport}
        />

        {/**
         * Ancla fija del resumen. El relleno superior reserva la safe area para
         * cuando queda anclada arriba, y el margen negativo lo compensa en
         * reposo: esa franja transparente se solapa con la cabecera de
         * Movimientos. `ScrollView` copia este estilo al contenedor que envuelve
         * al hijo fijo y le añade `zIndex: 10`, así que sin `pointerEvents` la
         * franja se comería los toques de los botones de Filtros y Doc. Va en el
         * estilo, y no como prop, porque solo el estilo viaja a ese contenedor.
         */}
        <View
          onLayout={({ nativeEvent }) => {
            summaryOffsetRef.current = nativeEvent.layout.y;
            updateSummaryPinnedState(scrollOffsetRef.current);
          }}
          pointerEvents="box-none"
          style={{
            marginTop: -insets.top,
            paddingTop: insets.top + spacing.sm,
            pointerEvents: 'box-none',
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
