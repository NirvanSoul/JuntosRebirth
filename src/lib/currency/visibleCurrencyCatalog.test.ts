import {
  buildVisibleCurrencyCatalog,
  getNextHomeCurrency,
  pickVisibleCurrency,
} from '@/lib/currency/visibleCurrencyCatalog';

describe('buildVisibleCurrencyCatalog', () => {
  it('coloca la moneda del espacio primero y las preferencias después', () => {
    expect(
      buildVisibleCurrencyCatalog({
        preferenceCurrencies: ['EUR'],
        spaceCurrency: 'VES',
      }),
    ).toEqual(['VES', 'EUR']);
  });

  it('no duplica la moneda del espacio aunque esté en las preferencias', () => {
    expect(
      buildVisibleCurrencyCatalog({
        preferenceCurrencies: ['VES', 'EUR'],
        spaceCurrency: 'VES',
      }),
    ).toEqual(['VES', 'EUR']);
  });

  it('añade al final y sin duplicados las monedas presentes en los movimientos', () => {
    expect(
      buildVisibleCurrencyCatalog({
        movementCurrencies: ['USD', 'EUR', 'USD'],
        preferenceCurrencies: ['EUR'],
        spaceCurrency: 'VES',
      }),
    ).toEqual(['VES', 'EUR', 'USD']);
  });

  it('descarta códigos inválidos llegados de los movimientos', () => {
    expect(
      buildVisibleCurrencyCatalog({
        movementCurrencies: ['BTC', '', 'USD'],
        spaceCurrency: 'VES',
      }),
    ).toEqual(['VES', 'USD']);
  });

  it('devuelve solo la moneda del espacio sin preferencias ni movimientos', () => {
    expect(buildVisibleCurrencyCatalog({ spaceCurrency: 'VES' })).toEqual([
      'VES',
    ]);
  });
});

describe('pickVisibleCurrency', () => {
  it('elige la primera moneda del catálogo cuando no hay selección guardada', () => {
    expect(pickVisibleCurrency(['VES', 'EUR'], null)).toBe('VES');
    expect(pickVisibleCurrency(['VES', 'EUR'], undefined)).toBe('VES');
  });

  it('respeta una selección explícita válida', () => {
    expect(pickVisibleCurrency(['VES', 'EUR'], 'EUR')).toBe('EUR');
  });

  it('ignora una selección que salió del catálogo', () => {
    expect(pickVisibleCurrency(['VES'], 'EUR')).toBe('VES');
  });
});

describe('getNextHomeCurrency', () => {
  it('alterna entre las dos monedas del catálogo', () => {
    expect(getNextHomeCurrency(['VES', 'EUR'], 'VES')).toBe('EUR');
    expect(getNextHomeCurrency(['VES', 'EUR'], 'EUR')).toBe('VES');
  });

  it('devuelve null fuera del caso de exactamente dos monedas', () => {
    expect(getNextHomeCurrency(['VES'], 'VES')).toBeNull();
    expect(getNextHomeCurrency(['VES', 'EUR', 'USD'], 'VES')).toBeNull();
  });
});
