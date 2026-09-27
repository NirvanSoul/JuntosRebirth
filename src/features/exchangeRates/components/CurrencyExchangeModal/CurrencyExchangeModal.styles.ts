import { StyleSheet } from 'react-native';

import { layout, type LayoutDensity } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';

/** Alto del importe grande, para que los dos bloques no salten al escribir. */
const amountAreaMinHeight = { compact: 44, regular: 48 } as const;
/** Botón de cuenta: pequeño frente al importe, pero con área pulsable propia. */
const accountButtonHeight = 36;
const accountButtonMaxWidth = '46%';
/** Botón que intercambia entregas y recibes, centrado sobre el divisor. */
const swapButtonSize = 36;

export function createStyles(
  colors: ColorTokens,
  density: LayoutDensity,
  shadows: ThemeShadows,
) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'space-between',
      gap: layout.controlGap[density],
    },
    header: { flexDirection: 'row', justifyContent: 'flex-end' },
    blocks: { gap: spacing.xs },
    block: { gap: spacing.xxs },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    amountArea: {
      flex: 1,
      minWidth: 0,
      minHeight: amountAreaMinHeight[density],
      justifyContent: 'center',
      gap: spacing.xs,
    },
    amountValue: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.sm,
    },
    amount: { flexShrink: 1 },
    amountUnderline: {
      height: spacing.xxs,
      borderRadius: radii.round,
      backgroundColor: colors.border,
    },
    accountButton: {
      ...shadows.subtle,
      height: accountButtonHeight,
      maxWidth: accountButtonMaxWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      borderRadius: radii.round,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
    },
    accountButtonLabel: { flexShrink: 1 },
    swapRow: {
      height: swapButtonSize,
      marginTop: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    swapDivider: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    swapButton: {
      ...shadows.subtle,
      width: swapButtonSize,
      height: swapButtonSize,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
      backgroundColor: colors.surface,
    },
    rateSection: {
      gap: spacing.xs,
    },
    rateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingTop: spacing.sm,
    },
    rateValue: {
      ...shadows.subtle,
      minWidth: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.sm,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
    },
    rateValueActive: { borderWidth: 1, borderColor: colors.brand },
    keypad: {},
    pressed: { opacity: 0.7 },
  });
}

export type CurrencyExchangeModalStyles = ReturnType<typeof createStyles>;
