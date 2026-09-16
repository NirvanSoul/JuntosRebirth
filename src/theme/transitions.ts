import {
  Easing,
  FadeInDown,
  LinearTransition,
  ReduceMotion,
} from 'react-native-reanimated';

import { motion } from '@/theme/motion';

type DisclosureStaggerOptions = {
  initialDelay?: number;
  interval?: number;
  maxDelay?: number;
};

export function getDisclosureStaggerDelay(
  index: number,
  {
    initialDelay = 0,
    interval = motion.calendarContentStagger,
    maxDelay = motion.calendarContentMaxDelay,
  }: DisclosureStaggerOptions = {},
) {
  return Math.min(initialDelay + index * interval, maxDelay);
}

export function getDisclosureEntering(delay = 0) {
  return FadeInDown.springify()
    .delay(delay)
    .damping(motion.disclosureSpring.damping)
    .mass(motion.disclosureSpring.mass)
    .stiffness(motion.disclosureSpring.stiffness)
    .reduceMotion(ReduceMotion.System);
}

export function getDisclosureLayoutTransition() {
  return LinearTransition.springify()
    .damping(motion.disclosureSpring.damping)
    .mass(motion.disclosureSpring.mass)
    .stiffness(motion.disclosureSpring.stiffness)
    .reduceMotion(ReduceMotion.System);
}

/** Entrada por elemento, con recorrido corto y desfase acotado. */
export function getStartupEntering(index = 0) {
  return FadeInDown.duration(motion.startupRevealDuration)
    .withInitialValues({ translateY: motion.startupRevealTravel })
    .delay(
      motion.loadingCompletionDuration +
        getDisclosureStaggerDelay(index, {
          interval: motion.startupRevealStagger,
          maxDelay: motion.startupRevealMaxDelay,
        }),
    )
    .easing(Easing.out(Easing.cubic))
    .reduceMotion(ReduceMotion.System);
}
