import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import type { CalculatorOperator } from '@/features/transactions/utils/transactionAmount';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { triggerHaptic } from '@/lib/haptics/haptics';
import { iconSize, layout, type LayoutDensity } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type AmountKeypadProps = {
  onBackspace: () => void;
  onDigit: (key: string) => void;
  /** Sin este callback el teclado omite la columna de operadores. */
  onOperator?: (operator: CalculatorOperator) => void;
  style?: ViewStyle;
};

export const operatorPresentation: Record<
  CalculatorOperator,
  { label: string; symbol: string }
> = {
  divide: { label: 'Dividir', symbol: '÷' },
  multiply: { label: 'Multiplicar', symbol: '×' },
  subtract: { label: 'Restar', symbol: '−' },
  add: { label: 'Sumar', symbol: '+' },
};

const keypadRows = [
  ['7', '8', '9', 'divide'],
  ['4', '5', '6', 'multiply'],
  ['1', '2', '3', 'subtract'],
  [',', '0', 'backspace', 'add'],
] as const;

const keypadRowGap = { compact: spacing.md, regular: spacing.lg } as const;
const operatorColumnRatio = 0.72;

/**
 * Teclado numérico de importes, compartido por el modal de movimiento (con
 * calculadora) y por la compra/venta de dólares (solo dígitos).
 */
export function AmountKeypad({
  onBackspace,
  onDigit,
  onOperator,
  style,
}: AmountKeypadProps) {
  const density = useLayoutDensity();
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) =>
    createStyles(palette, density, shadows),
  );
  const rows = onOperator
    ? keypadRows
    : keypadRows.map((row) => row.slice(0, 3));

  return (
    <View style={[styles.keypad, style]} testID="amount-keypad">
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.keypadRow}>
          {row.map((key) => {
            const isOperator = key in operatorPresentation;
            const presentation = isOperator
              ? operatorPresentation[key as CalculatorOperator]
              : null;
            return (
              <Pressable
                accessibilityLabel={
                  presentation?.label ?? (key === 'backspace' ? 'Borrar' : key)
                }
                accessibilityRole="button"
                key={key}
                onPress={() => {
                  triggerHaptic('keypadPress');
                  if (presentation) {
                    onOperator?.(key as CalculatorOperator);
                  } else if (key === 'backspace') {
                    onBackspace();
                  } else {
                    onDigit(key);
                  }
                }}
                style={({ pressed }) => [
                  styles.key,
                  isOperator && styles.operatorKey,
                  pressed && styles.keyPressed,
                ]}
              >
                {presentation ? (
                  <Text tone="primary" variant="title" weight="medium">
                    {presentation.symbol}
                  </Text>
                ) : key === 'backspace' ? (
                  <Ionicons
                    color={colors.textPrimary}
                    name="backspace-outline"
                    size={iconSize.lg}
                  />
                ) : (
                  <Text
                    variant={density === 'compact' ? 'heading' : 'title'}
                    weight="medium"
                  >
                    {key}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function createStyles(
  colors: ColorTokens,
  density: LayoutDensity,
  shadows: ThemeShadows,
) {
  return StyleSheet.create({
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
  });
}
