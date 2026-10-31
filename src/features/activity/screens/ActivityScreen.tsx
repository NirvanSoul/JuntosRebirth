import { useEffect, useMemo, useRef, useState } from 'react';
import { useScrollToTop } from '@react-navigation/native';
import { type ScrollViewInstance, View } from 'react-native';
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
import { CreatePreviewBadge } from '@/components/ui/CreatePreviewBadge/CreatePreviewBadge';
import { Screen } from '@/components/layout/Screen/Screen';
import type { MoneyAccount } from '@/features/accounts/types';
import { summarizeMoneyAccounts } from '@/features/accounts/utils/moneyAccountSummary';
import { ActivityAccountsSection } from '@/features/activity/components/ActivityAccountsSection';
import { ActivityCategoryDetail } from '@/features/activity/components/ActivityCategoryDetail';
import {
  ActivityCollapsibleSection,
  getActivityLayoutTransition,
} from '@/features/activity/components/ActivityCollapsibleSection';
import {
  ActivityMovementList,
  useActivityMonthSections,
} from '@/features/activity/components/ActivityMonthSections';
import { ActivityMovementsHeader } from '@/features/activity/components/ActivityMovementsHeader';
import { CategoryDonutChart } from '@/features/activity/components/CategoryDonutChart';
import { useActivityFilters } from '@/features/activity/hooks/useActivityFilters';
import {
  type TransactionAuthorFilter,
  TransactionFiltersModal,
} from '@/features/activity/components/TransactionFiltersModal';
import {
  getPreviousDateFilter,
  listTransactionsByDateFilter,
} from '@/features/activity/utils/transactionDateFilter';
import { listActivityTransactions } from '@/features/activity/utils/activityTimeline';
import { CategoryDetailPeriodFilter } from '@/features/categories/components/CategoryDetailModal/CategoryDetailPeriodFilter';
import type { Category } from '@/features/categories/types';
import {
  summarizeCategories,
  summarizeBudgetExpenses,
} from '@/features/categories/utils/categorySummary';
import {
  TransactionPeriodModal,
  type TransactionPeriodModalType,
} from '@/features/dashboard/components/TransactionPeriodModal/TransactionPeriodModal';
import { TransactionSummaryBadges } from '@/features/transactions/components/TransactionSummaryBadges/TransactionSummaryBadges';
import type { SessionTransaction } from '@/features/transactions/types';
import {
  getAvailableCurrencies,
  pickEffectiveCurrency,
} from '@/features/transactions/utils/transactionCurrencyGrouping';
import { compareTransactionTotals } from '@/features/transactions/utils/periodComparison';
import {
  listTransactionsThroughCurrentMonth,
  summarizeTransactionTotals,
} from '@/features/transactions/utils/transactionSummary';
import {
  defaultCurrencyCode,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import { createStyles } from '@/features/activity/screens/ActivityScreen.styles';
import { useIncrementalLimit } from '@/hooks/useIncrementalLimit';
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
  onOpenCategoryDetail?: (
    categoryId: string,
    currency?: CurrencyCode,
    author?: TransactionAuthorFilter,
  ) => void;
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

/** Grupos de movimientos que se montan por tanda al desplazarse. */
const movementPageSize = 40;

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
  summaryPinned = false,
  targetRequestId,
  targetSection,
  transactions = [],
}: ActivityScreenProps) {
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollViewInstance>(null);
  useScrollToTop(scrollRef);
  const handledTargetKeyRef = useRef<string | null>(null);
  const hasPinnedStateMountedRef = useRef(false);
  const scrollOffsetRef = useRef(0);
  const summaryOffsetRef = useRef(0);
  const summaryPulse = useSharedValue(1);
  const [movementsOffset, setMovementsOffset] = useState(0);
  const [accountsOffset, setAccountsOffset] = useState(0);
  const [hasCategoryBreakdownData, setHasCategoryBreakdownData] =
    useState(false);
  const [areCategoriesExpanded, setCategoriesExpanded] = useState(
    categoriesExpanded ?? true,
  );
  const [areAccountsExpanded, setAccountsExpanded] = useState(
    accountsExpanded ?? true,
  );
  const filters = useActivityFilters();
  const [isFiltersModalVisible, setFiltersModalVisible] = useState(false);
  const { authorFilter } = filters;
  const movementPages = useIncrementalLimit(movementPageSize, [
    authorFilter.author,
    filters.type,
    filters.category,
    filters.recurrence,
    filters.date,
    filters.currency,
  ]);
  const [periodModalType, setPeriodModalType] =
    useState<TransactionPeriodModalType | null>(null);
  const [prevCategoriesExpandedProp, setPrevCategoriesExpandedProp] =
    useState(categoriesExpanded);
  if (categoriesExpanded !== prevCategoriesExpandedProp) {
    setPrevCategoriesExpandedProp(categoriesExpanded);
    if (categoriesExpanded !== undefined) {
      setCategoriesExpanded(categoriesExpanded);
    }
  }
  const [prevAccountsExpandedProp, setPrevAccountsExpandedProp] =
    useState(accountsExpanded);
  if (accountsExpanded !== prevAccountsExpandedProp) {
    setPrevAccountsExpandedProp(accountsExpanded);
    if (accountsExpanded !== undefined) {
      setAccountsExpanded(accountsExpanded);
    }
  }
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
    filters.currency ?? currency,
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
  const budgetExpenseByCategoryId = useMemo(
    () => summarizeBudgetExpenses(categories, transactions, effectiveCurrency),
    [categories, effectiveCurrency, transactions],
  );
  // Cada tarjeta lleva su propia moneda, así que la selección de moneda de
  // los movimientos no filtra las cuentas ni mezcla divisas en un saldo.
  const moneyAccountSummaries = useMemo(
    () => summarizeMoneyAccounts(moneyAccounts, transactions),
    [moneyAccounts, transactions],
  );
  const matchesNonDateFilters = filters.matchesMovementFilters;

  // Un periodo futuro proyecta sus recurrencias: limitarse al mes en curso
  // dejaría vacíos los meses siguientes aunque tengan movimientos previstos.
  const filteredTransactions = useMemo(
    () =>
      listActivityTransactions(transactions, filters.date).filter(
        (transaction) =>
          transaction.currency === effectiveCurrency &&
          matchesNonDateFilters(transaction),
      ),
    [effectiveCurrency, filters.date, matchesNonDateFilters, transactions],
  );
  // El detalle de categoría abre con el autor que se está filtrando aquí.
  const openCategoryDetail = (id: string, code = effectiveCurrency) =>
    onOpenCategoryDetail?.(id, code, authorFilter.author);
  const activeFilterCount =
    Number(filters.type !== 'all') +
    Number(filters.category.length > 0) +
    Number(filters.recurrence !== 'all') +
    Number(authorFilter.isActive);
  // «Desde el inicio» resume el mes que se está viendo.
  const months = useActivityMonthSections(filteredTransactions, filters.date);
  const filteredSummary = months.summary;
  const previousDateFilter = useMemo(
    () => getPreviousDateFilter(filters.date),
    [filters.date],
  );
  const previousFilteredSummary = useMemo(() => {
    if (!previousDateFilter) return null;
    const previousTransactions = listTransactionsByDateFilter(
      transactions,
      previousDateFilter,
    ).filter(
      (transaction) =>
        transaction.currency === effectiveCurrency &&
        matchesNonDateFilters(transaction),
    );
    return summarizeTransactionTotals(previousTransactions);
  }, [
    effectiveCurrency,
    matchesNonDateFilters,
    previousDateFilter,
    transactions,
  ]);
  const comparisons = compareTransactionTotals(
    filteredSummary,
    previousFilteredSummary,
  );
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

    // Este efecto también sincroniza con el sistema externo de scroll
    // (rAF + `scrollRef`), por lo que expandir la sección objetivo antes de
    // desplazarse debe ocurrir aquí, no en el render.
    if (targetSection === 'categories') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
          months.onScroll(offset);
        }}
        onScrollDirectionChange={onScrollDirectionChange}
        onEndReached={movementPages.showMore}
        scrollRef={scrollRef}
        stickyHeaderIndices={[4]}
        testID="activity-screen"
        transparentBackground
      >
        <ActivityCollapsibleSection
          expanded={areCategoriesExpanded}
          onToggle={handleCategoriesToggle}
          testID="categories-section"
          title="Categorías"
        >
          {categories.length > 0 ? (
            <CategoryDonutChart
              categories={categories}
              currency={effectiveCurrency}
              onCreateMovement={onCreateMovement}
              onDataAvailabilityChange={setHasCategoryBreakdownData}
              onOpenCategoryDetail={openCategoryDetail}
              resetKey={focusResetKey}
              transactions={currencyTransactionsThroughCurrentMonth}
            />
          ) : null}
          <ActivityCategoryDetail
            budgetExpenseByCategoryId={budgetExpenseByCategoryId}
            categories={categorySummaries}
            categoryView={categoryView}
            currency={effectiveCurrency}
            hasBreakdownData={hasCategoryBreakdownData}
            onCreateCategory={onCreateCategory}
            onOpenCategoryDetail={openCategoryDetail}
            onCategoryViewChange={onCategoryViewChange}
            spaceCurrency={effectiveCurrency}
          />
        </ActivityCollapsibleSection>

        <Animated.View
          layout={getActivityLayoutTransition()}
          onLayout={({ nativeEvent }) =>
            setAccountsOffset(nativeEvent.layout.y)
          }
          style={{ marginTop: spacing.sm * 0.2 }}
          testID="activity-accounts-anchor"
        >
          <ActivityAccountsSection
            accounts={moneyAccountSummaries}
            currency={effectiveCurrency}
            expanded={areAccountsExpanded}
            onCreateMoneyAccount={onCreateMoneyAccount}
            onCreateMovement={onCreateMovement}
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

        <CategoryDetailPeriodFilter
          filter={filters.date}
          onChange={filters.setDate}
          optionsStyle={styles.periodOptions}
          testID="activity-date-period-selector"
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
            months.onSummaryLayout(nativeEvent.layout.height);
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
              balanceComparison={comparisons.balance}
              balanceMinor={filteredSummary.balanceMinor}
              bordered={summaryPinned}
              compact
              currency={effectiveCurrency}
              expenseComparison={comparisons.expense}
              expenseMinor={filteredSummary.expenseMinor}
              incomeComparison={comparisons.income}
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
          <Animated.View
            layout={getActivityLayoutTransition()}
            onLayout={({ nativeEvent }) =>
              months.onListLayout(nativeEvent.layout.y)
            }
          >
            <ActivityMovementList
              categories={categories}
              groupingTransactions={transactions}
              limit={movementPages.limit}
              months={months}
              onOpenTransactionDetail={onOpenTransactionDetail}
              testID="activity-transaction-preview-list"
              transactions={filteredTransactions}
            />
          </Animated.View>
        ) : (
          <Animated.View layout={getActivityLayoutTransition()}>
            {transactionsThroughCurrentMonth.length === 0 ? (
              <CreatePreviewBadge
                accessibilityLabel="Crear primer gasto"
                bordered
                label="Crear movimiento"
                onPress={onCreateExpense}
                testID="activity-empty-movements"
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
        authorOptions={authorFilter.authorOptions}
        categories={categories}
        currencies={availableCurrencies}
        filters={{
          author: authorFilter.author,
          category: filters.category,
          currency: effectiveCurrency,
          date: filters.date,
          recurrence: filters.recurrence,
          type: filters.type,
        }}
        onApply={(nextFilters) => {
          filters.applyFilters(nextFilters);
          setFiltersModalVisible(false);
        }}
        onClose={() => setFiltersModalVisible(false)}
        visible={isFiltersModalVisible}
      />
      {periodModalType ? (
        <TransactionPeriodModal
          categories={categories}
          initialAuthor={authorFilter.author}
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
