import { CaretDoubleDown } from 'phosphor-react-native/src/icons/CaretDoubleDown';
import { CaretDoubleUp } from 'phosphor-react-native/src/icons/CaretDoubleUp';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  ReduceMotion,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/Text/Text';
import { iconSize, layout } from '@/theme/layout';
import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type MapReturnToTodayProps = {
  bottom: number;
  direction: 'down' | 'up';
  disabled: boolean;
  onPress: () => void;
};

export const mapReturnToTodayRight =
  spacing.xl + layout.floatingActionSize + spacing.md;

const entering = FadeIn.duration(motion.floatingButtonVisibilityDuration)
  .easing(Easing.inOut(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const exiting = FadeOut.duration(motion.floatingButtonVisibilityDuration)
  .easing(Easing.inOut(Easing.cubic))
  .reduceMotion(ReduceMotion.System);

export function MapReturnToToday({
  bottom,
  direction,
  disabled,
  onPress,
}: MapReturnToTodayProps) {
  const { colors, shadows } = useTheme();
  const themedStyles = useThemedStyles((palette) =>
    createThemedStyles(palette, shadows),
  );

  return (
    <Animated.View
      entering={entering}
      exiting={exiting}
      style={[styles.container, { bottom }]}
      testID="map-return-today-container"
    >
      <Pressable
        accessibilityHint="Desplaza el calendario hasta el mes actual"
        accessibilityLabel="Volver a hoy"
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          themedStyles.button,
          pressed && styles.pressed,
        ]}
        testID="map-return-today-button"
      >
        {direction === 'up' ? (
          <CaretDoubleUp
            color={colors.textPrimary}
            size={iconSize.sm}
            testID="map-return-direction-up"
            weight="bold"
          />
        ) : (
          <CaretDoubleDown
            color={colors.textPrimary}
            size={iconSize.sm}
            testID="map-return-direction-down"
            weight="bold"
          />
        )}
        <Text variant="footnote" weight="semibold">
          Volver a hoy
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 9,
    position: 'absolute',
    right: mapReturnToTodayRight,
    height: layout.floatingActionSize,
    justifyContent: 'center',
  },
  pressed: { opacity: 0.68 },
});

function createThemedStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    button: {
      ...shadows.subtle,
      minHeight: layout.minTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.round,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
    },
  });
}
