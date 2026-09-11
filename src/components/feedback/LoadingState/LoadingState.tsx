import { type ReactNode, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  SlideInRight,
  SlideOutLeft,
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

const TRACK_WIDTH = 200;
const FILL_WIDTH = 72;
const contentEntering = SlideInRight.duration(motion.loadingTransitionDuration)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const loadingExiting = SlideOutLeft.duration(motion.loadingTransitionDuration)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);

type LoadingStateProps = {
  children?: ReactNode;
  loading?: boolean;
  label?: string;
  showLabel?: boolean;
  testID?: string;
};

/** Espera indeterminada: nunca retrasa la navegación para terminar un ciclo. */
export function LoadingState({
  children,
  loading = true,
  label = 'Abriendo juntoss',
  showLabel = true,
  testID = 'app-loading',
}: LoadingStateProps) {
  const styles = useThemedStyles(createStyles);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!loading) return;
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, {
        duration: motion.loadingBarDuration,
        easing: Easing.inOut(Easing.ease),
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      true,
      undefined,
      ReduceMotion.System,
    );
    return () => cancelAnimation(progress);
  }, [loading, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * (TRACK_WIDTH - FILL_WIDTH) }],
  }));

  return (
    <View collapsable={false} style={styles.root}>
      {loading ? (
        <Animated.View
          key="loading"
          exiting={children ? loadingExiting : undefined}
          accessible
          accessibilityLabel={label}
          accessibilityRole="progressbar"
          accessibilityState={{ busy: true }}
          style={styles.loading}
          testID={testID}
        >
          <View style={styles.track}>
            <Animated.View style={[styles.fill, fillStyle]} />
          </View>
          {showLabel && (
            <Text variant="body" tone="secondary" align="center">
              {label}
            </Text>
          )}
        </Animated.View>
      ) : (
        <Animated.View
          key="content"
          entering={contentEntering}
          style={styles.content}
        >
          {children}
        </Animated.View>
      )}
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    root: {
      flex: 1,
      overflow: 'hidden',
      backgroundColor: colors.background,
    },
    content: { flex: 1 },
    loading: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      gap: spacing.xl,
      backgroundColor: colors.background,
    },
    track: {
      width: TRACK_WIDTH,
      height: spacing.xs,
      overflow: 'hidden',
      borderRadius: radii.round,
      backgroundColor: colors.surfaceMuted,
    },
    fill: {
      width: FILL_WIDTH,
      height: '100%',
      borderRadius: radii.round,
      backgroundColor: colors.brand,
    },
  });
}
