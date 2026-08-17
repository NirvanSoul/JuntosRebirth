import type { CurrencyCode } from '@/lib/currency/currencyCatalog';

/**
 * Monedas que un espacio ofrece, en orden de preferencia.
 *
 * Un espacio compartido no tiene una sola moneda: tiene las de todas las
 * personas que lo usan. Si Ana trabaja en VES y Beto en EUR, el espacio juntos
 * debe ofrecer ambas a los dos, o cada uno vería su mitad de los movimientos y
 * la otra le quedaría invisible —que era exactamente el síntoma: entrar a un
 * espacio compartido recién aceptado y encontrarlo vacío.
 *
 * El orden importa porque quien consume esto toma la primera como valor por
 * defecto cuando la persona no ha elegido ninguna:
 *
 * 1. La moneda del espacio, que es donde está el grueso de sus movimientos.
 * 2. Las propias, en el orden en que las eligió.
 * 3. Las de los demás miembros, para poder ver y clasificar lo que registren.
 *
 * No se toca `maxActiveCurrencies`: ese tope limita cuántas monedas gestiona
 * una persona, no cuántas puede tener un espacio compartido entre dos.
 */
export function listSpaceCurrencies(
  spaceCurrency: CurrencyCode,
  ownCurrencies: readonly CurrencyCode[],
  memberCurrencies: readonly (CurrencyCode | null)[] = [],
): readonly CurrencyCode[] {
  const ordered: CurrencyCode[] = [];
  const seen = new Set<CurrencyCode>();

  for (const currency of [
    spaceCurrency,
    ...ownCurrencies,
    ...memberCurrencies,
  ]) {
    if (!currency || seen.has(currency)) continue;
    seen.add(currency);
    ordered.push(currency);
  }

  return ordered;
}
