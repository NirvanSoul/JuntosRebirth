import { View } from 'react-native';

import { TransactionSummaryBadges } from '@/features/transactions/components/TransactionSummaryBadges/TransactionSummaryBadges';
import type { TransactionTotals } from '@/features/transactions/utils/transactionSummary';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';

type MapMonthSummaryProps = {
  currency: CurrencyCode;
  gutter: number;
  onBalancePress: () => void;
  onExpensePress: () => void;
  onIncomePress: () => void;
  totals: TransactionTotals;
};

export function MapMonthSummary({
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
          balanceMinor={totals.balanceMinor}
          bordered
          compact
          currency={currency}
          expenseMinor={totals.expenseMinor}
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
