import { formatCurrency } from '@/lib/currency/formatCurrency';

describe('formatCurrency', () => {
  it('formatea unidades menores sin usar punto flotante como fuente', () => {
    expect(formatCurrency(1050, 'EUR', 'es-ES')).toContain('10,50');
  });

  it('omite por defecto los decimales cuando son cero', () => {
    expect(formatCurrency(1200, 'EUR', 'es-ES')).not.toContain(',00');
  });

  it('agrupa los millares con puntos desde cuatro cifras', () => {
    expect(formatCurrency(100_000, 'EUR', 'es-ES')).toContain('1.000');
    expect(formatCurrency(1_000_000, 'EUR', 'es-ES')).toContain('10.000');
    expect(formatCurrency(10_000_000, 'EUR', 'es-ES')).toContain('100.000');
    expect(formatCurrency(100_000_000, 'EUR', 'es-ES')).toContain('1.000.000');
    expect(formatCurrency(123_456, 'EUR', 'es-ES')).toContain('1.234,56');
  });

  it('rechaza unidades menores no enteras', () => {
    expect(() => formatCurrency(10.5, 'EUR', 'es-ES')).toThrow('entero seguro');
  });

  it('permite conservar los decimales iguales a cero cuando se solicita', () => {
    expect(
      formatCurrency(1200, 'EUR', 'es-ES', { omitZeroDecimals: false }),
    ).toContain('12,00');
  });

  it('coloca el símbolo real de cada moneda en el lado que corresponde', () => {
    expect(formatCurrency(150_000, 'COP', 'es-ES')).toBe('$ 1.500');
    expect(formatCurrency(150_000, 'MXN', 'es-ES')).toBe('$ 1.500');
    expect(formatCurrency(150_000, 'VES', 'es-ES')).toBe('Bs. 1.500');
    expect(formatCurrency(150_000, 'BOB', 'es-ES')).toBe('Bs. 1.500');
    expect(formatCurrency(150_000, 'SEK', 'es-ES')).toBe('1.500 kr');
    expect(formatCurrency(150_000, 'PLN', 'es-ES')).toBe('1.500 zł');
    expect(formatCurrency(150_000, 'EUR', 'es-ES')).toBe('1.500 €');
  });

  it('funciona en runtimes sin Intl.NumberFormat.formatToParts', () => {
    const formatterPrototype = Intl.NumberFormat.prototype as {
      formatToParts?: Intl.NumberFormat['formatToParts'];
    };
    const originalFormatToParts = formatterPrototype.formatToParts;

    Object.defineProperty(formatterPrototype, 'formatToParts', {
      configurable: true,
      value: undefined,
    });

    try {
      expect(formatCurrency(123_456, 'EUR', 'es-ES')).toContain('1.234,56');
    } finally {
      Object.defineProperty(formatterPrototype, 'formatToParts', {
        configurable: true,
        value: originalFormatToParts,
      });
    }
  });
});
