import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AccessScreen } from '@/features/access/screens/AccessScreen';
import type { OnboardingStackParamList } from '@/features/onboarding/OnboardingNavigator';

type Props = NativeStackScreenProps<
  OnboardingStackParamList,
  'OnboardingLogin'
> & {
  onComplete: () => Promise<void>;
};

/** Última lámina: reutiliza el flujo real de acceso, no una copia de login. */
export function OnboardingLoginScreen({ onComplete }: Props) {
  return <AccessScreen onAuthenticated={onComplete} />;
}
