import {
  getHomeCurrencyButtonLabel,
  getNextHomeCurrency,
  resolveHomeCurrencies,
} from '@/navigation/homeCurrencyControls';

describe('homeCurrencyControls', () => {
  it('reemplaza cualquier preferencia heredada por USD y VES en Venezuela', () => {
    expect(resolveHomeCurrencies(['EUR', 'USD', 'GBP'], true)).toEqual([
      'USD',
      'VES',
    ]);
  });

  it('muestra símbolos sin banderas y alterna solo entre USD y VES en Venezuela', () => {
    const currencies = resolveHomeCurrencies(['EUR', 'USD', 'GBP'], true);

    expect(getHomeCurrencyButtonLabel('USD', true)).toBe('$');
    expect(getHomeCurrencyButtonLabel('VES', true)).toBe('Bs');
    expect(getNextHomeCurrency(currencies, 'USD')).toBe('VES');
    expect(getNextHomeCurrency(currencies, 'VES')).toBe('USD');
  });
});
