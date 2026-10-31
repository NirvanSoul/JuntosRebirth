import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

export function useSaveErrorAlert(): () => void {
  const { t } = useTranslation();

  return useCallback(() => {
    Alert.alert(
      t('navigation.saveError.title'),
      t('navigation.saveError.message'),
    );
  }, [t]);
}
