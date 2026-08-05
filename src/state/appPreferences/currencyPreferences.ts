import {
  defaultCurrencyCode,
  maxActiveCurrencies,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';

export type CurrencyPreferences = {
  /** Monedas activas del usuario, en orden de elección. La primera es la
   * moneda por defecto para movimientos nuevos. Entre 1 y `maxActiveCurrencies`. */
  currencies: readonly CurrencyCode[];
};

export const defaultCurrencyPreferences: CurrencyPreferences = {
  currencies: [defaultCurrencyCode],
};

/**
 * Aplica las reglas del catálogo activo: sin duplicados, como máximo
 * `maxActiveCurrencies` monedas y siempre al menos una.
 */
export function normalizeCurrencyPreferences(
  input: CurrencyPreferences,
): CurrencyPreferences {
  const seen = new Set<CurrencyCode>();
  const currencies: CurrencyCode[] = [];

  for (const code of input.currencies) {
    if (seen.has(code)) continue;
    if (currencies.length >= maxActiveCurrencies) break;
    seen.add(code);
    currencies.push(code);
  }

  return {
    currencies: currencies.length > 0 ? currencies : [defaultCurrencyCode],
  };
}
