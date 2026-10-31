import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  SettingsDivider,
  SettingsToggleRow,
} from '@/components/layout/SettingsList/SettingsList';
import { useCurrencySymbolPreference } from '@/state/appPreferences/CurrencySymbolPreferenceProvider';
import { categoryColors } from '@/theme/categoryColors';

export function CurrencySymbolsToggleRow() {
  const { t } = useTranslation();
  const { setShowCurrencySymbols, showCurrencySymbols } =
    useCurrencySymbolPreference();

  return (
    <>
      <SettingsToggleRow
        description={
          showCurrencySymbols
            ? t('settings.rows.currencySymbolsOn')
            : t('settings.rows.currencySymbolsOff')
        }
        enabled={showCurrencySymbols}
        icon="eye-outline"
        iconBackgroundColor={categoryColors.violet}
        label={t('settings.rows.currencySymbols')}
        onToggle={(enabled) => {
          void setShowCurrencySymbols(enabled).catch(() => {
            Alert.alert(
              t('settings.saveSettingError.title'),
              t('settings.saveSettingError.message'),
            );
          });
        }}
        testID="currency-symbols-toggle"
      />
      <SettingsDivider />
    </>
  );
}
