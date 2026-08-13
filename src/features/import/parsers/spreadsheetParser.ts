import { File } from 'expo-file-system';
import * as XLSX from 'xlsx';

import { findHeaderRowIndex } from '@/features/import/normalization/findHeaderRowIndex';
import type { ParsedSheet } from '@/features/import/types';

export class SpreadsheetParseError extends Error {}

function isBlankRow(row: readonly unknown[]): boolean {
  return row.every(
    (cell) => cell === null || cell === undefined || cell === '',
  );
}

/**
 * Lee un `.xlsx`/`.xls`/`.csv` desde su uri (`file://` o `content://`) y
 * devuelve la primera hoja como una matriz cruda: encabezados detectados +
 * filas sin normalizar. Siempre lee como base64 y deja que SheetJS detecte
 * el formato real de los bytes, en vez de mantener una ruta de texto aparte
 * para CSV (Bible §11: SheetJS Community Edition para XLS/XLSX/CSV).
 */
export async function parseSpreadsheetFile(
  fileUri: string,
): Promise<ParsedSheet> {
  let base64: string;
  try {
    base64 = await new File(fileUri).base64();
  } catch {
    throw new SpreadsheetParseError('No pudimos leer el archivo seleccionado.');
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(base64, { type: 'base64' });
  } catch {
    throw new SpreadsheetParseError(
      'El archivo está dañado o no tiene un formato reconocido.',
    );
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new SpreadsheetParseError('El archivo no contiene ninguna hoja.');
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new SpreadsheetParseError('El archivo no contiene ninguna hoja.');
  }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: false,
  });

  // Un extracto bancario suele traer antes nombre del banco, titular o
  // periodo del extracto: filas no vacías que no son el encabezado real
  // (Bible §12, §35). Buscar primero la fila que realmente reconocemos
  // como encabezado evita tratar esas filas como columnas o, peor, como
  // un movimiento más. Si el archivo no trae ningún encabezado reconocible
  // (por ejemplo, nombres de columna en otro idioma), se conserva el
  // comportamiento anterior: la primera fila no vacía, y el mapeo manual
  // de columnas se encarga del resto.
  const headerRowIndex =
    findHeaderRowIndex(matrix) ?? matrix.findIndex((row) => !isBlankRow(row));
  if (headerRowIndex === -1) {
    throw new SpreadsheetParseError('No encontramos ninguna fila con datos.');
  }

  const headers = (matrix[headerRowIndex] ?? []).map((cell) =>
    cell === null || cell === undefined ? '' : String(cell).trim(),
  );
  const rows = matrix
    .slice(headerRowIndex + 1)
    .filter((row) => !isBlankRow(row));

  return { headers, rows };
}
