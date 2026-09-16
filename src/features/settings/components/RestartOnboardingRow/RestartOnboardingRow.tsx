import { Alert } from 'react-native';

import { SettingsRow } from '@/components/layout/SettingsList/SettingsList';
import { categoryColors } from '@/theme/categoryColors';

type RestartOnboardingRowProps = {
  onRestart: () => void;
};

export function RestartOnboardingRow({ onRestart }: RestartOnboardingRowProps) {
  const handlePress = () => {
    Alert.alert(
      'Reiniciar onboarding',
      'Se cerrará la sesión y volverás al inicio del proceso.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Reiniciar', onPress: onRestart, style: 'destructive' },
      ],
    );
  };

  return (
    <SettingsRow
      icon="refresh-outline"
      iconBackgroundColor={categoryColors.blue}
      label="Reiniciar onboarding"
      onPress={handlePress}
    />
  );
}
