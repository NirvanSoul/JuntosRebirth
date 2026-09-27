import { useCallback } from 'react';
import {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { motion } from '@/theme/motion';

/** Hundimiento breve del importe: se encoge con la tecla y vuelve con muelle. */
const pulseScale = 0.96;
const pulseTravel = 2;

const pulseTiming = {
  duration: motion.inputPulseDuration,
  reduceMotion: ReduceMotion.System,
};
const pulseSpring = {
  ...motion.disclosureSpring,
  reduceMotion: ReduceMotion.System,
};

/**
 * Acuse visual de cada tecla sobre el importe grande. Lo comparten el modal de
 * movimiento y el de compra / venta de dólares, que usan el mismo teclado.
 */
export function useAmountInputPulse() {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  const amountPulseStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  const pulseAmount = useCallback(() => {
    // Los `SharedValue` de Reanimated son mutables por diseño; el linter de
    // React Compiler no distingue esta API de un valor de React.
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withSequence(
      withTiming(pulseScale, pulseTiming),
      withSpring(1, pulseSpring),
    );
    // eslint-disable-next-line react-hooks/immutability
    translateY.value = withSequence(
      withTiming(pulseTravel, pulseTiming),
      withSpring(0, pulseSpring),
    );
  }, [scale, translateY]);

  return { amountPulseStyle, pulseAmount };
}
