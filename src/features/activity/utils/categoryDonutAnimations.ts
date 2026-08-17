import {
  Easing,
  type EntryExitAnimationFunction,
  ReduceMotion,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { motion } from '@/theme/motion';
import { spacing } from '@/theme/spacing';

export type MotionDirection = -1 | 1;

export function getChartContentEntering(
  direction: MotionDirection,
  delay: number = motion.chartContentEnterDelay,
): EntryExitAnimationFunction {
  return () => {
    'worklet';
    const springConfig = {
      damping: motion.chartModeSpring.damping,
      mass: motion.chartModeSpring.mass,
      stiffness: motion.chartModeSpring.stiffness,
      reduceMotion: ReduceMotion.System,
    };
    const delayedSpring = (value: number) =>
      withDelay(delay, withSpring(value, springConfig), ReduceMotion.System);
    const delayedOpacity = withDelay(
      delay,
      withTiming(1, {
        duration: motion.chartContentFadeDuration,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }),
      ReduceMotion.System,
    );

    return {
      initialValues: {
        opacity: 0,
        transform: [
          { translateX: direction * motion.chartContentTravel },
          { translateY: spacing.md },
        ],
      },
      animations: {
        opacity: delayedOpacity,
        transform: [
          { translateX: delayedSpring(0) },
          { translateY: delayedSpring(0) },
        ],
      },
    };
  };
}

export function getChartContentExiting(
  direction: MotionDirection,
): EntryExitAnimationFunction {
  return () => {
    'worklet';
    const timingConfig = {
      duration: motion.chartContentExitDuration,
      easing: Easing.inOut(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    };

    return {
      initialValues: {
        opacity: 1,
        transform: [{ translateX: 0 }, { translateY: 0 }],
      },
      animations: {
        opacity: withTiming(0, timingConfig),
        transform: [
          {
            translateX: withTiming(
              direction * motion.chartContentTravel,
              timingConfig,
            ),
          },
          { translateY: withTiming(-spacing.sm, timingConfig) },
        ],
      },
    };
  };
}
