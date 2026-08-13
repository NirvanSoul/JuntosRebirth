import { StyleSheet, View } from 'react-native';

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
      {Array.from({ length: totalSteps }, (_, index) => (
        <View
          key={index}
          style={[
            styles.segment,
            index < visibleCurrentStep ? styles.segmentComplete : null,
          ]}
          testID={`${testID}-segment-${index + 1}`}
        />
      ))}
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
      borderRadius: radii.round,
      backgroundColor: colors.surfaceMuted,
    },
    segmentComplete: { backgroundColor: colors.cta },
  });
}
