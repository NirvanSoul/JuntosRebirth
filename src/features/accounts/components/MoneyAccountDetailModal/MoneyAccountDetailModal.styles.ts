import { StyleSheet } from 'react-native';

import { iconSize } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';

export const heroIconSize = 76;

export function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: { flex: 1 },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: spacing.md,
    },
    scroll: { flex: 1 },
    scrollContent: { gap: spacing.lg },
    hero: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.lg,
    },
    heroIcon: {
      width: heroIconSize,
      height: heroIconSize,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
    },
    titleBlock: {
      minWidth: 0,
      flexShrink: 1,
      alignItems: 'flex-start',
      gap: spacing.xxs,
    },
    summary: {
      gap: spacing.sm,
    },
    valuationSelector: {
      marginTop: spacing.lg,
      marginBottom: spacing.xs,
    },
    currencySelector: { alignSelf: 'center', width: 216 },
    balanceMetric: {
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      padding: spacing.md,
    },
    metricRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    actions: { flexDirection: 'row', gap: spacing.sm },
    movementsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
      marginTop: spacing.xxl,
    },
  });
}

export function createMetricStyles(colors: ColorTokens) {
  return StyleSheet.create({
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
      flexShrink: 0,
    },
    diagonalArrow: { transform: [{ rotate: '45deg' }] },
  });
}
