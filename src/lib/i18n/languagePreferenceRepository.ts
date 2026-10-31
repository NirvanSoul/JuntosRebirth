import AsyncStorage from '@react-native-async-storage/async-storage';

import { isAppLanguage, type AppLanguage } from '@/lib/i18n/languages';

// Pertenece al dispositivo, no a la cuenta: el onboarding la elige antes de
// que exista una sesión y la pantalla de acceso ya debe mostrarse en ella.
const languagePreferenceStorageKey = '@juntoss/language-preference/v1';

type StoredLanguagePreference = {
  version: 1;
  language: AppLanguage;
};

/** `null` cuando no hay elección guardada: se sigue el idioma del dispositivo. */
export async function loadLanguagePreference(): Promise<AppLanguage | null> {
  const stored = await AsyncStorage.getItem(languagePreferenceStorageKey);

  if (stored === null) return null;

  try {
    const candidate = JSON.parse(
      stored,
    ) as Partial<StoredLanguagePreference> | null;
    return candidate?.version === 1 && isAppLanguage(candidate.language)
      ? candidate.language
      : null;
  } catch {
    return null;
  }
}

export async function saveLanguagePreference(
  language: AppLanguage,
): Promise<void> {
  const stored: StoredLanguagePreference = { version: 1, language };

  await AsyncStorage.setItem(
    languagePreferenceStorageKey,
    JSON.stringify(stored),
  );
}
