import 'i18next';

import type { TranslationResources } from '@/lib/i18n/locales/es';

// Tipa `t()`: una clave inexistente en español no compila.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: TranslationResources };
    returnNull: false;
  }
}
