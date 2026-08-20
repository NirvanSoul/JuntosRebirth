import { normalizeSearchText } from '@/lib/text/normalizeSearchText';
import {
  CurrencyCatalogEntry,
  CurrencySymbolPosition,
  MinorUnitDigits,
  MinorUnitFactor,
  currencyCatalog,
} from './currencyCatalogData';

export type { MinorUnitDigits, MinorUnitFactor };
export { currencyCatalog };

export type CurrencyCode = (typeof currencyCatalog)[number]['code'];

export const defaultCurrencyCode: CurrencyCode = 'EUR';

/** Número máximo de monedas que un usuario puede activar a la vez. */
export const maxActiveCurrencies = 3;

const catalogByCode: ReadonlyMap<string, CurrencyCatalogEntry> = new Map(
  currencyCatalog.map((entry) => [entry.code, entry]),
);

export function isCurrencyCode(value: string): value is CurrencyCode {
  return catalogByCode.has(value);
}

function getCatalogEntry(code: CurrencyCode): CurrencyCatalogEntry {
  const entry = catalogByCode.get(code);
  if (!entry) {
    throw new Error(`Moneda no reconocida: ${code}`);
  }
  return entry;
}

export function getCurrencyName(code: CurrencyCode): string {
  return getCatalogEntry(code).name;
}

export function getCurrencyPluralName(code: CurrencyCode): string {
  return getCatalogEntry(code).pluralName;
}

export function getCurrencySymbol(code: CurrencyCode): string {
  return getCatalogEntry(code).symbol;
}

export function getCurrencySymbolPosition(
  code: CurrencyCode,
): CurrencySymbolPosition {
  return getCatalogEntry(code).symbolPosition;
}

export function getCurrencyFlag(code: CurrencyCode): string {
  return getCatalogEntry(code).flag;
}

export function getCurrencyMinorUnitDigits(
  code: CurrencyCode,
): MinorUnitDigits {
  return getCatalogEntry(code).minorUnitDigits;
}

export function getCurrencyMinorUnitFactor(
  code: CurrencyCode,
): MinorUnitFactor {
  const digits = getCurrencyMinorUnitDigits(code);
  return digits === 0 ? 1 : 100;
}

/**
 * Coloca el símbolo de la moneda junto a un importe ya formateado, en el
 * lado que corresponde a su uso real (antes o después), separado por un
 * espacio irrompible (NBSP) para que el símbolo nunca quede huérfano al
 * final de una línea.
 */
export function applyCurrencySymbol(
  code: CurrencyCode,
  formattedAmount: string,
): string {
  const entry = getCatalogEntry(code);
  const nbsp = ' ';

  return entry.symbolPosition === 'before'
    ? `${entry.symbol}${nbsp}${formattedAmount}`
    : `${formattedAmount}${nbsp}${entry.symbol}`;
}

/**
 * Busca en el catálogo por país, nombre de la moneda o su código, sin
 * distinguir mayúsculas ni acentos (por ejemplo, «mexico», «México» y «MXN»
 * encuentran la misma moneda).
 */
export function searchCurrencyCatalog(
  query: string,
): readonly (typeof currencyCatalog)[number][] {
  const normalized = normalizeSearchText(query.trim());
  if (!normalized) return currencyCatalog;

  return currencyCatalog.filter(
    (entry) =>
      normalizeSearchText(entry.name).includes(normalized) ||
      normalizeSearchText(entry.code).includes(normalized) ||
      entry.countries.some((country) =>
        normalizeSearchText(country).includes(normalized),
      ),
  );
}
