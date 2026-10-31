import { catalogs } from '@/lib/i18n/dictionary/en/catalogs';
import { core } from '@/lib/i18n/dictionary/en/core';
import { experience } from '@/lib/i18n/dictionary/en/experience';
import { imports } from '@/lib/i18n/dictionary/en/imports';
import { notifications } from '@/lib/i18n/dictionary/en/notifications';
import { organization } from '@/lib/i18n/dictionary/en/organization';
import { people } from '@/lib/i18n/dictionary/en/people';
import { privacyPolicy } from '@/lib/i18n/dictionary/en/privacyPolicy';
import { termsOfService } from '@/lib/i18n/dictionary/en/termsOfService';
import { transactions } from '@/lib/i18n/dictionary/en/transactions';

/**
 * Traducciones al inglés de los textos visibles, indexadas por el texto en
 * español tal como aparece en el código. Los marcadores `{{nombre}}` recogen
 * las partes variables (importes, nombres, fechas) de las frases compuestas.
 *
 * Para traducir un texto nuevo basta con añadirlo al archivo de su área en
 * `dictionary/en/`; el componente no cambia.
 */
export const englishDictionary: Record<string, string> = {
  ...core,
  ...transactions,
  ...organization,
  ...people,
  ...experience,
  ...imports,
  ...catalogs,
  ...notifications,
  ...privacyPolicy,
  ...termsOfService,
};
