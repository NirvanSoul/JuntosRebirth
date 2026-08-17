import { StyleSheet } from 'react-native';

import { iconSize, layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';

/** Lado del icono de categoría que encabeza el modal. */
const heroIconSize = 76;

export function createStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    container: { flex: 1 },
    topBar: {
      zIndex: 2,
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      minHeight: layout.minTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: spacing.xl,
    },
    scroll: { flex: 1 },
    scrollContent: {
      paddingTop: spacing.xl + layout.minTouchTarget,
    },
    hero: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
    titleBlock: { alignItems: 'center', gap: spacing.xxs },
    heroIcon: {
      width: heroIconSize,
      height: heroIconSize,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
      marginBottom: spacing.xs,
    },
    amountCard: {
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      marginTop: spacing.xl,
      padding: spacing.lg,
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    directionIcon: {
      width: iconSize.lg,
      height: iconSize.lg,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
    },
    diagonalArrow: { transform: [{ rotate: '45deg' }] },
    detailsCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      marginTop: spacing.lg,
      paddingHorizontal: spacing.lg,
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
    detailRow: {
      minHeight: layout.controlHeight.regular,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
    },
    detailCopy: { flex: 1, gap: spacing.xxs },
    divider: { height: 1, backgroundColor: colors.border },
    recurrenceChevronExpanded: { transform: [{ rotate: '180deg' }] },
    recurrenceList: {
      gap: spacing.sm,
      borderTopColor: colors.border,
      borderTopWidth: 1,
      paddingBottom: spacing.lg,
      paddingLeft: iconSize.sm + spacing.md,
      paddingTop: spacing.md,
    },
    recurrenceDateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: layout.minTouchTarget,
    },
    moreButton: {
      minHeight: layout.minTouchTarget,
      alignSelf: 'flex-start',
      justifyContent: 'center',
      paddingRight: spacing.lg,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    secondaryAction: {
      ...shadows.subtle,
      minWidth: 0,
      minHeight: 96,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      padding: spacing.xs,
    },
    dangerPanel: {
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderColor: colors.expense,
      borderRadius: radii.md,
      borderWidth: 1,
      marginTop: spacing.lg,
      padding: spacing.lg,
    },
    panelActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.sm,
    },
    secondaryButton: {
      minHeight: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: colors.border,
      borderRadius: radii.round,
      borderWidth: 1,
      paddingHorizontal: spacing.lg,
    },
    deleteButton: {
      minHeight: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.expense,
      borderRadius: radii.round,
      paddingHorizontal: spacing.xl,
    },
    pressed: { opacity: 0.64 },
  });
}
