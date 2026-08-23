import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { iconSize } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type CategoryTransactionMetricsProps = {
  expense: string;
  expenseMinor: number;
  income: string;
  incomeMinor: number;
};

export function CategoryTransactionMetrics({
  expense,
  expenseMinor,
  income,
  incomeMinor,
}: CategoryTransactionMetricsProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  if (expenseMinor <= 0 && incomeMinor <= 0) return null;

  return (
    <View style={styles.metrics}>
      {expenseMinor > 0 ? (
        <View style={styles.metric} testID="category-expense-metric">
          <View style={styles.metricHeading}>
            <View style={styles.metricIcon}>
              <View style={styles.diagonalArrow}>
                <Ionicons
                  color={colors.expense}
                  name="arrow-down"
                  size={iconSize.sm}
                />
              </View>
            </View>
            <Text tone="secondary" variant="caption">
              Gastos
            </Text>
          </View>
          <Text numberOfLines={1} variant="body" weight="semibold">
            {expense}
          </Text>
        </View>
      ) : null}
      {incomeMinor > 0 ? (
        <View style={styles.metric} testID="category-income-metric">
          <View style={styles.metricHeading}>
            <View style={styles.metricIcon}>
              <View style={styles.diagonalArrow}>
                <Ionicons
                  color={colors.income}
                  name="arrow-up"
                  size={iconSize.sm}
                />
              </View>
            </View>
            <Text tone="secondary" variant="caption">
              Ingresos
            </Text>
          </View>
          <Text numberOfLines={1} variant="body" weight="semibold">
            {income}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    metrics: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.xl,
    },
    metric: {
      minWidth: 0,
      flex: 1,
      gap: spacing.xs,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      padding: spacing.md,
    },
    metricHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    metricIcon: {
      width: iconSize.lg,
      height: iconSize.lg,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
    },
    diagonalArrow: { transform: [{ rotate: '45deg' }] },
  });
}
