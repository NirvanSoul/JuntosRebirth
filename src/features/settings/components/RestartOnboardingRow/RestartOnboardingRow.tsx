import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SettingsRow } from '@/components/layout/SettingsList/SettingsList';
import { categoryColors } from '@/theme/categoryColors';

type RestartOnboardingRowProps = {
  onRestart: () => void;
};

export function RestartOnboardingRow({ onRestart }: RestartOnboardingRowProps) {
  const { t } = useTranslation();

  const handlePress = () => {
    Alert.alert(
      t('settings.restartOnboarding.title'),
      t('settings.restartOnboarding.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.restartOnboarding.confirm'),
          onPress: onRestart,
          style: 'destructive',
        },
      ],
    );
  };

  return (
    <SettingsRow
      icon="refresh-outline"
      iconBackgroundColor={categoryColors.blue}
      label={t('settings.rows.restartOnboarding')}
      onPress={handlePress}
    />
  );
}
