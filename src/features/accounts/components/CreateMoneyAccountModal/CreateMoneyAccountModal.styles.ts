import { StyleSheet } from 'react-native';

import { layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { typography } from '@/theme/typography';

/** Lado del avatar de la vista previa, como en el modal de categoría. */
export const previewIconSize = 56;

export function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    headerButton: {
      width: layout.minTouchTarget,
      height: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: { flex: 1 },
    subtitle: { marginTop: spacing.xs },
    step: { flex: 1 },
    stepScroll: { flex: 1 },
    stepContent: { paddingTop: spacing.xl, paddingBottom: spacing.md },
    input: {
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      fontFamily: typography.body.fontFamily,
      fontSize: typography.body.fontSize,
      letterSpacing: typography.body.letterSpacing,
      paddingHorizontal: spacing.lg,
    },
    inputError: { borderColor: colors.expense },
    error: { marginTop: spacing.sm },
    sectionTitle: { marginBottom: spacing.md, marginTop: spacing.xl },
    hint: { marginTop: spacing.sm },
    list: { gap: spacing.sm },
    balanceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    signButton: {
      width: layout.minTouchTarget,
      height: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
    },
    balanceInput: { flex: 1 },
    primaryButtonLayout: { marginTop: spacing.xl },
    preview: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    previewIcon: {
      width: previewIconSize,
      height: previewIconSize,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
    },
    optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    colorOption: {
      width: layout.minTouchTarget,
      height: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
    },
    selectedOption: { borderColor: colors.textPrimary, borderWidth: 3 },
    iconOption: {
      width: layout.minTouchTarget,
      height: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
    },
    selectedIconOption: {
      borderColor: colors.textPrimary,
      borderWidth: 3,
    },
  });
}

export type MoneyAccountModalStyles = ReturnType<typeof createStyles>;
