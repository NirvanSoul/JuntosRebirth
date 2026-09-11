import { StyleSheet } from 'react-native';

import { layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';

/** Lado del icono de categoría que encabeza el modal. */
export const heroIconSize = 76;

export function createStyles(colors: ColorTokens, _shadows: ThemeShadows) {
  return StyleSheet.create({
    container: { flex: 1 },
    topBar: {
      zIndex: 2,
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: spacing.xl,
    },
    scroll: { flex: 1 },
    scrollContent: {
      paddingTop: spacing.xl + layout.minTouchTarget,
    },
    hero: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.lg,
      marginTop: spacing.lg,
    },
    titleBlock: {
      minWidth: 0,
      flexShrink: 1,
      alignItems: 'flex-start',
      gap: spacing.xxs,
    },
    heroIcon: {
      width: heroIconSize,
      height: heroIconSize,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
      flexShrink: 0,
    },
    currencySelector: {
      alignSelf: 'center',
      marginTop: spacing.xl,
      width: 216,
    },
    valuationSelector: {
      marginTop: spacing.lg,
    },
    noteButton: {
      minHeight: layout.controlHeight.regular,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      marginTop: spacing.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    noteButtonCopy: { flex: 1, minWidth: 0, gap: spacing.xxs },
    budgetCard: {
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      marginTop: spacing.lg,
      padding: spacing.lg,
    },
    budgetHeader: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    budgetTotal: { flexShrink: 1 },
    actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
    movementsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
      marginTop: spacing.xxl,
    },
    emptyMovements: {
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      padding: spacing.xl,
    },
    pressed: { opacity: 0.64 },
  });
}
