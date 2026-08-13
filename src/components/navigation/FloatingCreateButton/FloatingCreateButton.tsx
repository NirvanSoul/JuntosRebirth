import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';

import { triggerHaptic } from '@/lib/haptics/haptics';
import { layout } from '@/theme/layout';
import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type FloatingCreateButtonProps = {
  bottom: number;
  visible?: boolean;
  onPress: () => void;
};

const buttonSize = layout.floatingActionSize;
const plusSize = 26;
const plusInset = 4;
const plusStrokeWidth = 3.5;
const hiddenTranslateX = buttonSize + spacing.xl;

export function FloatingCreateButton({
  bottom,
  visible = true,
  onPress,
}: FloatingCreateButtonProps) {
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const visibilityProgress = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    visibilityProgress.value = withTiming(visible ? 1 : 0, {
      duration: motion.floatingButtonVisibilityDuration,
      easing: Easing.inOut(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [visibilityProgress, visible]);

  const visibilityStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (1 - visibilityProgress.value) * hiddenTranslateX },
      { scale: visibilityProgress.value },
    ],
  }));

  return (
    <Animated.View
      accessibilityElementsHidden={!visible}
      collapsable={false}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      pointerEvents={visible ? 'auto' : 'none'}
      style={[styles.position, { bottom }, visibilityStyle]}
      testID="floating-create-button-container"
    >
      <Pressable
        accessibilityHint="Abre las opciones para crear un ingreso, gasto o categoría"
        accessibilityLabel="Crear"
        accessibilityRole="button"
        onPress={() => {
          triggerHaptic('fabPress');
          onPress();
        }}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
        testID="floating-create-button"
      >
        <Svg
          height={plusSize}
          pointerEvents="none"
          testID="floating-create-button-icon"
          width={plusSize}
        >
          <Line
            stroke={colors.onBrand}
            strokeLinecap="round"
            strokeWidth={plusStrokeWidth}
            testID="floating-create-button-icon-horizontal"
            x1={plusInset}
            x2={plusSize - plusInset}
            y1={plusSize / 2}
            y2={plusSize / 2}
          />
          <Line
            stroke={colors.onBrand}
            strokeLinecap="round"
            strokeWidth={plusStrokeWidth}
            testID="floating-create-button-icon-vertical"
            x1={plusSize / 2}
            x2={plusSize / 2}
            y1={plusInset}
            y2={plusSize - plusInset}
          />
        </Svg>
      </Pressable>
    </Animated.View>
  );
}

function createStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    position: {
      position: 'absolute',
      right: spacing.xl,
      zIndex: 10,
      elevation: 20,
      width: buttonSize,
      height: buttonSize,
      alignItems: 'center',
      justifyContent: 'center',
    },
    button: {
      width: buttonSize,
      height: buttonSize,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
      backgroundColor: colors.cta,
      ...shadows.floatingAction,
    },
    buttonPressed: {
      backgroundColor: colors.ctaPressed,
    },
  });
}
