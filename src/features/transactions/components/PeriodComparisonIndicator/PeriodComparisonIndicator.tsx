import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Text, type TextTone } from '@/components/ui/Text/Text';
import type { PeriodComparisonResult } from '@/features/transactions/utils/periodComparison';
import { colors } from '@/theme/colors';
import { iconSize } from '@/theme/layout';
import { spacing } from '@/theme/spacing';

type PeriodComparisonIndicatorProps = {
  comparison: PeriodComparisonResult;
  compact?: boolean;
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
  const isFavorable = direction === 'up' ? risingIsFavorable : !risingIsFavorable;

  return isFavorable ? 'income' : 'expense';
}

export function PeriodComparisonIndicator({
  comparison,
  compact = false,
  testID,
  tone,
}: PeriodComparisonIndicatorProps) {
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
  const label = `${Math.round(Math.abs(comparison.changePercent))}%`;

  return (
    <View style={styles.container} testID={testID}>
      <Ionicons color={iconColor} name={iconName} size={iconSize.xs} />
      <Text tone={textTone} variant={compact ? 'overline' : 'caption'} weight="semibold">
        {label}
      </Text>
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
