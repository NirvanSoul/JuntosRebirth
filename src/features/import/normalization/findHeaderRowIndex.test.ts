import { findHeaderRowIndex } from '@/features/import/normalization/findHeaderRowIndex';

describe('findHeaderRowIndex', () => {
  it('encuentra el encabezado en la primera fila cuando ya lo es', () => {
    expect(
      findHeaderRowIndex([
        ['Fecha', 'Concepto', 'Importe'],
        ['2026-08-01', 'Supermercado', -32.44],
      ]),
    ).toBe(0);
  });

  it('salta el nombre del banco, el titular y filas vacías antes del encabezado', () => {
    const rows = [
      ['Banco Ficticio S.A.'],
      ['Titular: Juan Pérez'],
      ['Cuenta: ES00 0000 0000 0000 0000 0000'],
      [null, null, null],
      ['Fecha', 'Concepto', 'Importe'],
      ['2026-08-01', 'Supermercado', -32.44],
    ];
    expect(findHeaderRowIndex(rows)).toBe(4);
  });

  it('reconoce encabezados con columnas de cargo/abono separadas', () => {
    const rows = [
      ['Extracto de movimientos'],
      ['Fecha', 'Concepto', 'Debit', 'Credit'],
      ['2026-08-01', 'Supermercado', 32.44, null],
    ];
    expect(findHeaderRowIndex(rows)).toBe(1);
  });

  it('devuelve null si ninguna fila entre las primeras coincide con encabezados conocidos', () => {
    const rows = [
      ['Banco Ficticio S.A.'],
      ['Documento generado automáticamente'],
    ];
    expect(findHeaderRowIndex(rows)).toBeNull();
  });

  it('no busca más allá del límite de filas configurado', () => {
    const noise = Array.from({ length: 25 }, () => ['ruido']);
    const rows = [...noise, ['Fecha', 'Concepto', 'Importe']];
    expect(findHeaderRowIndex(rows)).toBeNull();
    expect(findHeaderRowIndex(rows, { maxRowsToScan: 30 })).toBe(25);
  });
});
