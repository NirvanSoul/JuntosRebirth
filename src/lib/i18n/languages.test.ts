import { getLocales } from 'expo-localization';

import { resolveDeviceLanguage } from '@/lib/i18n/languages';

// `src/test/setup.ts` ya sustituye expo-localization por un mock.
const mockGetLocales = getLocales as jest.Mock;

describe('resolveDeviceLanguage', () => {
  it('usa el primer idioma admitido entre los preferidos del dispositivo', () => {
    mockGetLocales.mockReturnValue([
      { languageCode: 'fr' },
      { languageCode: 'en' },
      { languageCode: 'es' },
    ]);
    expect(resolveDeviceLanguage()).toBe('en');
  });

  it('vuelve al español si ningún idioma está admitido o la lectura falla', () => {
    mockGetLocales.mockReturnValue([{ languageCode: 'de' }]);
    expect(resolveDeviceLanguage()).toBe('es');

    mockGetLocales.mockImplementation(() => {
      throw new Error('sin módulo nativo');
    });
    expect(resolveDeviceLanguage()).toBe('es');
  });
});
