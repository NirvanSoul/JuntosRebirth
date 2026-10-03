import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  loadCurrencySymbolPreference,
  saveCurrencySymbolPreference,
} from '@/state/appPreferences/currencySymbolPreferenceRepository';

describe('currencySymbolPreferenceRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('muestra los símbolos por defecto', async () => {
    await expect(loadCurrencySymbolPreference('account-1')).resolves.toEqual({
      showCurrencySymbols: true,
    });
  });

  it('guarda la preferencia de forma independiente para cada perfil', async () => {
    await saveCurrencySymbolPreference('account-1', {
      showCurrencySymbols: false,
    });

    await expect(loadCurrencySymbolPreference('account-1')).resolves.toEqual({
      showCurrencySymbols: false,
    });
    await expect(loadCurrencySymbolPreference('account-2')).resolves.toEqual({
      showCurrencySymbols: true,
    });
  });
});
