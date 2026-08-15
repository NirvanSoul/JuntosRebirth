import { useEffect } from 'react';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Circle, type CircleProps } from 'react-native-svg';

import { motion } from '@/theme/motion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type AnimatedArcSegmentProps = {
  /** Cambia para reiniciar la animación de revelado (p. ej. mes o modo). */
  animationKey: string;
  circumference: number;
  color: string;
  cx: number;
  cy: number;
  dashLength: number;
  dashOffset: number;
  index: number;
  radius: number;
  /** Ángulo de inicio del trazo. -90 empieza arriba, 180 empieza a la izquierda. */
  rotation: number;
  strokeWidth: number;
  testID: string;
};

export function AnimatedArcSegment({
  animationKey,
  circumference,
  color,
  cx,
  cy,
  dashLength,
  dashOffset,
  index,
  radius,
  rotation,
  strokeWidth,
  testID,
}: AnimatedArcSegmentProps) {
  const revealProgress = useSharedValue(0);

  useEffect(() => {
    revealProgress.value = 0;
    revealProgress.value = withDelay(
      index * motion.chartRevealStagger,
      withTiming(1, {
        duration: motion.chartRevealDuration,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }),
      ReduceMotion.System,
    );
  }, [animationKey, dashLength, index, revealProgress]);

  const animatedProps = useAnimatedProps<CircleProps>(() => ({
    strokeDasharray: [
      Math.max(dashLength * revealProgress.value, 0.01),
      circumference,
    ],
  }));

  return (
    <AnimatedCircle
      animatedProps={animatedProps}
      cx={cx}
      cy={cy}
      fill="none"
      origin={`${cx}, ${cy}`}
      r={radius}
      rotation={rotation}
      stroke={color}
      strokeDashoffset={dashOffset}
      strokeLinecap="round"
      strokeWidth={strokeWidth}
      testID={testID}
    />
  );
}
