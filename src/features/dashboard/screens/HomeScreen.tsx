import type { ReactNode } from 'react';
import { useMemo, useRef, useState } from 'react';
import { useScrollToTop } from '@react-navigation/native';
import {
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { EmptyState } from '@/components/feedback/EmptyState/EmptyState';
import { Screen } from '@/components/layout/Screen/Screen';
import { CreatePreviewBadge } from '@/components/ui/CreatePreviewBadge/CreatePreviewBadge';
import { Text } from '@/components/ui/Text/Text';
import { MoneyAccountCarousel } from '@/features/accounts/components/MoneyAccountCarousel/MoneyAccountCarousel';
import type { MoneyAccount } from '@/features/accounts/types';
import { summarizeMoneyAccounts } from '@/features/accounts/utils/moneyAccountSummary';
import {
  HomeSectionHeader,
  HomeTransactionListFooter,
} from '@/features/dashboard/components/HomeSectionHeader/HomeSectionHeader';
import { CategoryDetailPeriodFilter } from '@/features/categories/components/CategoryDetailModal/CategoryDetailPeriodFilter';
import { CategoryPreviewCard } from '@/features/categories/components/CategoryPreviewCard/CategoryPreviewCard';
import type { Category } from '@/features/categories/types';
import {
  summarizeCategories,
  summarizeBudgetExpenses,
} from '@/features/categories/utils/categorySummary';
import { HomeEntrance } from '@/features/dashboard/components/HomeEntrance';
import { IncomeExpenseArc } from '@/features/dashboard/components/IncomeExpenseArc/IncomeExpenseArc';
import { TransactionPeriodModal } from '@/features/dashboard/components/TransactionPeriodModal/TransactionPeriodModal';
import { useHomePeriodTotals } from '@/features/dashboard/hooks/useHomePeriodTotals';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { TransactionPreviewList } from '@/features/transactions/components/TransactionPreviewList/TransactionPreviewList';
import { TransactionSummaryBadges } from '@/features/transactions/components/TransactionSummaryBadges/TransactionSummaryBadges';
import type { SessionTransaction } from '@/features/transactions/types';
import {
  listTransactionsThroughCurrentMonth,
  sortTransactionsByRecentActivity,
} from '@/features/transactions/utils/transactionSummary';
import {
  defaultCurrencyCode,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import { useCurrencySymbolPreference } from '@/state/appPreferences/CurrencySymbolPreferenceProvider';
import { layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import { getStartupEntering } from '@/theme/transitions';
import { useTheme } from '@/theme/useTheme';

const recentTransactionLimit = 8;

type HomeScreenProps = {
  categories?: readonly Category[];
  moneyAccounts?: readonly MoneyAccount[];
  /** Moneda del resumen superior (balance, ingresos y gastos del periodo). */
  currency?: CurrencyCode;
  onCreateCategory?: () => void;
  onCreateExpense?: () => void;
  onCreateMoneyAccount?: () => void;
  onCreateIncome?: () => void;
  onCreateMovement?: () => void;
  onOpenCategoryDetail?: (categoryId: string) => void;
  onOpenMoneyAccountDetail?: (moneyAccountId: string) => void;
  onOpenTransactionDetail?: (transactionId: string) => void;
  onScrollDirectionChange?: (direction: 'down' | 'up') => void;
  onViewAccounts?: () => void;
  onViewCategories?: () => void;
  onViewMovements?: () => void;
  /** Cambia al reenfocar la pantalla para reiniciar el arco de balance. */
  focusResetKey?: number;
  /**
   * Identifica el espacio mostrado: al cambiar, los bloques de Inicio repiten
   * su entrada (suben y aparecen uno tras otro).
   */
  revealKey?: string;
  topContent?: ReactNode;
  /** Anuncio que se muestra bajo los resúmenes de ingresos y gastos. */
  adContent?: ReactNode;
  /** Muestra el % de cambio de Ingresos/Gastos frente al periodo anterior. */
  showComparisonIndicators?: boolean;
  transactions?: readonly SessionTransaction[];
};

export function HomeScreen({
  adContent,
  categories = [],
  currency = defaultCurrencyCode,
  focusResetKey,
  moneyAccounts = [],
  onCreateCategory,
  onCreateExpense,
  onCreateIncome,
  onCreateMoneyAccount,
  onCreateMovement,
  onOpenCategoryDetail,
  onOpenMoneyAccountDetail,
  onOpenTransactionDetail,
  onScrollDirectionChange,
  onViewAccounts,
  onViewCategories,
  onViewMovements,
  revealKey,
  showComparisonIndicators = false,
  topContent,
  transactions = [],
}: HomeScreenProps) {
  const { formatCurrency } = useCurrencySymbolPreference();
  const { colors } = useTheme();
  const density = useLayoutDensity();
  const scrollRef = useRef<ScrollViewInstance>(null);
  useScrollToTop(scrollRef);
  const [isIncomeModalVisible, setIncomeModalVisible] = useState(false);
  const [isExpenseModalVisible, setExpenseModalVisible] = useState(false);
  const [isBalanceModalVisible, setBalanceModalVisible] = useState(false);
  const handleOpenTransactionDetail = (transactionId: string) => {
    setBalanceModalVisible(false);
    setIncomeModalVisible(false);
    setExpenseModalVisible(false);
    onOpenTransactionDetail?.(transactionId);
  };
  const transactionsThroughCurrentMonth = useMemo(
    () => listTransactionsThroughCurrentMonth(transactions),
    [transactions],
  );
  // El balance, los indicadores de ingresos/gastos y el desglose de categorías
  // reaccionan a la moneda elegida en el encabezado; los movimientos recientes
  // conservan todas las monedas.
  const currencyTransactions = useMemo(
    () =>
      transactions.filter((transaction) => transaction.currency === currency),
    [currency, transactions],
  );
  const {
    balanceMinor,
    dateFilter,
    expenseComparison,
    incomeComparison,
    periodContext,
    periodTotals,
    setDateFilter,
  } = useHomePeriodTotals(currencyTransactions, showComparisonIndicators);
  const categorySummaries = useMemo(
    () => summarizeCategories(categories, transactions, currency),
    [categories, currency, transactions],
  );
  const budgetExpenseByCategoryId = useMemo(
    () => summarizeBudgetExpenses(categories, transactions, currency),
    [categories, currency, transactions],
  );
  // Cada tarjeta muestra el saldo en la moneda de su propia cuenta, así que
  // el selector de moneda del encabezado no las filtra: un saldo nunca mezcla
  // divisas y ninguna cuenta desaparece al cambiar de moneda.
  const moneyAccountSummaries = useMemo(
    () => summarizeMoneyAccounts(moneyAccounts, transactions),
    [moneyAccounts, transactions],
  );
  const recentTransactions = useMemo(
    () => sortTransactionsByRecentActivity(transactionsThroughCurrentMonth),
    [transactionsThroughCurrentMonth],
  );
  const balance = formatCurrency(balanceMinor, currency, 'es-ES');

  return (
    <>
      <Screen
        onScrollDirectionChange={onScrollDirectionChange}
        scrollRef={scrollRef}
        testID="home-screen"
      >
        <HomeEntrance revealKey={revealKey}>
          {topContent}
          <CategoryDetailPeriodFilter
            filter={dateFilter}
            onChange={setDateFilter}
            optionsStyle={styles.periodOptions}
            testID="home-period-selector"
          />
          <IncomeExpenseArc
            accessibilityContext={periodContext}
            expenseMinor={periodTotals.expenseMinor}
            incomeMinor={periodTotals.incomeMinor}
            resetKey={focusResetKey}
            testID="home-income-expense-arc"
          >
            <Pressable
              accessibilityLabel={`Balance disponible: ${balance}`}
              accessibilityRole="button"
              onPress={() => setBalanceModalVisible(true)}
              style={({ pressed }) => [
                styles.balanceHero,
                pressed ? styles.balanceHeroPressed : null,
              ]}
              testID="home-balance-hero"
            >
              <Text align="center" tone="secondary" variant="label">
                Balance disponible
              </Text>
              <Text
                adjustsFontSizeToFit
                align="center"
                minimumFontScale={0.6}
                numberOfLines={1}
                style={styles.balanceAmount}
                testID="home-balance"
                variant="amountHero"
              >
                {balance}
              </Text>
            </Pressable>
          </IncomeExpenseArc>

          <TransactionSummaryBadges
            animateEntrance
            accessibilityContext={periodContext}
            comparisonPlacement="title"
            currency={currency}
            expenseComparison={expenseComparison}
            expenseMinor={periodTotals.expenseMinor}
            incomeComparison={incomeComparison}
            incomeMinor={periodTotals.incomeMinor}
            onExpensePress={() => setExpenseModalVisible(true)}
            onIncomePress={() => setIncomeModalVisible(true)}
            style={styles.monthBadges}
            testIDPrefix="home"
          />
          {adContent}

          <HomeSectionHeader onViewMore={onViewCategories} title="Categorías" />
          {categorySummaries.length > 0 ? (
            <ScrollView
              contentContainerStyle={[
                styles.categoryList,
                {
                  paddingHorizontal: layout.screenGutter[density],
                  paddingVertical: spacing.md,
                },
              ]}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={[
                styles.categoryScroller,
                { marginHorizontal: -layout.screenGutter[density] },
              ]}
              testID="home-category-scroller"
            >
              {categorySummaries.map(({ id, ...category }, index) => (
                <Animated.View
                  key={id}
                  entering={getStartupEntering(index + 3)}
                >
                  <CategoryPreviewCard
                    {...category}
                    actionTarget={{ kind: 'category', id }}
                    budgetExpenseMinor={budgetExpenseByCategoryId.get(id) ?? 0}
                    displayCurrency={currency}
                    onPress={() => onOpenCategoryDetail?.(id)}
                    spaceCurrency={currency}
                    variant="tile"
                  />
                </Animated.View>
              ))}
              {onCreateCategory ? (
                <CreatePreviewBadge
                  accessibilityLabel="Crear categoría"
                  label="Crear categoría"
                  onPress={onCreateCategory}
                  testID="home-category-create-badge"
                />
              ) : null}
            </ScrollView>
          ) : (
            <EmptyState
              accessibilityLabel="Crear primera categoría"
              icon="pie-chart-outline"
              iconBackgroundColor={colors.categoryAction}
              onPress={onCreateCategory}
              testID="home-empty-categories"
              title="Crea una categoría"
            />
          )}

          <HomeSectionHeader onViewMore={onViewAccounts} title="Cuentas" />
          {moneyAccountSummaries.length > 0 ? (
            <MoneyAccountCarousel
              animateEntrance
              accounts={moneyAccountSummaries}
              gutter={layout.screenGutter[density]}
              onCreateMoneyAccount={onCreateMoneyAccount}
              onOpenMoneyAccountDetail={onOpenMoneyAccountDetail}
              testID="home-account-scroller"
            />
          ) : (
            <CreatePreviewBadge
              accessibilityLabel="Crear primera cuenta"
              bordered
              label="Crear cuenta"
              onPress={onCreateMoneyAccount}
              testID="home-account-create-badge"
            />
          )}

          <HomeSectionHeader
            onViewMore={onViewMovements}
            title="Movimientos Recientes"
          />
          {transactionsThroughCurrentMonth.length > 0 ? (
            <>
              <TransactionPreviewList
                animateEntrance
                categories={categories}
                groupingTransactions={transactions}
                limit={recentTransactionLimit}
                onOpenTransactionDetail={onOpenTransactionDetail}
                testID="home-transaction-preview-list"
                transactions={recentTransactions}
              />
              {transactionsThroughCurrentMonth.length >
              recentTransactionLimit ? (
                <HomeTransactionListFooter onPress={onViewMovements} />
              ) : null}
            </>
          ) : (
            <CreatePreviewBadge
              accessibilityLabel="Crear primer gasto"
              bordered
              label="Crear movimiento"
              onPress={onCreateExpense}
              testID="home-empty-activity"
            />
          )}
        </HomeEntrance>
      </Screen>
      <TransactionPeriodModal
        categories={categories}
        chainActionsAfterDismiss
        onAdd={() => {
          setBalanceModalVisible(false);
          onCreateMovement?.();
        }}
        onClose={() => setBalanceModalVisible(false)}
        onOpenTransactionDetail={handleOpenTransactionDetail}
        transactions={transactions}
        type="balance"
        visible={isBalanceModalVisible}
      />
      <TransactionPeriodModal
        categories={categories}
        chainActionsAfterDismiss
        onAdd={() => {
          setIncomeModalVisible(false);
          onCreateIncome?.();
        }}
        onClose={() => setIncomeModalVisible(false)}
        onOpenTransactionDetail={handleOpenTransactionDetail}
        transactions={transactions}
        type="income"
        visible={isIncomeModalVisible}
      />
      <TransactionPeriodModal
        categories={categories}
        chainActionsAfterDismiss
        onAdd={() => {
          setExpenseModalVisible(false);
          onCreateExpense?.();
        }}
        onClose={() => setExpenseModalVisible(false)}
        onOpenTransactionDetail={handleOpenTransactionDetail}
        transactions={transactions}
        type="expense"
        visible={isExpenseModalVisible}
      />
    </>
  );
}

const styles = StyleSheet.create({
  periodOptions: { marginBottom: spacing.lg },
  balanceHero: {
    minHeight: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.none,
  },
  balanceHeroPressed: { opacity: 0.72 },
  balanceAmount: {
    marginTop: spacing.sm,
  },
  monthBadges: {
    marginTop: spacing.lg,
  },
  categoryList: {
    gap: spacing.sm,
    overflow: 'visible',
  },
  categoryScroller: { overflow: 'visible' },
});
