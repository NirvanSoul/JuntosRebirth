import { getRowLimitedWidth } from '@/components/layout/RowLimitedScroll/RowLimitedScroll';

describe('getRowLimitedWidth', () => {
  it('mantiene el ancho visible cuando todo cabe en las filas permitidas', () => {
    expect(getRowLimitedWidth([100, 100, 100], 10, 3, 120)).toBe(120);
  });

  it('ensancha el contenido lo justo para no pasar de tres filas', () => {
    // Nueve elementos de 100 con huecos de 10: tres por fila ocupan 320.
    const width = getRowLimitedWidth(Array(9).fill(100), 10, 3, 200);

    expect(width).toBeGreaterThanOrEqual(320);
    expect(width).toBeLessThan(430);
  });
});
