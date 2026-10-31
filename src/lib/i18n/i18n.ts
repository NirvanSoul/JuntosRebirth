import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import {
  loadLanguagePreference,
  saveLanguagePreference,
} from '@/lib/i18n/languagePreferenceRepository';
import {
  appLocaleByLanguage,
  defaultAppLanguage,
  isAppLanguage,
  resolveDeviceLanguage,
  type AppLanguage,
} from '@/lib/i18n/languages';
import { en } from '@/lib/i18n/locales/en';
import { es } from '@/lib/i18n/locales/es';

// Instancia propia para no depender del singleton global de i18next;
// `initReactI18next` la registra para `useTranslation`.
const i18n = createInstance();

// Los recursos van incrustados: con `initAsync: false` la instancia queda
// lista al importar el módulo y el primer render ya sale traducido.
void i18n.use(initReactI18next).init({
  resources: { es: { translation: es }, en: { translation: en } },
  lng: resolveDeviceLanguage(),
  fallbackLng: defaultAppLanguage,
  supportedLngs: ['es', 'en'],
  initAsync: false,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export function getAppLanguage(): AppLanguage {
  return isAppLanguage(i18n.language) ? i18n.language : defaultAppLanguage;
}

export function getAppLocale(): string {
  return appLocaleByLanguage[getAppLanguage()];
}

/** Aplica la elección guardada; sin ella se conserva el idioma del dispositivo. */
export async function restoreLanguagePreference(): Promise<void> {
  try {
    const stored = await loadLanguagePreference();
    if (stored && stored !== i18n.language) await i18n.changeLanguage(stored);
  } catch {
    // Sin almacenamiento legible se sigue el idioma del dispositivo.
  }
}

export async function setAppLanguage(language: AppLanguage): Promise<void> {
  await i18n.changeLanguage(language);
  await saveLanguagePreference(language);
}

export { i18n };
