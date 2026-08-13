import { normalizeDescription } from '@/features/import/normalization/normalizeDescription';

describe('normalizeDescription', () => {
  it('conserva un comercio con dígitos como "7-eleven"', () => {
    const result = normalizeDescription('7-ELEVEN MADRID');
    expect(result.normalizedMerchant).toContain('7-eleven');
  });

  it('elimina dígitos de tarjeta y palabras genéricas', () => {
    const result = normalizeDescription(
      'PAGO TARJETA 1234 MERCADONA 0456 MADRID',
    );
    expect(result.normalizedMerchant).toContain('mercadona');
    expect(result.normalizedMerchant).not.toContain('pago');
    expect(result.normalizedMerchant).not.toContain('tarjeta');
    expect(result.normalizedMerchant).not.toContain('1234');
    expect(result.normalizedMerchant).not.toContain('0456');
  });

  it('elimina referencias técnicas largas', () => {
    const result = normalizeDescription('TRANSFERENCIA REF 000123456789 JUAN');
    expect(result.normalizedMerchant).not.toContain('000123456789');
  });

  it('conserva un título legible para mostrar en la revisión', () => {
    const result = normalizeDescription('  PAGO   TARJETA  MERCADONA  ');
    expect(result.displayTitle).toBe('Pago tarjeta mercadona');
  });

  it('usa un título por defecto cuando la descripción está vacía', () => {
    expect(normalizeDescription('').displayTitle).toBe('Movimiento importado');
  });

  it('ignora mayúsculas y acentos al normalizar', () => {
    const result = normalizeDescription('Peluquería José');
    expect(result.normalizedMerchant).toBe('peluqueria jose');
  });

  it('solo baja a formato legible los textos que llegaron enteramente en mayúsculas', () => {
    expect(normalizeDescription('BIZUM RECIBIDO').displayTitle).toBe(
      'Bizum recibido',
    );
    expect(normalizeDescription('Café de María').displayTitle).toBe(
      'Café de María',
    );
  });
});
