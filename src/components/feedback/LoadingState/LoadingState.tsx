import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/Text/Text';
import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useThemedStyles } from '@/theme/useThemedStyles';

const DOT_SIZE = 24;
const DOT_TRAVEL = 6;

type LoadingStateProps = {
  label?: string;
  showLabel?: boolean;
  testID?: string;
};

/** Espera indeterminada: nunca retrasa la navegación para terminar un ciclo. */
export function LoadingState({
  label = 'Abriendo juntoss',
  showLabel = true,
  testID = 'app-loading',
}: LoadingStateProps) {
  const styles = useThemedStyles(createStyles);
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, {
        duration: motion.loadingPulseDuration,
        easing: Easing.inOut(Easing.ease),
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      true,
      undefined,
      ReduceMotion.System,
    );
    return () => cancelAnimation(pulse);
  }, [pulse]);

  const leftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pulse.value * DOT_TRAVEL }],
  }));
  const rightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -pulse.value * DOT_TRAVEL }],
  }));

  return (
    <View
      accessible
      accessibilityLabel={label}
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      style={styles.root}
      testID={testID}
    >
      <View style={styles.mark}>
        <Animated.View style={[styles.dot, leftStyle]} />
        <Animated.View style={[styles.dot, styles.companion, rightStyle]} />
      </View>
      {showLabel && (
        <Text variant="body" tone="secondary" align="center">
          {label}
        </Text>
      )}
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    root: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      gap: spacing.xl,
      backgroundColor: colors.background,
    },
    mark: { flexDirection: 'row', gap: spacing.sm },
    dot: {
      width: DOT_SIZE,
      height: DOT_SIZE,
      borderRadius: radii.round,
      backgroundColor: colors.brand,
    },
    companion: { backgroundColor: colors.cta },
  });
}
