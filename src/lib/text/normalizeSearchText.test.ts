import { normalizeSearchText } from '@/lib/text/normalizeSearchText';

describe('normalizeSearchText', () => {
  it('pasa a minúsculas', () => {
    expect(normalizeSearchText('MÉXICO')).toBe('mexico');
  });

  it('quita acentos y diéresis', () => {
    expect(normalizeSearchText('México')).toBe('mexico');
    expect(normalizeSearchText('Alemania')).toBe('alemania');
    expect(normalizeSearchText('Bolívar venezolano')).toBe(
      'bolivar venezolano',
    );
  });

  it('deja intacto un texto ya sin acentos', () => {
    expect(normalizeSearchText('usd')).toBe('usd');
  });
});
