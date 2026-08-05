import {
  currencyCatalog,
  searchCurrencyCatalog,
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
