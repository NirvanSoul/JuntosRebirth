import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';

import { colors } from '@/theme/colors';
import { iconSize, layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';

type ModalCloseButtonProps = {
  onPress: () => void;
  variant?: 'back' | 'close';
};

export function ModalCloseButton({
  onPress,
  variant = 'close',
}: ModalCloseButtonProps) {
  const isBack = variant === 'back';

  return (
    <Pressable
      accessibilityLabel={isBack ? 'Volver' : 'Cerrar'}
      accessibilityRole="button"
      hitSlop={spacing.sm}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isBack && styles.backButton,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons
        color={colors.textPrimary}
        name={isBack ? 'arrow-back' : 'close'}
        size={isBack ? iconSize.lg : iconSize.xl}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
