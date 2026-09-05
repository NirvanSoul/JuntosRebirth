import { StyleSheet } from 'react-native';

import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { layout, type LayoutDensity } from '@/theme/layout';
import { typography } from '@/theme/typography';

const amountAreaMinHeight = { compact: 64, regular: 88 } as const;
const keypadRowGap = { compact: spacing.md, regular: spacing.lg } as const;
const categoryIconSize = 44;
const typeSelectorWidth = { compact: 216, regular: 240 } as const;
const operatorColumnRatio = 0.72;

export function createStyles(
  colors: ColorTokens,
  density: LayoutDensity,
  shadows: ThemeShadows,
) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'space-between',
      gap: layout.stackGap[density],
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.lg,
    },
    segmentedControl: { width: typeSelectorWidth[density] },
    diagonalArrow: { transform: [{ rotate: '45deg' }] },
    lockedTypeBadge: {
      height: layout.minTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.lg,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: layout.controlGap[density],
    },
    titleInput: {
      ...shadows.subtle,
      flex: 1,
      minHeight: layout.controlHeight[density],
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      fontFamily: typography.body.fontFamily,
      fontSize: typography.body.fontSize,
      letterSpacing: typography.body.letterSpacing,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.none,
      textAlignVertical: 'center',
    },
    currencyButton: {
      ...shadows.subtle,
      width: layout.controlHeight[density],
      height: layout.controlHeight[density],
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
      backgroundColor: colors.surface,
    },
    amountArea: {
      minHeight: amountAreaMinHeight[density],
      alignItems: 'center',
      justifyContent: 'center',
    },
    amount: { flex: 1, textAlign: 'center' },
    amountRow: {
      width: '100%',
      maxWidth: '100%',
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'center',
    },
    amountCursor: {
      width: spacing.xxs,
      height: spacing.xxxl,
      borderRadius: radii.round,
    },
    exchangePreviewRow: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: -spacing.sm,
    },
    metadataRow: {
      ...shadows.subtle,
      height: layout.controlHeight[density],
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    metadataButton: {
      flex: 1,
      minWidth: 0,
      height: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
    },
    metadataLabel: { flexShrink: 1 },
    metadataDivider: {
      width: StyleSheet.hairlineWidth,
      height: layout.controlHeight[density] - spacing.xl,
      backgroundColor: colors.border,
    },
    keypad: { rowGap: keypadRowGap[density] },
    keypadRow: { flexDirection: 'row', columnGap: layout.controlGap[density] },
    key: {
      ...shadows.subtle,
      flex: 1,
      height: layout.keypadKeyHeight[density],
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      backgroundColor: colors.surface,
    },
    operatorKey: { flex: operatorColumnRatio },
    keyPressed: {
      backgroundColor: colors.surfaceMuted,
      transform: [{ scale: 0.97 }],
    },
    footer: { flexDirection: 'row', gap: layout.controlGap[density] },
    categoryButton: {
      flex: 1.6,
      minWidth: 0,
      minHeight: layout.actionHeight[density],
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderRadius: radii.md,
      borderColor: colors.border,
      borderWidth: 1,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
    },
    categoryButtonCta: { borderColor: colors.cta, backgroundColor: colors.cta },
    categoryIcon: {
      width: categoryIconSize,
      height: categoryIconSize,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      backgroundColor: colors.modalBackground,
    },
    selectedCategoryIcon: { backgroundColor: 'transparent' },
    categoryIconCta: { backgroundColor: 'transparent' },
    categoryLabel: { flex: 1 },
    submitButton: { flex: 1 },
    pressed: { opacity: 0.72 },
  });
}
