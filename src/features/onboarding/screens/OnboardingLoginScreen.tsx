import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';

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
  useEffect(() => {
    // Llegar a Acceso cierra el recorrido local aunque se inicie sesión más
    // tarde. Así, al reabrir la instalación no se repiten sus láminas.
    void onComplete().catch((error: unknown) => {
      console.error('[onboarding] No se pudo guardar la finalización', error);
    });
  }, [onComplete]);

  return <AccessScreen />;
}
