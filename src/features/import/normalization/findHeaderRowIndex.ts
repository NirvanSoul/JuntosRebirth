import {
  columnMappingHasMinimumRoles,
  detectColumnMapping,
} from '@/features/import/normalization/detectColumnMapping';

const defaultMaxRowsToScan = 20;

/**
 * Localiza la fila de encabezados real entre las primeras filas del
 * archivo, en vez de asumir que es la primera fila no vacía. Los extractos
 * bancarios suelen traer antes nombre del banco, titular, cuenta o el
 * periodo del extracto: filas no vacías pero que no son encabezados.
 *
 * Reutiliza `detectColumnMapping` (comparación exacta contra los alias de
 * columna) en vez de una heurística nueva: una fila cuenta como encabezado
 * solo cuando ya reconocemos en ella fecha + una señal de importe, igual
 * que exige `columnMappingHasMinimumRoles` para poder saltar el mapeo
 * manual. Esto evita falsos positivos: el nombre de un titular o el número
 * de cuenta casi nunca coincide exactamente con un alias como "fecha" o
 * "importe".
 */
export function findHeaderRowIndex(
  rows: readonly (readonly unknown[])[],
  options?: { maxRowsToScan?: number },
): number | null {
  const limit = Math.min(
    rows.length,
    options?.maxRowsToScan ?? defaultMaxRowsToScan,
  );
  for (let index = 0; index < limit; index += 1) {
    const row = rows[index];
    if (!row) continue;
    const headers = row.map((cell) =>
      cell === null || cell === undefined ? '' : String(cell).trim(),
    );
    if (columnMappingHasMinimumRoles(detectColumnMapping(headers))) {
      return index;
    }
  }
  return null;
}
