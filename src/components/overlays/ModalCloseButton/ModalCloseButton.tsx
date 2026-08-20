import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { type Insets, Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { iconSize, layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type ModalCloseButtonProps = {
  accessibilityHint?: string;
  accessibilityLabel?: string;
  /** Icono alternativo para una acción de cabecera con el mismo aspecto. */
  icon?: ComponentProps<typeof Ionicons>['name'];
  /** Recurso visual alternativo, cuando el icono no pertenece a Ionicons. */
  iconContent?: ReactNode;
  onPress: () => void;
  /** Muestra la superficie gris habitual también en un botón de volver. */
  showBackground?: boolean;
  hitSlop?: Insets | number;
  /** Etiqueta opcional para una acción de cabecera junto al icono. */
  label?: string;
  size?: number;
  shadow?: boolean;
  testID?: string;
  variant?: 'back' | 'close';
};

export function ModalCloseButton({
  accessibilityHint,
  accessibilityLabel,
  icon,
  iconContent,
  label,
  onPress,
  showBackground = false,
  hitSlop = spacing.sm,
  size = layout.minTouchTarget,
  shadow = false,
  testID,
  variant = 'close',
}: ModalCloseButtonProps) {
  const isBack = variant === 'back';
  const isLabeled = Boolean(label);
  const iconName = icon ?? (isBack ? 'arrow-back' : 'close');
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel ?? (isBack ? 'Volver' : 'Cerrar')}
      accessibilityRole="button"
      hitSlop={hitSlop}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isLabeled
          ? { minWidth: size, minHeight: size, paddingHorizontal: spacing.md }
          : { width: size, height: size },
        isLabeled && styles.labeledButton,
        isBack && !showBackground && styles.backButton,
        shadow && styles.shadow,
        pressed && styles.pressed,
      ]}
      testID={testID}
    >
      {iconContent ?? (
        <Ionicons
          color={colors.textPrimary}
          name={iconName}
          size={isBack ? iconSize.lg : iconSize.xl}
        />
      )}
      {label ? (
        <Text tone="primary" variant="footnote" weight="medium">
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

function createStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    button: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
      borderColor: colors.border,
      borderWidth: 1,
      backgroundColor: colors.keypad,
    },
    labeledButton: { flexDirection: 'row', gap: spacing.sm },
    backButton: {
      borderWidth: 0,
      backgroundColor: 'transparent',
    },
    shadow: shadows.subtle,
    pressed: { opacity: 0.7 },
  });
}
