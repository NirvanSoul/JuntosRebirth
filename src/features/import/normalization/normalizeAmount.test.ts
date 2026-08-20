import { normalizeAmount } from '@/features/import/normalization/normalizeAmount';

describe('normalizeAmount', () => {
  describe('monedas de factor 100 (ej. EUR, USD)', () => {
    const currency = 'EUR';

    it('interpreta la coma como separador decimal con separador de miles con punto', () => {
      expect(normalizeAmount('1.234,56', currency)).toEqual({
        ok: true,
        amountMinor: 123456,
        isNegative: false,
      });
    });

    it('interpreta el punto como separador decimal con separador de miles con coma', () => {
      expect(normalizeAmount('1,234.56', currency)).toEqual({
        ok: true,
        amountMinor: 123456,
        isNegative: false,
      });
    });

    it('reconoce un importe negativo entre paréntesis', () => {
      expect(normalizeAmount('(45.20)', currency)).toEqual({
        ok: true,
        amountMinor: 4520,
        isNegative: true,
      });
    });

    it('reconoce un guion final como negativo', () => {
      expect(normalizeAmount('45,20-', currency)).toEqual({
        ok: true,
        amountMinor: 4520,
        isNegative: true,
      });
    });

    it('descarta símbolos de moneda', () => {
      expect(normalizeAmount('€ 1.234,56', currency)).toEqual({
        ok: true,
        amountMinor: 123456,
        isNegative: false,
      });
      expect(normalizeAmount('$1,234.56', currency)).toEqual({
        ok: true,
        amountMinor: 123456,
        isNegative: false,
      });
    });

    it('trata un único punto seguido de 3 dígitos como separador de miles', () => {
      expect(normalizeAmount('1.234', currency)).toEqual({
        ok: true,
        amountMinor: 123400,
        isNegative: false,
      });
    });

    it('acepta un importe cero', () => {
      expect(normalizeAmount('0', currency)).toEqual({
        ok: true,
        amountMinor: 0,
        isNegative: false,
      });
    });

    it('acepta un importe grande', () => {
      expect(normalizeAmount('1.234.567,89', currency)).toEqual({
        ok: true,
        amountMinor: 123456789,
        isNegative: false,
      });
    });

    it('acepta un número de celda ya numérico', () => {
      expect(normalizeAmount(-12.5, currency)).toEqual({
        ok: true,
        amountMinor: 1250,
        isNegative: true,
      });
    });

    it('reconoce un guion negativo pegado a un símbolo de moneda', () => {
      expect(normalizeAmount('$-45.20', currency)).toEqual({
        ok: true,
        amountMinor: 4520,
        isNegative: true,
      });
      expect(normalizeAmount('USD -45,20', currency)).toEqual({
        ok: true,
        amountMinor: 4520,
        isNegative: true,
      });
    });

    it('reconoce un sufijo DR como negativo y CR como positivo', () => {
      expect(normalizeAmount('45.20 DR', currency)).toEqual({
        ok: true,
        amountMinor: 4520,
        isNegative: true,
      });
      expect(normalizeAmount('1.234,56CR', currency)).toEqual({
        ok: true,
        amountMinor: 123456,
        isNegative: false,
      });
      expect(normalizeAmount('45.20 dr', currency)).toEqual({
        ok: true,
        amountMinor: 4520,
        isNegative: true,
      });
    });
  });

  describe('monedas de factor 1 (ej. JPY, CLP, PYG)', () => {
    const currency = 'JPY';

    it('acepta un importe numérico sin fracción', () => {
      expect(normalizeAmount(1000, currency)).toEqual({
        ok: true,
        amountMinor: 1000,
        isNegative: false,
      });
    });

    it('acepta un importe textual sin fracción', () => {
      expect(normalizeAmount('1000 JPY', currency)).toEqual({
        ok: true,
        amountMinor: 1000,
        isNegative: false,
      });
    });

    it('acepta un importe textual con fracción de valor cero y lo normaliza', () => {
      expect(normalizeAmount('1000,00 JPY', currency)).toEqual({
        ok: true,
        amountMinor: 1000,
        isNegative: false,
      });
    });

    it('rechaza un importe numérico con fracción distinta de cero', () => {
      expect(normalizeAmount(1000.5, currency)).toEqual({
        ok: false,
        amountMinor: null,
        isNegative: false,
        reason: 'invalid_fraction',
      });
    });

    it('rechaza un importe textual con fracción distinta de cero', () => {
      expect(normalizeAmount('1000,50 JPY', currency)).toEqual({
        ok: false,
        amountMinor: null,
        isNegative: false,
        reason: 'invalid_fraction',
      });
    });

    it('protege los límites seguros', () => {
      // Un entero inseguro debería dar unparseable
      expect(normalizeAmount(Number.MAX_SAFE_INTEGER + 1, currency)).toEqual({
        ok: false,
        amountMinor: null,
        isNegative: false,
        reason: 'unparseable',
      });
    });
  });

  describe('errores generales', () => {
    it('devuelve unparseable cuando no puede reconocer el importe', () => {
      expect(normalizeAmount('no es un importe', 'EUR')).toEqual({
        ok: false,
        amountMinor: null,
        isNegative: false,
        reason: 'unparseable',
      });
      expect(normalizeAmount(null, 'EUR')).toEqual({
        ok: false,
        amountMinor: null,
        isNegative: false,
        reason: 'unparseable',
      });
      expect(normalizeAmount('', 'EUR')).toEqual({
        ok: false,
        amountMinor: null,
        isNegative: false,
        reason: 'unparseable',
      });
    });
  });
});
