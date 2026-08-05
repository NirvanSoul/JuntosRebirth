import { createDiagonalGradient, lightenHexColor } from '@/theme/gradients';

describe('gradients', () => {
  it('crea un tono más claro preservando el color base', () => {
    expect(createDiagonalGradient('#FFC515')).toEqual(['#FFC515', '#FFD557']);
  });

  it('limita la intensidad y conserva colores no hexadecimales', () => {
    expect(lightenHexColor('#000000', 2)).toBe('#FFFFFF');
    expect(lightenHexColor('transparent')).toBe('transparent');
  });
});
