import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  loadLanguagePreference,
  saveLanguagePreference,
} from '@/lib/i18n/languagePreferenceRepository';

describe('languagePreferenceRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('sin elección guardada devuelve null para seguir al dispositivo', async () => {
    await expect(loadLanguagePreference()).resolves.toBeNull();
  });

  it('conserva el idioma elegido', async () => {
    await saveLanguagePreference('en');
    await expect(loadLanguagePreference()).resolves.toBe('en');
  });

  it('ignora un valor guardado corrupto o de un idioma no admitido', async () => {
    await AsyncStorage.setItem('@juntoss/language-preference/v1', '{');
    await expect(loadLanguagePreference()).resolves.toBeNull();

    await AsyncStorage.setItem(
      '@juntoss/language-preference/v1',
      JSON.stringify({ version: 1, language: 'fr' }),
    );
    await expect(loadLanguagePreference()).resolves.toBeNull();
  });
});
