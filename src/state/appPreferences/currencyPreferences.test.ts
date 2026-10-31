import { countryCatalog } from '@/lib/geography/countryCatalog';
import { currencyPreferencesForCountry } from '@/state/appPreferences/currencyPreferences';

describe('currencyPreferencesForCountry', () => {
  it('fija USD y VES para Venezuela, sin permitir EUR', () => {
    expect(currencyPreferencesForCountry('ve')).toEqual({
      currencies: ['USD', 'VES'],
    });
  });

  it('restaura la moneda principal del país para otros contextos', () => {
    expect(currencyPreferencesForCountry('ES')).toEqual({
      currencies: ['EUR'],
    });
  });

  it.each(
    countryCatalog
      .filter((country) => country.iso2 !== 'VE')
      .map((country) => [country.iso2, country.currencyCode] as const),
  )('siembra para %s su propia moneda (%s)', (iso2, currencyCode) => {
    expect(currencyPreferencesForCountry(iso2)).toEqual({
      currencies: [currencyCode],
    });
  });

  it('no impone EUR a un país fuera del catálogo', () => {
    expect(currencyPreferencesForCountry('EC')).toBeNull();
  });
});
