import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Text, type TextTone } from '@/components/ui/Text/Text';
import { motion } from '@/theme/motion';
import type { FontWeight, TextVariant } from '@/theme/typography';

type OnboardingRevealTextProps = {
  accessibilityRole?: 'header';
  reduceMotion: boolean;
  startDelay?: number;
  testID?: string;
  text: string;
  tone?: TextTone;
  variant: TextVariant;
  weight?: FontWeight;
};

/** Cuánto tarda en completarse la revelación de un bloque, para encadenar el siguiente. */
export function estimateRevealDuration(): number {
  return motion.onboardingTextRevealBlockDuration;
}

/**
 * Título o subtítulo de onboarding que aparece como un solo bloque con un
 * fundido y un ligero desplazamiento vertical, no letra a letra. Respeta
 * "Reducir movimiento": si `reduceMotion` es `true`, el texto aparece
 * completo de inmediato.
 */
export function OnboardingRevealText({
  accessibilityRole,
  reduceMotion,
  startDelay = 0,
  testID,
  text,
  tone = 'primary',
  variant,
  weight,
}: OnboardingRevealTextProps) {
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const translateY = useSharedValue(
    reduceMotion ? 0 : motion.onboardingTextRevealBlockTravel,
  );

  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withDelay(
      startDelay,
      withTiming(1, { duration: motion.onboardingTextRevealBlockDuration }),
    );
    translateY.value = withDelay(
      startDelay,
      withTiming(0, { duration: motion.onboardingTextRevealBlockDuration }),
    );
    // Se revela una sola vez al montar: startDelay y reduceMotion son
    // estables durante la vida de este bloque.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Text
        accessibilityRole={accessibilityRole}
        testID={testID}
        tone={tone}
        variant={variant}
        weight={weight}
      >
        {text}
      </Text>
    </Animated.View>
  );
}
