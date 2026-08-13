import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { OnboardingScreenLayout } from '@/features/onboarding/components/OnboardingScreenLayout';
import type { OnboardingStackParamList } from '@/features/onboarding/OnboardingNavigator';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;

const walletIllustrationAspectRatio = 1300 / 1231;

export function WelcomeScreen({ navigation }: Props) {
  return (
    <OnboardingScreenLayout
      actionLabel="Continuar"
      onAction={() => navigation.navigate('CalendarPreview')}
      onBack={() => navigation.goBack()}
      currentStep={3}
      illustrationAspectRatio={walletIllustrationAspectRatio}
      illustrationSource={require('../../../../assets/Onboarding/3 Menos dudas.png')}
      subtitle="Guarda cada gasto e ingreso y mantén una visión clara de tu dinero."
      testID="onboarding-welcome"
      title={'Menos dudas, más control sobre\ntu dinero.'}
    />
  );
}
