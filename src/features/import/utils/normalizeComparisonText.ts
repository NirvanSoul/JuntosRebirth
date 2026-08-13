/**
 * Minúsculas y sin diacríticos, para comparar encabezados, descripciones e
 * indicadores de tipo de un archivo bancario sin que acentos o mayúsculas
 * afecten la coincidencia. Único punto de esta normalización dentro de la
 * feature de importación: `normalizeDescription`, `detectColumnMapping`,
 * `findDuplicateCandidates` e `inferTransactionType` la reutilizan en vez de
 * reimplementarla cada uno por su cuenta.
 */
export function normalizeComparisonText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
