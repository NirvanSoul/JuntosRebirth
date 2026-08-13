import { StyleSheet, View } from 'react-native';

import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useThemedStyles } from '@/theme/useThemedStyles';

type CategoryBudgetProgressProps = {
  accessibilityText: string;
  color: string;
  progress: number;
  size?: 'regular' | 'compact';
  testID?: string;
};

export function CategoryBudgetProgress({
  accessibilityText,
  color,
  progress,
  size = 'regular',
  testID = 'category-budget-progress',
}: CategoryBudgetProgressProps) {
  const styles = useThemedStyles(createStyles);
  const normalizedProgress = Math.min(Math.max(progress, 0), 1);

  return (
    <View
      accessibilityLabel="Progreso del presupuesto"
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(normalizedProgress * 100),
        text: accessibilityText,
      }}
      accessible
      style={[styles.track, size === 'compact' && styles.trackCompact]}
    >
      <View
        style={[
          styles.value,
          {
            backgroundColor: color,
            width: `${normalizedProgress * 100}%`,
          },
        ]}
        testID={testID}
      />
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    track: {
      width: '100%',
      height: spacing.sm,
      overflow: 'hidden',
      backgroundColor: colors.surfaceMuted,
      borderRadius: radii.round,
    },
    trackCompact: {
      height: spacing.xs,
    },
    value: {
      height: '100%',
      borderRadius: radii.round,
    },
  });
}
