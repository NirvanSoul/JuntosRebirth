import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';

import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { OnboardingScreenLayout } from '@/features/onboarding/components/OnboardingScreenLayout';
import type { OnboardingStackParamList } from '@/features/onboarding/OnboardingNavigator';
import { triggerHaptic } from '@/lib/haptics/haptics';
import { requestNotificationPermission } from '@/lib/notifications/localNotifications';

type Props = NativeStackScreenProps<
  OnboardingStackParamList,
  'NotificationsPermission'
>;

const notificationsIllustrationAspectRatio = 1608 / 1356;

export function NotificationsPermissionScreen({ navigation }: Props) {
  const [isRequesting, setRequesting] = useState(false);

  const continueToCategories = () => {
    navigation.navigate('CreateFirstCategory');
  };

  const handleEnableNotifications = async () => {
    if (isRequesting) return;

    setRequesting(true);
    try {
      await requestNotificationPermission();
    } catch (error) {
      console.error(
        '[onboarding] No se pudo solicitar el permiso de notificaciones',
        error,
      );
    } finally {
      setRequesting(false);
      continueToCategories();
    }
  };

  return (
    <OnboardingScreenLayout
      actionDisabled={isRequesting}
      actionLabel={isRequesting ? 'Activando…' : 'Activar notificaciones'}
      currentStep={6}
      illustrationAspectRatio={notificationsIllustrationAspectRatio}
      illustrationSource={require('../../../../assets/Onboarding/5.5_Notificaciones.png')}
      onAction={() => void handleEnableNotifications()}
      onBack={() => navigation.goBack()}
      secondaryAction={
        <ModalPrimaryAction
          accessibilityLabel="Ahora no"
          disabled={isRequesting}
          label="Ahora no"
          onPress={() => {
            triggerHaptic('onboardingContinue');
            continueToCategories();
          }}
          testID="onboarding-notifications-not-now"
          variant="surface"
        />
      }
      subtitle="Recibe recordatorios que activas y avisos cuando alguien te invite a un espacio. Puedes cambiarlo después en Ajustes."
      testID="onboarding-notifications"
      title={'¿Quieres activar las\nnotificaciones?'}
    />
  );
}
