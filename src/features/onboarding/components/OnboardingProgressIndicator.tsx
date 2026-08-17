import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useThemedStyles } from '@/theme/useThemedStyles';

type OnboardingProgressIndicatorProps = {
  currentStep: number;
  testID?: string;
  totalSteps?: number;
};

/** Indicador segmentado que expresa el avance de las láminas de onboarding. */
export function OnboardingProgressIndicator({
  currentStep,
  testID = 'onboarding-progress',
  totalSteps = 9,
}: OnboardingProgressIndicatorProps) {
  const styles = useThemedStyles(createStyles);
  const visibleCurrentStep = Math.max(1, Math.min(currentStep, totalSteps));

  return (
    <View
      accessibilityLabel={`Progreso del onboarding: paso ${visibleCurrentStep} de ${totalSteps}`}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 1,
        max: totalSteps,
        now: visibleCurrentStep,
        text: `Paso ${visibleCurrentStep} de ${totalSteps}`,
      }}
      accessible
      style={styles.container}
      testID={testID}
    >
      {Array.from({ length: totalSteps }, (_, index) => {
        const step = index + 1;
        return (
          <OnboardingProgressSegment
            complete={step < visibleCurrentStep}
            current={step === visibleCurrentStep}
            key={step}
            styles={styles}
            testID={`${testID}-segment-${step}`}
          />
        );
      })}
    </View>
  );
}

type OnboardingProgressSegmentProps = {
  complete: boolean;
  current: boolean;
  styles: ReturnType<typeof createStyles>;
  testID: string;
};

function OnboardingProgressSegment({
  complete,
  current,
  styles,
  testID,
}: OnboardingProgressSegmentProps) {
  const fillProgress = useSharedValue(complete ? 1 : 0);

  useEffect(() => {
    if (current) {
      fillProgress.value = 0;
      fillProgress.value = withTiming(1, {
        duration: motion.stepProgressFillDuration,
        reduceMotion: ReduceMotion.System,
      });
      return;
    }
    fillProgress.value = complete ? 1 : 0;
  }, [complete, current, fillProgress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, fillProgress.value)) * 100}%`,
  }));

  return (
    <View style={styles.segment} testID={testID}>
      <Animated.View
        style={[styles.segmentFill, fillStyle]}
        testID={`${testID}-fill`}
      />
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      gap: spacing.sm,
      width: '100%',
    },
    segment: {
      flex: 1,
      height: spacing.xs,
      overflow: 'hidden',
      borderRadius: radii.round,
      backgroundColor: colors.surfaceMuted,
    },
    segmentFill: {
      height: '100%',
      borderRadius: radii.round,
      backgroundColor: colors.cta,
    },
  });
}
