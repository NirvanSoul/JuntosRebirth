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

type StepProgressBarProps = {
  currentStep: number;
  testID?: string;
  totalSteps: number;
};

export function StepProgressBar({
  currentStep,
  testID = 'step-progress-bar',
  totalSteps,
}: StepProgressBarProps) {
  const styles = useThemedStyles(createStyles);
  const progress = useSharedValue(0);
  const target = totalSteps > 0 ? currentStep / totalSteps : 0;

  useEffect(() => {
    progress.value = withTiming(target, {
      duration: motion.stepProgressFillDuration,
      reduceMotion: ReduceMotion.System,
    });
  }, [progress, target]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, progress.value)) * 100}%`,
  }));

  return (
    <View
      accessibilityLabel="Progreso del formulario"
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 1,
        max: totalSteps,
        now: currentStep,
        text: `Paso ${currentStep} de ${totalSteps}`,
      }}
      accessible
      style={styles.track}
      testID={testID}
    >
      <Animated.View
        style={[styles.fill, fillStyle]}
        testID={`${testID}-fill`}
      />
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    track: {
      width: '100%',
      height: spacing.xs,
      overflow: 'hidden',
      borderRadius: radii.round,
      backgroundColor: colors.surfaceMuted,
    },
    fill: {
      height: '100%',
      borderRadius: radii.round,
      backgroundColor: colors.cta,
    },
  });
}
