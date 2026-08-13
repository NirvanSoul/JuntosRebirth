import {
  currencyCatalog,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import { normalizeSearchText } from '@/lib/text/normalizeSearchText';

export type CountryCatalogEntry = {
  name: string;
  iso2: string;
  currencyCode: CurrencyCode;
};

/**
 * `currencyCatalog.countries` guarda nombres en español, no códigos ISO
 * 3166-1 alfa-2: este mapa es la única fuente de códigos ISO2 de la app y
 * permite calcular la bandera real de cada país (no la de su moneda), ya
 * que varios países comparten moneda pero no bandera.
 */
const countryIso2ByName: Record<string, string> = {
  España: 'ES',
  Alemania: 'DE',
  Francia: 'FR',
  Italia: 'IT',
  Portugal: 'PT',
  'Estados Unidos': 'US',
  'Reino Unido': 'GB',
  Japón: 'JP',
  Suiza: 'CH',
  Canadá: 'CA',
  Australia: 'AU',
  México: 'MX',
  Argentina: 'AR',
  Chile: 'CL',
  Colombia: 'CO',
  Perú: 'PE',
  Uruguay: 'UY',
  Brasil: 'BR',
  Bolivia: 'BO',
  Paraguay: 'PY',
  Venezuela: 'VE',
  'Costa Rica': 'CR',
  Guatemala: 'GT',
  Honduras: 'HN',
  Nicaragua: 'NI',
  Panamá: 'PA',
  'República Dominicana': 'DO',
  China: 'CN',
  India: 'IN',
  Suecia: 'SE',
  Noruega: 'NO',
  Dinamarca: 'DK',
  Polonia: 'PL',
  Turquía: 'TR',
  'Nueva Zelanda': 'NZ',
};

/**
 * «Unión Europea» es una entrada agregada del catálogo de monedas, no un
 * país seleccionable: España, Alemania, Francia, Italia y Portugal ya
 * aparecen listados de forma individual bajo el euro.
 */
const excludedCountryNames = new Set(['Unión Europea']);

function buildCountryCatalog(): readonly CountryCatalogEntry[] {
  const entries: CountryCatalogEntry[] = [];

  for (const currency of currencyCatalog) {
    for (const countryName of currency.countries) {
      if (excludedCountryNames.has(countryName)) continue;

      const iso2 = countryIso2ByName[countryName];
      if (!iso2) {
        throw new Error(
          `País sin código ISO2 registrado en countryIso2ByName: ${countryName}`,
        );
      }

      entries.push({ name: countryName, iso2, currencyCode: currency.code });
    }
  }

  return entries;
}

/** Catálogo de países derivado de `currencyCatalog`, uno por país real. */
export const countryCatalog: readonly CountryCatalogEntry[] =
  buildCountryCatalog();

const regionalIndicatorOffset = 127397; // 🇦 (U+1F1E6) − 'A'.charCodeAt(0)

/**
 * Calcula el emoji de bandera de un país a partir de su código ISO2,
 * combinando dos símbolos indicadores regionales (sin librería ni banderas
 * hardcodeadas por país).
 */
export function getCountryFlag(iso2: string): string {
  return iso2
    .toUpperCase()
    .split('')
    .map((char) =>
      String.fromCodePoint(char.charCodeAt(0) + regionalIndicatorOffset),
    )
    .join('');
}

/** Busca países por nombre, sin distinguir mayúsculas ni acentos. */
export function searchCountryCatalog(
  query: string,
): readonly CountryCatalogEntry[] {
  const normalized = normalizeSearchText(query.trim());
  if (!normalized) return countryCatalog;

  return countryCatalog.filter((entry) =>
    normalizeSearchText(entry.name).includes(normalized),
  );
}
