import { normalizeComparisonText } from '@/features/import/utils/normalizeComparisonText';

export type NormalizedDescription = {
  rawDescription: string;
  displayTitle: string;
  normalizedMerchant: string;
};

/**
 * Palabras genéricas que no identifican un comercio real (Bible §41): nunca
 * deben aprenderse ni mostrarse como si fueran el nombre del movimiento.
 */
const genericNoiseTokens = new Set([
  'pago',
  'compra',
  'tarjeta',
  'transferencia',
  'traspaso',
  'operacion',
  'movimiento',
  'payment',
  'purchase',
  'card',
  'transfer',
  'pos',
]);

function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * Hace legibles los extractos que llegan completamente en mayúsculas sin
 * tocar nombres que el banco ya entregó con capitalización intencional.
 */
export function toImportDisplayTitle(value: string): string {
  const collapsed = collapseWhitespace(value);
  const lower = collapsed.toLocaleLowerCase('es-ES');
  if (!collapsed || collapsed !== collapsed.toLocaleUpperCase('es-ES')) {
    return collapsed;
  }

  const firstLetterIndex = collapsed.search(/\p{L}/u);
  if (firstLetterIndex < 0) return lower;
  return (
    lower.slice(0, firstLetterIndex) +
    lower[firstLetterIndex]!.toLocaleUpperCase('es-ES') +
    lower.slice(firstLetterIndex + 1)
  );
}

/**
 * Limpia una descripción bancaria cruda en `normalizedMerchant` (para
 * categorización y deduplicado) conservando `displayTitle` legible para la
 * revisión (Bible §32-§33). Nunca elimina todos los dígitos: un token como
 * `7-eleven` sigue siendo un comercio válido, solo se retiran dígitos de
 * tarjeta, fechas embebidas y códigos de referencia claramente técnicos.
 */
export function normalizeDescription(
  rawDescription: string,
): NormalizedDescription {
  const cleanedRaw = collapseWhitespace(rawDescription ?? '');
  const displayTitle =
    toImportDisplayTitle(cleanedRaw) || 'Movimiento importado';

  let working = normalizeComparisonText(cleanedRaw);

  // Ids/referencias técnicas largas (6+ dígitos seguidos).
  working = working.replace(/\b\d{6,}\b/g, ' ');
  // Fechas embebidas inequívocas: dd/mm/aaaa, dd-mm-aa, etc.
  working = working.replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, ' ');
  // Últimos dígitos de tarjeta cuando el patrón es inequívoco.
  working = working.replace(/(tarjeta|card)\s*\*?\d{4}\b/g, '$1');

  const tokens = collapseWhitespace(working)
    .split(' ')
    .filter(
      (token) =>
        token.length > 0 &&
        !genericNoiseTokens.has(token) &&
        // Código de sucursal/referencia: token puramente numérico de 3-6
        // dígitos aislado por espacios (no afecta a "7-eleven": ahí el
        // dígito nunca queda como token independiente).
        !/^\d{3,6}$/.test(token),
    );

  const normalizedMerchant =
    tokens.join(' ').trim() || collapseWhitespace(working);

  return { rawDescription: cleanedRaw, displayTitle, normalizedMerchant };
}
