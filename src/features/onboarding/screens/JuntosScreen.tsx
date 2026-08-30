import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { OnboardingScreenLayout } from '@/features/onboarding/components/OnboardingScreenLayout';
import type { OnboardingStackParamList } from '@/features/onboarding/OnboardingNavigator';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Juntos'>;

const puzzleIllustrationAspectRatio = 1300 / 1125;

export function JuntosScreen({ navigation }: Props) {
  return (
    <OnboardingScreenLayout
      actionLabel="Continuar"
      onAction={() => navigation.navigate('CreateFirstCategory')}
      onBack={() => navigation.goBack()}
      currentStep={5}
      illustrationAspectRatio={puzzleIllustrationAspectRatio}
      illustrationFullBleed
      illustrationSource={require('../../../../assets/Onboarding/5_Juntos.png')}
      subtitle="Comparte gastos con tu pareja y conserva lo personal en tu propio espacio."
      testID="onboarding-juntos"
      title={'Juntos, pero no\nrevueltos'}
    />
  );
}
