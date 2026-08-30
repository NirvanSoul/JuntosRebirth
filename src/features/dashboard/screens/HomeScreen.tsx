import type { ReactNode } from 'react';
import { useMemo, useRef, useState } from 'react';
import { useScrollToTop } from '@react-navigation/native';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

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
import { CategoryPreviewCard } from '@/features/categories/components/CategoryPreviewCard/CategoryPreviewCard';
import type { Category } from '@/features/categories/types';
import { summarizeCategories } from '@/features/categories/utils/categorySummary';
import { IncomeExpenseArc } from '@/features/dashboard/components/IncomeExpenseArc/IncomeExpenseArc';
import { TransactionPeriodModal } from '@/features/dashboard/components/TransactionPeriodModal/TransactionPeriodModal';
import { getPreviousPeriodTransactions } from '@/features/dashboard/utils/transactionPeriod';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { TransactionPreviewList } from '@/features/transactions/components/TransactionPreviewList/TransactionPreviewList';
import { TransactionSummaryBadges } from '@/features/transactions/components/TransactionSummaryBadges/TransactionSummaryBadges';
import type { SessionTransaction } from '@/features/transactions/types';
import { calculatePeriodComparison } from '@/features/transactions/utils/periodComparison';
import {
  listTransactionsThroughCurrentMonth,
  sortTransactionsByRecentActivity,
  summarizeTransactionTotals,
  summarizeTransactions,
} from '@/features/transactions/utils/transactionSummary';
import {
  defaultCurrencyCode,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import { formatCurrency } from '@/lib/currency/formatCurrency';
import { layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/useTheme';

const recentTransactionLimit = 8;

type HomeScreenProps = {
  categories?: readonly Category[];
  moneyAccounts?: readonly MoneyAccount[];
  /** Moneda del resumen superior (balance, ingresos y gastos del mes). */
  currency?: CurrencyCode;
  /** Moneda del espacio activo para cálculo de presupuestos. */
  spaceCurrency?: CurrencyCode;
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
  topContent?: ReactNode;
  /** Muestra el % de cambio de Ingresos/Gastos frente al mes anterior. */
  showComparisonIndicators?: boolean;
  transactions?: readonly SessionTransaction[];
};

export function HomeScreen({
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
  showComparisonIndicators = false,
  spaceCurrency = defaultCurrencyCode,
  topContent,
  transactions = [],
}: HomeScreenProps) {
  const { colors } = useTheme();
  const density = useLayoutDensity();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const [isIncomeModalVisible, setIncomeModalVisible] = useState(false);
  const [isExpenseModalVisible, setExpenseModalVisible] = useState(false);
  const [isBalanceModalVisible, setBalanceModalVisible] = useState(false);
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
  const summary = useMemo(
    () => summarizeTransactions(currencyTransactions),
    [currencyTransactions],
  );
  const previousMonthTotals = useMemo(() => {
    if (!showComparisonIndicators) {
      return null;
    }

    const previousMonthTransactions = getPreviousPeriodTransactions(
      currencyTransactions,
      'month',
      new Date(),
    );

    return summarizeTransactionTotals(previousMonthTransactions);
  }, [currencyTransactions, showComparisonIndicators]);
  const incomeComparison = previousMonthTotals
    ? (calculatePeriodComparison(
        summary.monthIncomeMinor,
        previousMonthTotals.incomeMinor,
      ) ?? undefined)
    : undefined;
  const expenseComparison = previousMonthTotals
    ? (calculatePeriodComparison(
        summary.monthExpenseMinor,
        previousMonthTotals.expenseMinor,
      ) ?? undefined)
    : undefined;
  const categorySummaries = useMemo(
    () => summarizeCategories(categories, transactions, currency),
    [categories, currency, transactions],
  );
  const budgetSummaries = useMemo(
    () =>
      currency === spaceCurrency
        ? categorySummaries
        : summarizeCategories(categories, transactions, spaceCurrency),
    [categories, categorySummaries, currency, spaceCurrency, transactions],
  );
  const budgetExpenseByCategoryId = useMemo(
    () => new Map(budgetSummaries.map((item) => [item.id, item.expenseMinor])),
    [budgetSummaries],
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
  const balance = formatCurrency(summary.balanceMinor, currency, 'es-ES');

  return (
    <>
      <Screen
        onScrollDirectionChange={onScrollDirectionChange}
        scrollRef={scrollRef}
        testID="home-screen"
      >
        {topContent}
        <IncomeExpenseArc
          expenseMinor={summary.monthExpenseMinor}
          incomeMinor={summary.monthIncomeMinor}
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
          accessibilityContext="de este mes"
          comparisonPlacement="title"
          currency={currency}
          expenseComparison={expenseComparison}
          expenseMinor={summary.monthExpenseMinor}
          incomeComparison={incomeComparison}
          incomeMinor={summary.monthIncomeMinor}
          onExpensePress={() => setExpenseModalVisible(true)}
          onIncomePress={() => setIncomeModalVisible(true)}
          style={styles.monthBadges}
          testIDPrefix="home"
        />

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
            {categorySummaries.map(({ id, ...category }) => (
              <CategoryPreviewCard
                key={id}
                {...category}
                budgetExpenseMinor={budgetExpenseByCategoryId.get(id) ?? 0}
                displayCurrency={currency}
                onPress={() => onOpenCategoryDetail?.(id)}
                spaceCurrency={spaceCurrency}
                variant="tile"
              />
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
            description="Crea una categoría para organizar tus movimientos."
            icon="pie-chart-outline"
            iconBackgroundColor={colors.categoryAction}
            onPress={onCreateCategory}
            testID="home-empty-categories"
            title="Aún no hay categorías"
          />
        )}

        <HomeSectionHeader onViewMore={onViewAccounts} title="Cuentas" />
        {moneyAccountSummaries.length > 0 ? (
          <MoneyAccountCarousel
            accounts={moneyAccountSummaries}
            gutter={layout.screenGutter[density]}
            onCreateMoneyAccount={onCreateMoneyAccount}
            onOpenMoneyAccountDetail={onOpenMoneyAccountDetail}
            testID="home-account-scroller"
          />
        ) : (
          <EmptyState
            accessibilityLabel="Crear primera cuenta"
            description="Crea una cuenta para saber cuánto te queda en cada sitio."
            icon="wallet-outline"
            iconBackgroundColor={colors.cta}
            onPress={onCreateMoneyAccount}
            testID="home-empty-accounts"
            title="Aún no hay cuentas"
          />
        )}

        <HomeSectionHeader
          onViewMore={onViewMovements}
          title="Movimientos Recientes"
        />
        {transactionsThroughCurrentMonth.length > 0 ? (
          <>
            <TransactionPreviewList
              categories={categories}
              groupingTransactions={transactions}
              limit={recentTransactionLimit}
              onOpenTransactionDetail={onOpenTransactionDetail}
              testID="home-transaction-preview-list"
              transactions={recentTransactions}
            />
            {transactionsThroughCurrentMonth.length > recentTransactionLimit ? (
              <HomeTransactionListFooter onPress={onViewMovements} />
            ) : null}
          </>
        ) : (
          <EmptyState
            accessibilityLabel="Crear primer gasto"
            description="Registra un gasto para empezar a ver tu actividad."
            icon="swap-vertical-outline"
            iconBackgroundColor={colors.cta}
            onPress={onCreateExpense}
            testID="home-empty-activity"
            title="Aún no hay movimientos"
          />
        )}
      </Screen>
      <TransactionPeriodModal
        categories={categories}
        onAdd={() => {
          setBalanceModalVisible(false);
          onCreateMovement?.();
        }}
        onClose={() => setBalanceModalVisible(false)}
        onOpenTransactionDetail={(transactionId) => {
          setBalanceModalVisible(false);
          onOpenTransactionDetail?.(transactionId);
        }}
        transactions={transactions}
        type="balance"
        visible={isBalanceModalVisible}
      />
      <TransactionPeriodModal
        categories={categories}
        onAdd={() => {
          setIncomeModalVisible(false);
          onCreateIncome?.();
        }}
        onClose={() => setIncomeModalVisible(false)}
        onOpenTransactionDetail={(transactionId) => {
          setIncomeModalVisible(false);
          onOpenTransactionDetail?.(transactionId);
        }}
        transactions={transactions}
        type="income"
        visible={isIncomeModalVisible}
      />
      <TransactionPeriodModal
        categories={categories}
        onAdd={() => {
          setExpenseModalVisible(false);
          onCreateExpense?.();
        }}
        onClose={() => setExpenseModalVisible(false)}
        onOpenTransactionDetail={(transactionId) => {
          setExpenseModalVisible(false);
          onOpenTransactionDetail?.(transactionId);
        }}
        transactions={transactions}
        type="expense"
        visible={isExpenseModalVisible}
      />
    </>
  );
}

const styles = StyleSheet.create({
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
