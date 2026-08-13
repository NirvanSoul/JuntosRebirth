import * as XLSX from 'xlsx';

import {
  SpreadsheetParseError,
  parseSpreadsheetFile,
} from '@/features/import/parsers/spreadsheetParser';

const mockBase64 = jest.fn();

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => ({
    base64: () => mockBase64(),
  })),
}));

function buildWorkbookBase64(rows: readonly (readonly unknown[])[]): string {
  const sheet = XLSX.utils.aoa_to_sheet(rows as unknown[][]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
  return XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
}

describe('parseSpreadsheetFile', () => {
  beforeEach(() => {
    mockBase64.mockReset();
  });

  it('extrae encabezados y filas de un workbook ficticio válido', async () => {
    mockBase64.mockResolvedValue(
      buildWorkbookBase64([
        ['Fecha', 'Concepto', 'Importe'],
        ['2026-08-01', 'Supermercado', -32.44],
        ['2026-08-02', 'Nómina', 2000],
      ]),
    );

    const result = await parseSpreadsheetFile('file:///fake.xlsx');

    expect(result.headers).toEqual(['Fecha', 'Concepto', 'Importe']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual(['2026-08-01', 'Supermercado', -32.44]);
  });

  it('detecta la fila de encabezados aunque haya filas vacías antes', async () => {
    mockBase64.mockResolvedValue(
      buildWorkbookBase64([
        [null, null, null],
        ['Fecha', 'Concepto', 'Importe'],
        ['2026-08-01', 'Supermercado', -32.44],
      ]),
    );

    const result = await parseSpreadsheetFile('file:///fake.xlsx');

    expect(result.headers).toEqual(['Fecha', 'Concepto', 'Importe']);
    expect(result.rows).toHaveLength(1);
  });

  it('salta el nombre del banco y del titular antes del encabezado real', async () => {
    mockBase64.mockResolvedValue(
      buildWorkbookBase64([
        ['Banco Ficticio S.A.'],
        ['Titular: Juan Pérez'],
        ['Periodo: 01/08/2026 - 31/08/2026'],
        ['Fecha', 'Concepto', 'Importe'],
        ['2026-08-01', 'Supermercado', -32.44],
        ['2026-08-02', 'Nómina', 2000],
      ]),
    );

    const result = await parseSpreadsheetFile('file:///fake.xlsx');

    expect(result.headers).toEqual(['Fecha', 'Concepto', 'Importe']);
    expect(result.rows).toEqual([
      ['2026-08-01', 'Supermercado', -32.44],
      ['2026-08-02', 'Nómina', 2000],
    ]);
  });

  it('ignora columnas irrelevantes (banco, titular, sucursal) mezcladas con las útiles', async () => {
    mockBase64.mockResolvedValue(
      buildWorkbookBase64([
        [
          'Banco',
          'Titular',
          'Sucursal',
          'Fecha',
          'Concepto',
          'Importe',
          'Referencia',
        ],
        [
          'Ficticio',
          'Juan Pérez',
          '0134',
          '2026-08-01',
          'Supermercado',
          -32.44,
          'REF001',
        ],
      ]),
    );

    const result = await parseSpreadsheetFile('file:///fake.xlsx');

    expect(result.headers).toEqual([
      'Banco',
      'Titular',
      'Sucursal',
      'Fecha',
      'Concepto',
      'Importe',
      'Referencia',
    ]);
    expect(result.rows).toEqual([
      [
        'Ficticio',
        'Juan Pérez',
        '0134',
        '2026-08-01',
        'Supermercado',
        -32.44,
        'REF001',
      ],
    ]);
  });

  it('lanza SpreadsheetParseError si no puede leer el archivo', async () => {
    mockBase64.mockRejectedValue(new Error('boom'));

    await expect(
      parseSpreadsheetFile('file:///fake.xlsx'),
    ).rejects.toBeInstanceOf(SpreadsheetParseError);
  });

  it('lanza SpreadsheetParseError con un archivo sin filas', async () => {
    mockBase64.mockResolvedValue(buildWorkbookBase64([]));

    await expect(
      parseSpreadsheetFile('file:///fake.xlsx'),
    ).rejects.toBeInstanceOf(SpreadsheetParseError);
  });
});
