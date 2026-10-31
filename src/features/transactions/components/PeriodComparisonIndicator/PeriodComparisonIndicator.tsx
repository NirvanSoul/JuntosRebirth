import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Text, type TextTone } from '@/components/ui/Text/Text';
import {
  describeComparisonDirection,
  type PeriodComparisonResult,
} from '@/features/transactions/utils/periodComparison';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { useCurrencySymbolPreference } from '@/state/appPreferences/CurrencySymbolPreferenceProvider';
import { iconSize } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/useTheme';

type PeriodComparisonIndicatorProps = {
  comparison: PeriodComparisonResult;
  compact?: boolean;
  currency: CurrencyCode;
  /** «el mes anterior»: añade «menos que el mes anterior» tras el importe. */
  previousPeriodLabel?: string;
  testID?: string;
  tone: 'balance' | 'expense' | 'income';
};

function resolveTone(
  tone: PeriodComparisonIndicatorProps['tone'],
  direction: PeriodComparisonResult['direction'],
): TextTone {
  if (direction === 'flat') {
    return 'muted';
  }

  const risingIsFavorable = tone !== 'expense';
  const isFavorable =
    direction === 'up' ? risingIsFavorable : !risingIsFavorable;

  return isFavorable ? 'income' : 'expense';
}

export function PeriodComparisonIndicator({
  comparison,
  compact = false,
  currency,
  previousPeriodLabel,
  testID,
  tone,
}: PeriodComparisonIndicatorProps) {
  const { colors } = useTheme();
  const { formatCurrency } = useCurrencySymbolPreference();
  const textTone = resolveTone(tone, comparison.direction);
  const iconColor =
    textTone === 'income'
      ? colors.income
      : textTone === 'expense'
        ? colors.expense
        : colors.textMuted;
  const iconName =
    comparison.direction === 'up'
      ? 'caret-up'
      : comparison.direction === 'down'
        ? 'caret-down'
        : 'remove';
  const label = formatCurrency(
    Math.abs(comparison.changeMinor),
    currency,
    'es-ES',
  );

  return (
    <View style={styles.container} testID={testID}>
      <Ionicons color={iconColor} name={iconName} size={iconSize.xs} />
      <Text
        tone={textTone}
        variant={compact ? 'overline' : 'caption'}
        weight="semibold"
      >
        {label}
      </Text>
      {previousPeriodLabel ? (
        <Text tone="secondary" variant="overline">
          {describeComparisonDirection(
            comparison.direction,
            previousPeriodLabel,
          )}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
});
