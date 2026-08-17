import {
  isCurrencyCode,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';

/**
 * Catálogo canónico y no vacío de monedas visibles del espacio activo: la
 * moneda del espacio siempre lo encabeza, así que `catalog[0]` existe siempre.
 */
export type VisibleCurrencyCatalog = readonly [CurrencyCode, ...CurrencyCode[]];

type VisibleCurrencyCatalogInput = {
  /**
   * Monedas presentes en los movimientos del espacio activo. Pueden llegar
   * códigos inválidos desde una importación y se descartan.
   */
  movementCurrencies?: readonly string[];
  /** Preferencias personales de monedas, en su orden guardado. */
  preferenceCurrencies?: readonly CurrencyCode[];
  /** Moneda del espacio activo: siempre encabeza el catálogo. */
  spaceCurrency: CurrencyCode;
};

/**
 * Catálogo canónico de monedas visibles del espacio activo. Orden sin
 * duplicados: primero la moneda del espacio, después las preferencias
 * personales en su orden guardado y por último las monedas presentes en los
 * movimientos.
 */
export function buildVisibleCurrencyCatalog({
  movementCurrencies = [],
  preferenceCurrencies = [],
  spaceCurrency,
}: VisibleCurrencyCatalogInput): VisibleCurrencyCatalog {
  const catalog: CurrencyCode[] = [spaceCurrency];
  const appendCurrency = (currency: CurrencyCode) => {
    if (!catalog.includes(currency)) catalog.push(currency);
  };

  preferenceCurrencies.forEach(appendCurrency);
  movementCurrencies.forEach((currency) => {
    if (isCurrencyCode(currency)) appendCurrency(currency);
  });

  // `catalog[0]` siempre es la moneda del espacio; se reconstruye como tupla
  // no vacía sin recurrir a un fallback monetario.
  return [spaceCurrency, ...catalog.slice(1)];
}

/**
 * Elige la divisa visible dentro de un catálogo no vacío: la selección guardada
 * si pertenece al catálogo y, si no existe o dejó de ser válida, la moneda del
 * espacio (primera del catálogo). Nunca sustituye por una divisa ajena al
 * catálogo ni por un fallback monetario.
 */
export function pickVisibleCurrency(
  catalog: VisibleCurrencyCatalog,
  selection: CurrencyCode | null | undefined,
): CurrencyCode {
  return selection && catalog.includes(selection) ? selection : catalog[0];
}

/**
 * Con exactamente dos monedas en el catálogo devuelve la alternativa a la
 * actual (para alternar sin abrir el selector); en cualquier otro caso, null.
 */
export function getNextHomeCurrency(
  catalog: readonly CurrencyCode[],
  current: CurrencyCode,
): CurrencyCode | null {
  if (catalog.length !== 2) return null;
  return catalog.find((code) => code !== current) ?? null;
}
