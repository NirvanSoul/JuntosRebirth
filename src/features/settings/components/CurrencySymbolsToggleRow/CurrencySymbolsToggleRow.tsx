import { Alert } from 'react-native';

import {
  SettingsDivider,
  SettingsToggleRow,
} from '@/components/layout/SettingsList/SettingsList';
import { useCurrencySymbolPreference } from '@/state/appPreferences/CurrencySymbolPreferenceProvider';
import { categoryColors } from '@/theme/categoryColors';

export function CurrencySymbolsToggleRow() {
  const { setShowCurrencySymbols, showCurrencySymbols } =
    useCurrencySymbolPreference();

  return (
    <>
      <SettingsToggleRow
        description={
          showCurrencySymbols
            ? 'Visibles junto a los importes'
            : 'Solo se muestran los números'
        }
        enabled={showCurrencySymbols}
        icon="eye-outline"
        iconBackgroundColor={categoryColors.violet}
        label="Símbolos de moneda"
        onToggle={(enabled) => {
          void setShowCurrencySymbols(enabled).catch(() => {
            Alert.alert('No pudimos guardar el ajuste', 'Inténtalo de nuevo.');
          });
        }}
        testID="currency-symbols-toggle"
      />
      <SettingsDivider />
    </>
  );
}
