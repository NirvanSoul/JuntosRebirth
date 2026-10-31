import { useTranslation } from 'react-i18next';

import { setAppLanguage } from '@/lib/i18n/i18n';
import {
  appLocaleByLanguage,
  defaultAppLanguage,
  isAppLanguage,
  type AppLanguage,
} from '@/lib/i18n/languages';

export type AppLanguageState = {
  language: AppLanguage;
  locale: string;
  setLanguage: (language: AppLanguage) => Promise<void>;
};

/** Idioma activo; el componente se vuelve a pintar cuando cambia. */
export function useAppLanguage(): AppLanguageState {
  const { i18n } = useTranslation();
  const language = isAppLanguage(i18n.language)
    ? i18n.language
    : defaultAppLanguage;

  return {
    language,
    locale: appLocaleByLanguage[language],
    setLanguage: setAppLanguage,
  };
}
