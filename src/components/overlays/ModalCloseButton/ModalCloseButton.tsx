import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';

import { iconSize, layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type ModalCloseButtonProps = {
  onPress: () => void;
  /** Muestra la superficie gris habitual también en un botón de volver. */
  showBackground?: boolean;
  size?: number;
  testID?: string;
  variant?: 'back' | 'close';
};

export function ModalCloseButton({
  onPress,
  showBackground = false,
  size = layout.minTouchTarget,
  testID,
  variant = 'close',
}: ModalCloseButtonProps) {
  const isBack = variant === 'back';
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityLabel={isBack ? 'Volver' : 'Cerrar'}
      accessibilityRole="button"
      hitSlop={spacing.sm}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size },
        isBack && !showBackground && styles.backButton,
        pressed && styles.pressed,
      ]}
      testID={testID}
    >
      <Ionicons
        color={colors.textPrimary}
        name={isBack ? 'arrow-back' : 'close'}
        size={isBack ? iconSize.lg : iconSize.xl}
      />
    </Pressable>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    button: {
      width: layout.minTouchTarget,
      height: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
      borderColor: colors.border,
      borderWidth: 1,
      backgroundColor: colors.keypad,
    },
    backButton: {
      borderWidth: 0,
      backgroundColor: 'transparent',
    },
    pressed: { opacity: 0.7 },
  });
}
