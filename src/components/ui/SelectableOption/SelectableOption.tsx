import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import { iconSize } from '@/theme/layout';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';

type SelectableOptionProps = {
  accessibilityLabel: string;
  /** Versión reducida: menor altura, relleno y tipografía, para filas con muchas opciones. */
  compact?: boolean;
  disabled?: boolean;
  /**
   * `false` quita el icono de selección: la opción seleccionada se marca solo
   * con texto y borde en color de acción, y ocupa menos ancho.
   */
  indicator?: boolean;
  indicatorShape?: 'circle' | 'square';
  indicatorTestID?: string;
  label: string;
  /** Contenido antes del texto, como el icono del tipo de movimiento. */
  leading?: ReactNode;
  onPress: () => void;
  role?: 'radio' | 'checkbox';
  selected: boolean;
  /** Color de borde, texto e indicador al estar seleccionada. */
  selectedTone?: 'cta' | 'income' | 'expense';
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** Contenido adicional al final de la fila, como el icono de dirección de un movimiento. */
  trailing?: ReactNode;
};

function createSelectableOptionStyles(
  colors: ColorTokens,
  shadows: ThemeShadows,
) {
  return StyleSheet.create({
    option: {
      ...shadows.subtle,
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderColor: colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
    },
    compactOption: {
      minHeight: 44,
      gap: spacing.xxs,
      paddingHorizontal: spacing.sm,
    },
    selectedOption: {
      ...shadows.none,
    },
    outlineOption: {
      justifyContent: 'center',
    },
    disabledOption: {
      opacity: 0.56,
    },
    label: {
      flexShrink: 1,
    },
    labelWithTrailing: {
      flex: 1,
    },
    compactLabel: {
      flex: 0,
      textAlign: 'center',
    },
    pressed: {
      opacity: 0.72,
    },
  });
}

export function SelectableOption({
  accessibilityLabel,
  compact = false,
  disabled = false,
  indicator = true,
  indicatorTestID,
  label,
  leading,
  onPress,
  role = 'radio',
  indicatorShape = role === 'checkbox' ? 'square' : 'circle',
  selected,
  selectedTone = 'cta',
  style,
  testID,
  trailing,
}: SelectableOptionProps) {
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) =>
    createSelectableOptionStyles(palette, shadows),
  );

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={role}
      accessibilityState={{ checked: selected, disabled }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        compact ? styles.compactOption : null,
        indicator ? null : styles.outlineOption,
        selected ? styles.selectedOption : null,
        selected && !indicator ? { borderColor: colors[selectedTone] } : null,
        disabled ? styles.disabledOption : null,
        style,
        pressed && !disabled ? styles.pressed : null,
      ]}
      testID={testID}
    >
      {indicator ? (
        <Ionicons
          color={selected ? colors[selectedTone] : colors.textMuted}
          name={
            selected
              ? 'checkmark-circle'
              : indicatorShape === 'square'
                ? 'square-outline'
                : 'ellipse-outline'
          }
          size={compact ? iconSize.xs : iconSize.md}
          testID={indicatorTestID}
        />
      ) : null}
      {leading}
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          trailing ? styles.labelWithTrailing : null,
          compact ? styles.compactLabel : null,
        ]}
        tone={selected ? selectedTone : 'primary'}
        variant={compact ? 'footnote' : 'label'}
        weight="medium"
      >
        {label}
      </Text>
      {trailing}
    </Pressable>
  );
}
