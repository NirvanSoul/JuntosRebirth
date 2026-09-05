import { getExchangeRateSourceLabel } from '@/lib/currency/exchangeRateSource';

describe('getExchangeRateSourceLabel', () => {
  it('devuelve la etiqueta legible de cada fuente de tasa', () => {
    expect(getExchangeRateSourceLabel('BCV')).toBe('BCV');
    expect(getExchangeRateSourceLabel('EURO')).toBe('Euro');
    expect(getExchangeRateSourceLabel('CUSTOM')).toBe('Personalizada');
  });
});
