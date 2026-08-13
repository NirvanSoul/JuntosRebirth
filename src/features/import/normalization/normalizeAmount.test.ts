import { normalizeAmount } from '@/features/import/normalization/normalizeAmount';

describe('normalizeAmount', () => {
  it('interpreta la coma como separador decimal con separador de miles con punto', () => {
    expect(normalizeAmount('1.234,56')).toEqual({
      amountMinor: 123456,
      isNegative: false,
    });
  });

  it('interpreta el punto como separador decimal con separador de miles con coma', () => {
    expect(normalizeAmount('1,234.56')).toEqual({
      amountMinor: 123456,
      isNegative: false,
    });
  });

  it('reconoce un importe negativo entre paréntesis', () => {
    expect(normalizeAmount('(45.20)')).toEqual({
      amountMinor: 4520,
      isNegative: true,
    });
  });

  it('reconoce un guion final como negativo', () => {
    expect(normalizeAmount('45,20-')).toEqual({
      amountMinor: 4520,
      isNegative: true,
    });
  });

  it('descarta símbolos de moneda', () => {
    expect(normalizeAmount('€ 1.234,56')).toEqual({
      amountMinor: 123456,
      isNegative: false,
    });
    expect(normalizeAmount('$1,234.56')).toEqual({
      amountMinor: 123456,
      isNegative: false,
    });
  });

  it('trata un único punto seguido de 3 dígitos como separador de miles', () => {
    expect(normalizeAmount('1.234')).toEqual({
      amountMinor: 123400,
      isNegative: false,
    });
  });

  it('acepta un importe cero', () => {
    expect(normalizeAmount('0')).toEqual({ amountMinor: 0, isNegative: false });
  });

  it('acepta un importe grande', () => {
    expect(normalizeAmount('1.234.567,89')).toEqual({
      amountMinor: 123456789,
      isNegative: false,
    });
  });

  it('acepta un número de celda ya numérico', () => {
    expect(normalizeAmount(-12.5)).toEqual({
      amountMinor: 1250,
      isNegative: true,
    });
  });

  it('devuelve null cuando no puede reconocer el importe', () => {
    expect(normalizeAmount('no es un importe').amountMinor).toBeNull();
    expect(normalizeAmount(null).amountMinor).toBeNull();
    expect(normalizeAmount('').amountMinor).toBeNull();
  });

  it('reconoce un guion negativo pegado a un símbolo de moneda', () => {
    expect(normalizeAmount('$-45.20')).toEqual({
      amountMinor: 4520,
      isNegative: true,
    });
    expect(normalizeAmount('USD -45,20')).toEqual({
      amountMinor: 4520,
      isNegative: true,
    });
  });

  it('reconoce un sufijo DR como negativo y CR como positivo', () => {
    expect(normalizeAmount('45.20 DR')).toEqual({
      amountMinor: 4520,
      isNegative: true,
    });
    expect(normalizeAmount('1.234,56CR')).toEqual({
      amountMinor: 123456,
      isNegative: false,
    });
    expect(normalizeAmount('45.20 dr')).toEqual({
      amountMinor: 4520,
      isNegative: true,
    });
  });
});
