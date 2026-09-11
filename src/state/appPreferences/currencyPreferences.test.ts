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
});
