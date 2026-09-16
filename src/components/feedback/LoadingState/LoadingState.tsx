import { type ReactNode, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useLoadingProgress } from './LoadingProgressProvider';
import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useThemedStyles } from '@/theme/useThemedStyles';

const TRACK_WIDTH = 200;

type LoadingStateProps = {
  children?: ReactNode;
  loading?: boolean;
  /** Etiqueta para lectores de pantalla; no se muestra texto visual. */
  label?: string;
  testID?: string;
};

/** Avance visual único; la disponibilidad de los datos no depende de la animación. */
export function LoadingState({
  children,
  loading = true,
  label = 'Cargando juntoss',
  testID = 'app-loading',
}: LoadingStateProps) {
  const styles = useThemedStyles(createStyles);
  const { progress, begin, complete, release } = useLoadingProgress();
  const opacity = useSharedValue(loading ? 1 : 0);

  useEffect(() => {
    if (loading) {
      opacity.value = 1;
      begin();
      return () => {
        cancelAnimation(opacity);
        release();
      };
    }

    complete();
    opacity.value = withDelay(
      motion.loadingCompletionDuration,
      withTiming(0, {
        duration: motion.loadingTransitionDuration,
        easing: Easing.inOut(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }),
      ReduceMotion.System,
    );
    return () => cancelAnimation(opacity);
  }, [begin, complete, loading, opacity, release]);

  // Desplazar el relleno evita relayout: la barra crece de izquierda a derecha.
  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (progress.value - 1) * TRACK_WIDTH }],
  }));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={styles.root}>
      {!loading && <View style={styles.content}>{children}</View>}
      <Animated.View
        accessible={loading}
        accessibilityElementsHidden={!loading}
        accessibilityLabel={loading ? label : undefined}
        accessibilityRole={loading ? 'progressbar' : undefined}
        accessibilityState={{ busy: loading }}
        importantForAccessibility={loading ? 'yes' : 'no-hide-descendants'}
        pointerEvents="none"
        style={[styles.loading, overlayStyle]}
        testID={loading ? testID : undefined}
      >
        <View style={styles.track}>
          <Animated.View
            style={[styles.fill, fillStyle]}
            testID={`${testID}-fill`}
          />
        </View>
      </Animated.View>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { flex: 1 },
    loading: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      backgroundColor: colors.background,
    },
    track: {
      width: TRACK_WIDTH,
      height: spacing.xs,
      overflow: 'hidden',
      borderRadius: radii.round,
      backgroundColor: colors.ctaSoft,
    },
    fill: {
      width: TRACK_WIDTH,
      height: '100%',
      borderRadius: radii.round,
      backgroundColor: colors.cta,
    },
  });
}
