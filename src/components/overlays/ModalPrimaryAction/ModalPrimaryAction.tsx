import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { GradientCard } from '@/components/ui/GradientCard/GradientCard';
import { Text, type TextTone } from '@/components/ui/Text/Text';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { colors } from '@/theme/colors';
import { createDiagonalGradient } from '@/theme/gradients';
import { iconSize, layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';

type ModalPrimaryActionProps = {
  accessibilityLabel: string;
  disabled?: boolean;
  gradientColor?: string;
  gradientTextTone?: TextTone;
  gradientTestID?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  mutedWhenDisabled?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  variant?: 'cta' | 'surface';
};

export function ModalPrimaryAction({
  accessibilityLabel,
  disabled = false,
  gradientColor,
  gradientTextTone = 'onBrand',
  gradientTestID,
  icon,
  label,
  mutedWhenDisabled = false,
  onPress,
  style,
  testID,
  variant = 'cta',
}: ModalPrimaryActionProps) {
  const density = useLayoutDensity();
  const isCta = variant === 'cta';

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { minHeight: layout.actionHeight[density] },
        isCta ? styles.cta : styles.surface,
        !disabled && gradientColor && styles.gradientButton,
        disabled && mutedWhenDisabled && styles.disabledBackground,
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
      testID={testID}
    >
      {!disabled && gradientColor ? (
        <GradientCard
          colors={createDiagonalGradient(gradientColor)}
          contentStyle={styles.gradientContent}
          style={styles.gradient}
          testID={gradientTestID}
        >
          <Text numberOfLines={1} tone={gradientTextTone} variant="bodyStrong">
            {label}
          </Text>
        </GradientCard>
      ) : (
        <>
          {icon ? (
            <Ionicons
              color={
                disabled && mutedWhenDisabled
                  ? colors.textMuted
                  : colors.textSecondary
              }
              name={icon}
              size={iconSize.md}
            />
          ) : null}
          <Text
            numberOfLines={1}
            tone={
              disabled && mutedWhenDisabled
                ? 'muted'
                : isCta
                  ? 'onBrand'
                  : 'secondary'
            }
            variant="bodyStrong"
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    borderRadius: radii.md,
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
  },
  cta: { backgroundColor: colors.cta },
  surface: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  gradientButton: { paddingHorizontal: spacing.none },
  disabled: { opacity: 0.48 },
  disabledBackground: { backgroundColor: colors.keypad },
  pressed: { opacity: 0.72 },
  gradient: { flex: 1, width: '100%' },
  gradientContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
