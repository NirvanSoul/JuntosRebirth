import {
  currencyCatalog,
  searchCurrencyCatalog,
  getCurrencyMinorUnitDigits,
  getCurrencyMinorUnitFactor,
} from '@/lib/currency/currencyCatalog';

describe('searchCurrencyCatalog', () => {
  it('devuelve el catálogo completo cuando la búsqueda está vacía', () => {
    expect(searchCurrencyCatalog('   ')).toHaveLength(currencyCatalog.length);
  });

  it('encuentra una moneda por el nombre del país, con o sin acentos', () => {
    expect(searchCurrencyCatalog('mexico').map((entry) => entry.code)).toEqual([
      'MXN',
    ]);
    expect(searchCurrencyCatalog('México').map((entry) => entry.code)).toEqual([
      'MXN',
    ]);
    expect(searchCurrencyCatalog('Peru').map((entry) => entry.code)).toEqual([
      'PEN',
    ]);
  });

  it('encuentra una moneda por su nombre', () => {
    expect(
      searchCurrencyCatalog('dolar estadounidense').map((entry) => entry.code),
    ).toEqual(['USD']);
  });

  it('encuentra una moneda por su código, sin distinguir mayúsculas', () => {
    expect(searchCurrencyCatalog('usd').map((entry) => entry.code)).toEqual([
      'USD',
    ]);
    expect(searchCurrencyCatalog('EUR').map((entry) => entry.code)).toEqual([
      'EUR',
    ]);
  });

  it('no encuentra nada con una búsqueda sin coincidencias', () => {
    expect(searchCurrencyCatalog('atlantida')).toEqual([]);
  });
});

describe('metadata de escala monetaria', () => {
  it('asigna exactamente 0 decimales a JPY, CLP y PYG', () => {
    const zeroDecimalCurrencies = ['JPY', 'CLP', 'PYG'] as const;

    for (const code of zeroDecimalCurrencies) {
      expect(getCurrencyMinorUnitDigits(code)).toBe(0);
      expect(getCurrencyMinorUnitFactor(code)).toBe(1);
    }
  });

  it('asigna exactamente 2 decimales a las restantes 28 monedas', () => {
    const zeroDecimalCurrencies = ['JPY', 'CLP', 'PYG'];
    const otherCurrencies = currencyCatalog.filter(
      (c) => !zeroDecimalCurrencies.includes(c.code),
    );

    // El catálogo tiene 31 divisas en total
    expect(otherCurrencies.length).toBe(currencyCatalog.length - 3);

    for (const entry of otherCurrencies) {
      expect(getCurrencyMinorUnitDigits(entry.code)).toBe(2);
      expect(getCurrencyMinorUnitFactor(entry.code)).toBe(100);
    }
  });
});
