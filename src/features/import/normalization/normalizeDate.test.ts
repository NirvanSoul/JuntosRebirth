import { normalizeDate } from '@/features/import/normalization/normalizeDate';

describe('normalizeDate', () => {
  it('reconoce una fecha ISO', () => {
    expect(normalizeDate('2026-03-04')).toEqual({
      occurredOn: '2026-03-04',
      ambiguous: false,
    });
  });

  it('reconoce DD/MM/YYYY cuando el día es mayor que 12', () => {
    expect(normalizeDate('25/03/2026')).toEqual({
      occurredOn: '2026-03-25',
      ambiguous: false,
    });
  });

  it('reconoce MM/DD/YYYY cuando el mes sería inválido como día', () => {
    expect(normalizeDate('03/25/2026')).toEqual({
      occurredOn: '2026-03-25',
      ambiguous: false,
    });
  });

  it('resuelve una fecha con ambos componentes válidos usando la preferencia', () => {
    const result = normalizeDate('03/04/2026', 'DMY');
    expect(result.ambiguous).toBe(false);
    expect(result.occurredOn).toBe('2026-04-03');
  });

  it('respeta la preferencia MDY para una fecha ambigua', () => {
    const result = normalizeDate('03/04/2026', 'MDY');
    expect(result.ambiguous).toBe(false);
    expect(result.occurredOn).toBe('2026-03-04');
  });

  it('ignora la hora y cualquier texto posterior a la fecha', () => {
    expect(normalizeDate('15/06/2026 23:59:12')).toEqual({
      occurredOn: '2026-06-15',
      ambiguous: false,
    });
    expect(normalizeDate('2026-06-15T23:59:12Z')).toEqual({
      occurredOn: '2026-06-15',
      ambiguous: false,
    });
  });

  it('convierte un número de serie de Excel', () => {
    // 46000 corresponde al 09/06/2025 en el calendario de Excel (época 1899-12-30).
    expect(normalizeDate(46000)).toEqual({
      occurredOn: '2025-12-09',
      ambiguous: false,
    });
  });

  it('no desplaza al día siguiente un serie de Excel con hora por la tarde', () => {
    // 46000.75 son las 18:00 del mismo día que el serie 46000.
    expect(normalizeDate(46000.75)).toEqual({
      occurredOn: '2025-12-09',
      ambiguous: false,
    });
  });

  it('resuelve un año bisiesto', () => {
    expect(normalizeDate('29/02/2028')).toEqual({
      occurredOn: '2028-02-29',
      ambiguous: false,
    });
  });

  it('rechaza una fecha imposible en un año no bisiesto', () => {
    expect(normalizeDate('29/02/2026').occurredOn).toBeNull();
  });

  it('devuelve null cuando no puede reconocer el formato', () => {
    expect(normalizeDate('no es una fecha').occurredOn).toBeNull();
  });

  it('devuelve null para un valor vacío', () => {
    expect(normalizeDate(null).occurredOn).toBeNull();
    expect(normalizeDate('').occurredOn).toBeNull();
  });

  it('cambia de año correctamente en fechas de fin de diciembre', () => {
    expect(normalizeDate('31/12/2026')).toEqual({
      occurredOn: '2026-12-31',
      ambiguous: false,
    });
  });
});
