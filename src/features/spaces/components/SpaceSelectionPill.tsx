import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import type { ColorTokens } from '@/theme/types';
import { useThemedStyles } from '@/theme/useThemedStyles';

export type SpaceRowLayout = { height: number; y: number };

type SpaceSelectionPillProps = {
  layout: SpaceRowLayout | null;
};

/**
 * Fondo de marca del espacio activo. Se desliza de una fila a otra con un
 * muelle suave en vez de apagarse en una y encenderse en la otra.
 */
export function SpaceSelectionPill({ layout }: SpaceSelectionPillProps) {
  const styles = useThemedStyles(createStyles);
  const translateY = useSharedValue(layout?.y ?? 0);
  const height = useSharedValue(layout?.height ?? 0);
  const opacity = useSharedValue(layout ? 1 : 0);
  const isPlaced = useRef(layout !== null);

  useEffect(() => {
    if (!layout) {
      isPlaced.current = false;
      opacity.value = withTiming(0, {
        duration: motion.spaceSelectionContentDuration,
        reduceMotion: ReduceMotion.System,
      });
      return;
    }

    // Sin posición previa visible, la píldora aparece en su sitio sin viajar.
    if (!isPlaced.current) {
      isPlaced.current = true;
      translateY.value = layout.y;
      height.value = layout.height;
      opacity.value = withTiming(1, {
        duration: motion.spaceSelectionContentDuration,
        reduceMotion: ReduceMotion.System,
      });
      return;
    }

    const spring = {
      ...motion.spaceSelectionSpring,
      reduceMotion: ReduceMotion.System,
    };
    translateY.value = withSpring(layout.y, spring);
    height.value = withSpring(layout.height, spring);
  }, [height, layout, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.pill, animatedStyle]}
      testID="space-selection-pill"
    />
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    pill: {
      position: 'absolute',
      top: 0,
      right: 0,
      left: 0,
      borderRadius: radii.md,
      backgroundColor: colors.cta,
    },
  });
}
