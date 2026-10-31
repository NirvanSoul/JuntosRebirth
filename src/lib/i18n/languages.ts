import { getLocales } from 'expo-localization';

export const appLanguages = ['es', 'en'] as const;

export type AppLanguage = (typeof appLanguages)[number];

export const defaultAppLanguage: AppLanguage = 'es';

/** Locale BCP 47 que usan `Intl` y los formateadores de importes y fechas. */
export const appLocaleByLanguage: Record<AppLanguage, string> = {
  es: 'es-ES',
  en: 'en-US',
};

/** Cada idioma se nombra en sí mismo para que se reconozca sin leer el otro. */
export const appLanguageLabels: Record<AppLanguage, string> = {
  es: 'Español',
  en: 'English',
};

export function isAppLanguage(value: unknown): value is AppLanguage {
  return appLanguages.includes(value as AppLanguage);
}

/**
 * El primer idioma preferido del dispositivo que la app admite; si ninguno lo
 * es, español. Solo se lee el código de idioma: «en-GB» y «en-US» son inglés.
 */
export function resolveDeviceLanguage(): AppLanguage {
  try {
    const supported = getLocales()
      .map((locale) => locale.languageCode)
      .find(isAppLanguage);
    return supported ?? defaultAppLanguage;
  } catch {
    return defaultAppLanguage;
  }
}
