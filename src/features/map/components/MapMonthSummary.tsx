import { View } from 'react-native';

import { TransactionSummaryBadges } from '@/features/transactions/components/TransactionSummaryBadges/TransactionSummaryBadges';
import type { compareTransactionTotals } from '@/features/transactions/utils/periodComparison';
import type { TransactionTotals } from '@/features/transactions/utils/transactionSummary';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';

type MapMonthSummaryProps = {
  /** Comparación con el mes anterior; alterna con cada importe. */
  comparisons: ReturnType<typeof compareTransactionTotals>;
  currency: CurrencyCode;
  gutter: number;
  onBalancePress: () => void;
  onExpensePress: () => void;
  onIncomePress: () => void;
  totals: TransactionTotals;
};

export function MapMonthSummary({
  comparisons,
  currency,
  gutter,
  onBalancePress,
  onExpensePress,
  onIncomePress,
  totals,
}: MapMonthSummaryProps) {
  return (
    <View
      collapsable={false}
      style={{ paddingHorizontal: gutter, paddingBottom: spacing.md }}
      testID="map-month-summary-panel"
    >
      <View collapsable={false}>
        <TransactionSummaryBadges
          accessibilityContext="del mes seleccionado"
          balanceComparison={comparisons.balance}
          balanceMinor={totals.balanceMinor}
          bordered
          compact
          currency={currency}
          expenseComparison={comparisons.expense}
          expenseMinor={totals.expenseMinor}
          incomeComparison={comparisons.income}
          incomeMinor={totals.incomeMinor}
          onBalancePress={onBalancePress}
          onExpensePress={onExpensePress}
          onIncomePress={onIncomePress}
          style={{ minHeight: layout.minTouchTarget }}
          testIDPrefix="map-month"
        />
      </View>
    </View>
  );
}
