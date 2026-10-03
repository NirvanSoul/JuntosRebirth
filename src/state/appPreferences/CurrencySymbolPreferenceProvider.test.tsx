import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { Pressable } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { ActiveSpaceHeader } from '@/components/navigation/ActiveSpaceHeader/ActiveSpaceHeader';
import {
  CurrencySymbolPreferenceProvider,
  useCurrencySymbolPreference,
} from '@/state/appPreferences/CurrencySymbolPreferenceProvider';
import { saveCurrencySymbolPreference } from '@/state/appPreferences/currencySymbolPreferenceRepository';
import { renderWithTheme } from '@/test/renderWithTheme';

function PreferenceProbe() {
  const { formatCurrency, setShowCurrencySymbols, showCurrencySymbols } =
    useCurrencySymbolPreference();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => void setShowCurrencySymbols(!showCurrencySymbols)}
    >
      <Text>{formatCurrency(150_000, 'EUR', 'es-ES')}</Text>
    </Pressable>
  );
}

describe('CurrencySymbolPreferenceProvider', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('aplica la preferencia guardada y actualiza todos los formatos al cambiarla', async () => {
    await saveCurrencySymbolPreference('account-1', {
      showCurrencySymbols: false,
    });
    const screen = await renderWithTheme(
      <CurrencySymbolPreferenceProvider accountId="account-1">
        <PreferenceProbe />
      </CurrencySymbolPreferenceProvider>,
    );

    await waitFor(() => expect(screen.getByText('1.500')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByRole('button'));
    });
    await waitFor(() => expect(screen.getByText(/^1\.500\s*€$/)).toBeTruthy());
  });

  it('retira también el símbolo del selector de moneda global', async () => {
    await saveCurrencySymbolPreference('account-1', {
      showCurrencySymbols: false,
    });
    const screen = await renderWithTheme(
      <CurrencySymbolPreferenceProvider accountId="account-1">
        <ActiveSpaceHeader
          currencyFlag="$"
          onCurrencyPress={jest.fn()}
          onSpacePress={jest.fn()}
          spaceName="Personal"
        />
      </CurrencySymbolPreferenceProvider>,
    );

    await waitFor(() => expect(screen.getByText('🇺🇸')).toBeTruthy());
    expect(screen.queryByText('$')).toBeNull();
  });
});
