import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ReduceMotion,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/Text/Text';
import { OnboardingProgressIndicator } from '@/features/onboarding/components/OnboardingProgressIndicator';
import { useOnboardingFlow } from '@/features/onboarding/context/OnboardingFlowContext';
import { motion } from '@/theme/motion';
import { spacing } from '@/theme/spacing';
import { getDisclosureLayoutTransition } from '@/theme/transitions';

/** Altura fija de la barra, tenga o no `Omitir`, para que el progreso no se mueva entre láminas. */
const topBarHeight = 44;

/**
 * `Omitir` aparece y desaparece en su sitio, en vez de saltar entre láminas:
 * un fundido corto mientras el indicador de progreso cede o recupera ese
 * ancho con la misma transición de disposición del resto de la lámina.
 */
const skipEntering = FadeIn.duration(
  motion.disclosureRevealDuration,
).reduceMotion(ReduceMotion.System);
const skipExiting = FadeOut.duration(
  motion.disclosureExitDuration,
).reduceMotion(ReduceMotion.System);

type OnboardingTopBarProps = {
  canSkip: boolean;
  currentStep: number;
  onSkip?: () => void;
  testID?: string;
};

/** Indicador de progreso fijo entre láminas y, a su derecha, `Omitir` cuando procede. */
export function OnboardingTopBar({
  canSkip,
  currentStep,
  onSkip,
  testID,
}: OnboardingTopBarProps) {
  const layoutTransition = getDisclosureLayoutTransition();
  const skipHistory = useOnboardingFlow()?.topBarSkipHistory;
  // La lámina anterior decide si `Omitir` se anima: solo cambia de estado
  // cuando pasa de estar a no estar (o al revés); si se mantiene, queda fijo.
  const previousHadSkip = skipHistory?.current.at(-1);
  const skipEntersAnimated = canSkip && previousHadSkip === false;
  const [isSkipGhostVisible, setSkipGhostVisible] = useState(
    !canSkip && previousHadSkip === true,
  );

  useEffect(() => {
    const history = skipHistory?.current;
    if (!history) return;
    history.push(canSkip);
    return () => {
      history.pop();
    };
  }, [canSkip, skipHistory]);

  useEffect(() => {
    if (!isSkipGhostVisible) return;
    // Un fotograma en su sitio para que `exiting` parta de su tamaño real.
    const frame = requestAnimationFrame(() => setSkipGhostVisible(false));
    return () => cancelAnimationFrame(frame);
  }, [isSkipGhostVisible]);

  return (
    <Animated.View style={styles.topBar}>
      <Animated.View layout={layoutTransition} style={styles.progress}>
        <OnboardingProgressIndicator currentStep={currentStep} />
      </Animated.View>
      {canSkip ? (
        <Animated.View
          entering={skipEntersAnimated ? skipEntering : undefined}
          style={styles.skipAction}
        >
          <Pressable
            accessibilityLabel="Omitir pantallas informativas"
            accessibilityRole="button"
            disabled={false}
            hitSlop={spacing.sm}
            onPress={() => onSkip?.()}
            style={styles.skipPressable}
            testID={testID ? `${testID}-skip` : undefined}
          >
            <Text tone="secondary" variant="label" weight="medium">
              Omitir
            </Text>
          </Pressable>
        </Animated.View>
      ) : isSkipGhostVisible ? (
        <Animated.View
          accessibilityElementsHidden
          exiting={skipExiting}
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={styles.skipAction}
          testID={testID ? `${testID}-skip-ghost` : undefined}
        >
          <Text tone="secondary" variant="label" weight="medium">
            Omitir
          </Text>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: topBarHeight,
  },
  progress: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  skipAction: {
    marginLeft: 'auto',
    minHeight: topBarHeight,
    justifyContent: 'center',
  },
  skipPressable: { minHeight: topBarHeight, justifyContent: 'center' },
});
