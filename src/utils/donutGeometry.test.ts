import { distributeDonutSegmentLengths } from '@/utils/donutGeometry';

describe('distributeDonutSegmentLengths', () => {
  it('reserva espacio al segmento pequeño y conserva la circunferencia', () => {
    const lengths = distributeDonutSegmentLengths([97, 3], 100, 10);

    expect(lengths[0]).toBeCloseTo(90);
    expect(lengths[1]).toBeCloseTo(10);
    expect(lengths.reduce((total, length) => total + length, 0)).toBeCloseTo(
      100,
    );
  });

  it('mantiene la proporción cuando todos los segmentos tienen espacio', () => {
    expect(distributeDonutSegmentLengths([60, 40], 100, 10)).toEqual([60, 40]);
  });

  it('distribuye de forma segura cuando hay muchos segmentos mínimos', () => {
    const lengths = distributeDonutSegmentLengths([100, 1, 1, 1], 120, 20);

    expect(lengths.slice(1)).toEqual([20, 20, 20]);
    expect(lengths[0]).toBeCloseTo(60);
  });
});
