import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { OnboardingScreenLayout } from '@/features/onboarding/components/OnboardingScreenLayout';
import type { OnboardingStackParamList } from '@/features/onboarding/OnboardingNavigator';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'ReadyToExplore'>;

type ReadyToExploreScreenProps = Props & {
  onComplete: () => Promise<void>;
};

const readyIllustrationAspectRatio = 1254 / 1254;
const readyIllustrationScale = 1.12;

export function ReadyToExploreScreen({
  navigation,
  onComplete,
}: ReadyToExploreScreenProps) {
  const handleComplete = async () => {
    try {
      await onComplete();
    } catch (error) {
      console.error('[onboarding] No se pudo completar el onboarding', error);
    }
  };

  return (
    <OnboardingScreenLayout
      actionLabel="Empezar"
      onAction={() => void handleComplete()}
      onBack={() => navigation.goBack()}
      currentStep={9}
      illustrationAspectRatio={readyIllustrationAspectRatio}
      illustrationScale={readyIllustrationScale}
      illustrationSource={require('../../../../assets/Onboarding/9_Abrazo.png')}
      subtitle="Explora Juntos y descubre nuestras herramientas para organizar y entender mejor tu vida financiera."
      testID="onboarding-ready"
      title={'Creces tan rápido…\nYa estás listo.'}
    />
  );
}
