import Ionicons from '@expo/vector-icons/Ionicons';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { PeriodComparisonIndicator } from '@/features/transactions/components/PeriodComparisonIndicator/PeriodComparisonIndicator';
import type { PeriodComparisonResult } from '@/features/transactions/utils/periodComparison';
import {
  defaultCurrencyCode,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import { formatCurrency } from '@/lib/currency/formatCurrency';
import { colors } from '@/theme/colors';
import { iconSize } from '@/theme/layout';
import { previewCardLayout } from '@/theme/previewCard';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';

type ComparisonPlacement = 'amount' | 'title';

type TransactionSummaryBadgesProps = {
  accessibilityContext: string;
  balanceComparison?: PeriodComparisonResult;
  balanceMinor?: number;
  bordered?: boolean;
  compact?: boolean;
  comparisonPeriodLabel?: string;
  /** Dónde se muestra el % de cambio dentro del badge. Por defecto, bajo el importe. */
  comparisonPlacement?: ComparisonPlacement;
  currency?: CurrencyCode;
  expenseComparison?: PeriodComparisonResult;
  expenseMinor: number;
  incomeComparison?: PeriodComparisonResult;
  incomeMinor: number;
  onBalancePress?: () => void;
  onExpensePress?: () => void;
  onIncomePress?: () => void;
  style?: StyleProp<ViewStyle>;
  testIDPrefix: string;
};

type MetricBadgeProps = {
  accessibilityLabel: string;
  amount: string;
  bordered: boolean;
  compact: boolean;
  comparison?: PeriodComparisonResult;
  comparisonPlacement: ComparisonPlacement;
  icon: 'balance' | 'expense' | 'income';
  label: string;
  onPress?: () => void;
  testIDPrefix: string;
};

function MetricBadge({
  accessibilityLabel,
  amount,
  bordered,
  compact,
  comparison,
  comparisonPlacement,
  icon,
  label,
  onPress,
  testIDPrefix,
}: MetricBadgeProps) {
  const isBalance = icon === 'balance';
  const isIncome = icon === 'income';
  const iconName = isBalance
    ? 'swap-vertical-outline'
    : isIncome
      ? 'arrow-up'
      : 'arrow-down';

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={onPress ? 'button' : undefined}
      accessible
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.badge,
        compact ? styles.compactBadge : null,
        bordered ? styles.borderedBadge : null,
        pressed ? styles.pressed : null,
      ]}
      testID={`${testIDPrefix}-${icon}-badge`}
    >
      <View
        style={[
          styles.icon,
          compact ? styles.compactIcon : null,
          isBalance
            ? styles.balanceIcon
            : isIncome
              ? styles.incomeIcon
              : styles.expenseIcon,
        ]}
        testID={`${testIDPrefix}-${icon}-icon-background`}
      >
        <View
          style={isBalance ? null : styles.diagonalArrow}
          testID={`${testIDPrefix}-${icon}-icon`}
        >
          <Ionicons
            color={colors.onBrand}
            name={iconName}
            size={iconSize.xs}
            testID={`${testIDPrefix}-${icon}-glyph`}
          />
        </View>
      </View>
      <View style={styles.metricText}>
        <View style={styles.labelRow}>
          <Text
            numberOfLines={1}
            testID={`${testIDPrefix}-${icon}-label`}
            tone="secondary"
            variant="footnote"
            weight="regular"
          >
            {label}
          </Text>
          {comparison && comparisonPlacement === 'title' ? (
            <PeriodComparisonIndicator
              comparison={comparison}
              compact
              testID={`${testIDPrefix}-${icon}-comparison`}
              tone={icon}
            />
          ) : null}
        </View>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          numberOfLines={1}
          testID={`${testIDPrefix}-${icon}-amount`}
          variant={compact ? 'footnote' : 'bodyStrong'}
          weight="semibold"
        >
          {amount}
        </Text>
        {comparison && comparisonPlacement === 'amount' ? (
          <PeriodComparisonIndicator
            comparison={comparison}
            compact
            testID={`${testIDPrefix}-${icon}-comparison`}
            tone={icon}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

export function TransactionSummaryBadges({
  accessibilityContext,
  balanceComparison,
  balanceMinor,
  bordered = false,
  compact = false,
  comparisonPeriodLabel,
  comparisonPlacement = 'amount',
  currency = defaultCurrencyCode,
  expenseComparison,
  expenseMinor,
  incomeComparison,
  incomeMinor,
  onBalancePress,
  onExpensePress,
  onIncomePress,
  style,
  testIDPrefix,
}: TransactionSummaryBadgesProps) {
  const income = formatCurrency(incomeMinor, currency, 'es-ES');
  const expense = formatCurrency(expenseMinor, currency, 'es-ES');
  const balance =
    balanceMinor === undefined
      ? null
      : formatCurrency(balanceMinor, currency, 'es-ES');
  const hasComparison = Boolean(
    incomeComparison ?? expenseComparison ?? balanceComparison,
  );

  return (
    <View testID={`${testIDPrefix}-summary-group`}>
      {comparisonPeriodLabel && hasComparison ? (
        <Text
          style={styles.comparisonLabel}
          testID={`${testIDPrefix}-comparison-label`}
          tone="secondary"
          variant="overline"
        >
          {comparisonPeriodLabel}
        </Text>
      ) : null}
      <View style={[styles.badges, style]} testID={`${testIDPrefix}-summary`}>
        <MetricBadge
          accessibilityLabel={`Ingresos ${accessibilityContext}: ${income}`}
          amount={income}
          bordered={bordered}
          compact={compact}
          comparison={incomeComparison}
          comparisonPlacement={comparisonPlacement}
          icon="income"
          label="Ingresos"
          onPress={onIncomePress}
          testIDPrefix={testIDPrefix}
        />
        <MetricBadge
          accessibilityLabel={`Gastos ${accessibilityContext}: ${expense}`}
          amount={expense}
          bordered={bordered}
          compact={compact}
          comparison={expenseComparison}
          comparisonPlacement={comparisonPlacement}
          icon="expense"
          label="Gastos"
          onPress={onExpensePress}
          testIDPrefix={testIDPrefix}
        />
        {balance === null ? null : (
          <MetricBadge
            accessibilityLabel={`Balance ${accessibilityContext}: ${balance}`}
            amount={balance}
            bordered={bordered}
            compact={compact}
            comparison={balanceComparison}
            comparisonPlacement={comparisonPlacement}
            icon="balance"
            label="Balance"
            onPress={onBalancePress}
            testIDPrefix={testIDPrefix}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  comparisonLabel: {
    marginBottom: spacing.xxs,
    textAlign: 'center',
  },
  badges: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  badge: {
    ...shadows.subtle,
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: previewCardLayout.borderRadius,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  compactBadge: {
    paddingHorizontal: spacing.sm,
  },
  borderedBadge: {
    borderColor: colors.border,
    borderWidth: 1,
  },
  metricText: {
    minWidth: 0,
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  icon: {
    width: iconSize.md,
    height: iconSize.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: previewCardLayout.directionIconRadius,
  },
  compactIcon: {
    width: iconSize.sm,
    height: iconSize.sm,
  },
  incomeIcon: {
    backgroundColor: colors.incomeSoft,
  },
  expenseIcon: {
    backgroundColor: colors.expenseSoft,
  },
  balanceIcon: {
    backgroundColor: colors.cta,
  },
  diagonalArrow: {
    transform: [{ rotate: '45deg' }],
  },
  pressed: { opacity: 0.72 },
});
