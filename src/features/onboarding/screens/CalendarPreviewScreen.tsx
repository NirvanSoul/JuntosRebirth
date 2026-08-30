import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { OnboardingScreenLayout } from '@/features/onboarding/components/OnboardingScreenLayout';
import type { OnboardingStackParamList } from '@/features/onboarding/OnboardingNavigator';

type Props = NativeStackScreenProps<
  OnboardingStackParamList,
  'CalendarPreview'
>;

const calendarIllustrationAspectRatio = 1300 / 1035;

export function CalendarPreviewScreen({ navigation }: Props) {
  return (
    <OnboardingScreenLayout
      actionLabel="Continuar"
      onAction={() => navigation.navigate('Juntos')}
      onBack={() => navigation.goBack()}
      currentStep={4}
      illustrationAspectRatio={calendarIllustrationAspectRatio}
      illustrationSource={require('../../../../assets/Onboarding/4_Tu_mes.png')}
      subtitle="Mira en tu Mapa cómo se ha movido tu dinero a lo largo de los días."
      testID="onboarding-calendar"
      title="Tu mes tiene mucho que contarte"
    />
  );
}
