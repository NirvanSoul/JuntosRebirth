import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import type { MoneyAccountCurrencyBalance } from '@/features/accounts/utils/moneyAccountSummary';
import { createMetricStyles } from '@/features/accounts/components/MoneyAccountDetailModal/MoneyAccountDetailModal.styles';
import { formatCurrency } from '@/lib/currency/formatCurrency';
import { iconSize } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

export type AccountTransactionMetricProps = {
  balance: MoneyAccountCurrencyBalance;
  type: 'expense' | 'income';
};

export function AccountTransactionMetric({
  balance,
  type,
}: AccountTransactionMetricProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles((palette) => createMetricStyles(palette));
  const isIncome = type === 'income';
  const amountMinor = isIncome ? balance.incomeMinor : balance.expenseMinor;
  const label = `${isIncome ? 'Ingresos' : 'Gastos'} ${balance.currency}`;
  const amount = formatCurrency(amountMinor, balance.currency, 'es-ES');

  return (
    <View
      accessibilityLabel={`${label} en ${balance.currency}: ${amount}`}
      style={styles.metric}
      testID={`money-account-${type}-${balance.currency}`}
    >
      <View style={styles.metricHeading}>
        <View
          style={styles.metricIcon}
          testID={`money-account-${type}-${balance.currency}-icon`}
        >
          <View style={styles.diagonalArrow}>
            <Ionicons
              color={isIncome ? colors.income : colors.expense}
              name={isIncome ? 'arrow-up' : 'arrow-down'}
              size={iconSize.sm}
              testID={`money-account-${type}-${balance.currency}-glyph`}
            />
          </View>
        </View>
        <Text tone="secondary" variant="caption">
          {label}
        </Text>
      </View>
      <Text numberOfLines={1} variant="body" weight="semibold">
        {amount}
      </Text>
    </View>
  );
}
