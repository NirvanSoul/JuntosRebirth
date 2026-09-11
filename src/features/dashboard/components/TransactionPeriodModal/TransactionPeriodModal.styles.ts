import { StyleSheet } from 'react-native';

import { layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';

export function createStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: {
      minHeight: layout.minTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    headerCopy: { flex: 1 },
    scrollContent: { flexGrow: 1 },
    valuationSelector: {
      marginTop: spacing.xl,
    },
    totalCard: {
      ...shadows.subtle,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      marginTop: spacing.xl,
      padding: spacing.lg,
    },
    totalCardWithValuation: {
      marginTop: spacing.md,
    },
    totalCardCopy: { flex: 1, gap: spacing.xs },
    comparisonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.xxs,
    },
    currencyButton: {
      ...shadows.subtle,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      borderColor: colors.border,
      borderRadius: radii.round,
      borderWidth: 1,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    currencyButtonFlag: { fontSize: 18 },
    results: { marginTop: spacing.lg },
    empty: {
      flex: 1,
      minHeight: layout.controlHeight.regular * 2,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderColor: colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      padding: spacing.xl,
    },
    diagonalArrow: { transform: [{ rotate: '45deg' }] },
    addAction: { marginTop: spacing.xl },
    pressed: { opacity: 0.72 },
  });
}
