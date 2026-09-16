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

/** Fundido con recorrido corto desde abajo y desfase acotado por posición. */
function getRevealEntering(index: number, initialDelay: number) {
  return FadeInDown.duration(motion.startupRevealDuration)
    .withInitialValues({ translateY: motion.startupRevealTravel })
    .delay(
      initialDelay +
        getDisclosureStaggerDelay(index, {
          interval: motion.startupRevealStagger,
          maxDelay: motion.startupRevealMaxDelay,
        }),
    )
    .easing(Easing.out(Easing.cubic))
    .reduceMotion(ReduceMotion.System);
}

/** Entrada por elemento al arrancar la app, tras completarse la barra de carga. */
export function getStartupEntering(index = 0) {
  return getRevealEntering(index, motion.loadingCompletionDuration);
}

/**
 * Misma entrada que el arranque para cada bloque de una lámina de onboarding,
 * sin esperar a ninguna barra de carga: al cambiar de lámina los bloques
 * suben uno tras otro en cuanto se monta la nueva.
 */
export function getOnboardingEntering(index = 0) {
  return getRevealEntering(index, 0);
}
