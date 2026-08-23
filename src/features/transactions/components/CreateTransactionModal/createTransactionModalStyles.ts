import { StyleSheet } from 'react-native';

import { layout, type LayoutDensity } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { typography } from '@/theme/typography';

/** Altura del bloque del importe antes de repartir el espacio sobrante. */
const amountAreaMinHeight = { compact: 64, regular: 88 } as const;
/** Separación vertical de las filas del teclado numérico. */
const keypadRowGap = { compact: spacing.md, regular: spacing.lg } as const;
/** Lado del avatar de categoría. */
const categoryIconSize = 44;
/** Anchura compacta del selector; conserva dos objetivos táctiles holgados. */
const typeSelectorWidth = { compact: 216, regular: 240 } as const;
/** Anchura relativa de la columna de operadores; >48 pt en la pantalla más estrecha (320 pt). */
const operatorColumnRatio = 0.72;

export function createTransactionModalStyles(
  colors: ColorTokens,
  density: LayoutDensity,
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
    segmentedControl: {
      width: typeSelectorWidth[density],
      height: layout.minTouchTarget,
      flexDirection: 'row',
      borderRadius: radii.lg,
      backgroundColor: colors.keypad,
      overflow: 'hidden',
    },
    segment: {
      flex: 1,
      minHeight: layout.minTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderRadius: radii.lg,
      zIndex: 1,
    },
    segmentIndicator: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      top: 0,
      borderRadius: radii.lg,
    },
    diagonalArrow: {
      transform: [{ rotate: '45deg' }],
    },
    lockedTypeBadge: {
      height: layout.minTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.lg,
    },
    titleInput: {
      minHeight: layout.controlHeight[density],
      borderRadius: radii.md,
      borderColor: colors.border,
      borderWidth: 1,
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      fontFamily: typography.body.fontFamily,
      fontSize: typography.body.fontSize,
      letterSpacing: typography.body.letterSpacing,
      paddingHorizontal: spacing.lg,
    },
    amountArea: {
      minHeight: amountAreaMinHeight[density],
      alignItems: 'center',
      justifyContent: 'center',
    },
    amount: {
      flex: 1,
      textAlign: 'center',
    },
    amountRow: {
      width: '100%',
      maxWidth: '100%',
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'center',
    },
    calculatorError: {
      textAlign: 'center',
    },
    metadataRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      gap: layout.controlGap[density],
    },
    metadataButton: {
      minWidth: layout.controlHeight[density],
      height: layout.controlHeight[density],
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderRadius: radii.round,
      borderColor: colors.border,
      borderWidth: 1,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
    },
    metadataLabel: { flexShrink: 1 },
    keypad: {
      rowGap: keypadRowGap[density],
    },
    keypadRow: {
      flexDirection: 'row',
      columnGap: layout.controlGap[density],
    },
    key: {
      flex: 1,
      height: layout.keypadKeyHeight[density],
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      backgroundColor: colors.keypad,
    },
    operatorKey: {
      flex: operatorColumnRatio,
    },
    keyPressed: {
      backgroundColor: colors.surfaceMuted,
      transform: [{ scale: 0.97 }],
    },
    footer: {
      flexDirection: 'row',
      gap: layout.controlGap[density],
    },
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
    categoryIcon: {
      width: categoryIconSize,
      height: categoryIconSize,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      backgroundColor: colors.modalBackground,
    },
    selectedCategoryIcon: {
      backgroundColor: 'transparent',
    },
    categoryLabel: {
      flex: 1,
    },
    submitButton: {
      flex: 1,
    },
    pressed: {
      opacity: 0.72,
    },
  });
}
