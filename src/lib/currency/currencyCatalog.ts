type CurrencySymbolPosition = 'before' | 'after';

type CurrencyCatalogEntry = {
  code: string;
  name: string;
  pluralName: string;
  /** Símbolo tal como lo usa el país de origen de la moneda, no un código
   * inventado para desambiguar: por ejemplo, el peso colombiano usa «$», no
   * «CO$», igual que el dólar estadounidense o el mexicano. */
  symbol: string;
  /** Lado del importe donde ese país coloca el símbolo. */
  symbolPosition: CurrencySymbolPosition;
  /** Emoji de la bandera del país o unión representativa de la moneda. */
  flag: string;
  /** Países donde se usa la moneda, para poder buscarla por país. */
  countries: readonly string[];
};

/**
 * Catálogo curado de monedas admitidas. Cubre las divisas más usadas a nivel
 * global y las de los países hispanohablantes, evitando mantener el listado
 * completo ISO 4217 que la aplicación todavía no necesita.
 *
 * Los símbolos y su posición reproducen el uso real de cada país (por
 * ejemplo, «Bs.» para el bolívar venezolano y el boliviano, o «$» a la
 * izquierda del importe para el peso colombiano, mexicano, argentino,
 * chileno, uruguayo, canadiense, australiano y neozelandés), en vez de
 * variantes desambiguadas como «CO$» o «MX$» que esos países no usan. El
 * código ISO junto al nombre y la bandera siguen distinguiendo cada moneda
 * cuando dos comparten símbolo.
 */
export const currencyCatalog = [
  {
    code: 'EUR',
    name: 'Euro',
    pluralName: 'euros',
    symbol: '€',
    symbolPosition: 'after',
    flag: '🇪🇺',
    countries: [
      'Unión Europea',
      'España',
      'Alemania',
      'Francia',
      'Italia',
      'Portugal',
    ],
  },
  {
    code: 'USD',
    name: 'Dólar estadounidense',
    pluralName: 'dólares estadounidenses',
    symbol: '$',
    symbolPosition: 'before',
    flag: '🇺🇸',
    countries: ['Estados Unidos'],
  },
  {
    code: 'GBP',
    name: 'Libra esterlina',
    pluralName: 'libras esterlinas',
    symbol: '£',
    symbolPosition: 'before',
    flag: '🇬🇧',
    countries: ['Reino Unido'],
  },
  {
    code: 'JPY',
    name: 'Yen japonés',
    pluralName: 'yenes',
    symbol: '¥',
    symbolPosition: 'before',
    flag: '🇯🇵',
    countries: ['Japón'],
  },
  {
    code: 'CHF',
    name: 'Franco suizo',
    pluralName: 'francos suizos',
    symbol: 'CHF',
    symbolPosition: 'before',
    flag: '🇨🇭',
    countries: ['Suiza'],
  },
  {
    code: 'CAD',
    name: 'Dólar canadiense',
    pluralName: 'dólares canadienses',
    symbol: '$',
    symbolPosition: 'before',
    flag: '🇨🇦',
    countries: ['Canadá'],
  },
  {
    code: 'AUD',
    name: 'Dólar australiano',
    pluralName: 'dólares australianos',
    symbol: '$',
    symbolPosition: 'before',
    flag: '🇦🇺',
    countries: ['Australia'],
  },
  {
    code: 'MXN',
    name: 'Peso mexicano',
    pluralName: 'pesos mexicanos',
    symbol: '$',
    symbolPosition: 'before',
    flag: '🇲🇽',
    countries: ['México'],
  },
  {
    code: 'ARS',
    name: 'Peso argentino',
    pluralName: 'pesos argentinos',
    symbol: '$',
    symbolPosition: 'before',
    flag: '🇦🇷',
    countries: ['Argentina'],
  },
  {
    code: 'CLP',
    name: 'Peso chileno',
    pluralName: 'pesos chilenos',
    symbol: '$',
    symbolPosition: 'before',
    flag: '🇨🇱',
    countries: ['Chile'],
  },
  {
    code: 'COP',
    name: 'Peso colombiano',
    pluralName: 'pesos colombianos',
    symbol: '$',
    symbolPosition: 'before',
    flag: '🇨🇴',
    countries: ['Colombia'],
  },
  {
    code: 'PEN',
    name: 'Sol peruano',
    pluralName: 'soles peruanos',
    symbol: 'S/',
    symbolPosition: 'before',
    flag: '🇵🇪',
    countries: ['Perú'],
  },
  {
    code: 'UYU',
    name: 'Peso uruguayo',
    pluralName: 'pesos uruguayos',
    symbol: '$',
    symbolPosition: 'before',
    flag: '🇺🇾',
    countries: ['Uruguay'],
  },
  {
    code: 'BRL',
    name: 'Real brasileño',
    pluralName: 'reales brasileños',
    symbol: 'R$',
    symbolPosition: 'before',
    flag: '🇧🇷',
    countries: ['Brasil'],
  },
  {
    code: 'BOB',
    name: 'Boliviano',
    pluralName: 'bolivianos',
    symbol: 'Bs.',
    symbolPosition: 'before',
    flag: '🇧🇴',
    countries: ['Bolivia'],
  },
  {
    code: 'PYG',
    name: 'Guaraní paraguayo',
    pluralName: 'guaraníes paraguayos',
    symbol: 'Gs.',
    symbolPosition: 'before',
    flag: '🇵🇾',
    countries: ['Paraguay'],
  },
  {
    code: 'VES',
    name: 'Bolívar venezolano',
    pluralName: 'bolívares venezolanos',
    symbol: 'Bs.',
    symbolPosition: 'before',
    flag: '🇻🇪',
    countries: ['Venezuela'],
  },
  {
    code: 'CRC',
    name: 'Colón costarricense',
    pluralName: 'colones costarricenses',
    symbol: '₡',
    symbolPosition: 'before',
    flag: '🇨🇷',
    countries: ['Costa Rica'],
  },
  {
    code: 'GTQ',
    name: 'Quetzal guatemalteco',
    pluralName: 'quetzales guatemaltecos',
    symbol: 'Q',
    symbolPosition: 'before',
    flag: '🇬🇹',
    countries: ['Guatemala'],
  },
  {
    code: 'HNL',
    name: 'Lempira hondureño',
    pluralName: 'lempiras hondureños',
    symbol: 'L',
    symbolPosition: 'before',
    flag: '🇭🇳',
    countries: ['Honduras'],
  },
  {
    code: 'NIO',
    name: 'Córdoba nicaragüense',
    pluralName: 'córdobas nicaragüenses',
    symbol: 'C$',
    symbolPosition: 'before',
    flag: '🇳🇮',
    countries: ['Nicaragua'],
  },
  {
    code: 'PAB',
    name: 'Balboa panameño',
    pluralName: 'balboas panameños',
    symbol: 'B/.',
    symbolPosition: 'before',
    flag: '🇵🇦',
    countries: ['Panamá'],
  },
  {
    code: 'DOP',
    name: 'Peso dominicano',
    pluralName: 'pesos dominicanos',
    symbol: 'RD$',
    symbolPosition: 'before',
    flag: '🇩🇴',
    countries: ['República Dominicana'],
  },
  {
    code: 'CNY',
    name: 'Yuan chino',
    pluralName: 'yuanes chinos',
    symbol: '¥',
    symbolPosition: 'before',
    flag: '🇨🇳',
    countries: ['China'],
  },
  {
    code: 'INR',
    name: 'Rupia india',
    pluralName: 'rupias indias',
    symbol: '₹',
    symbolPosition: 'before',
    flag: '🇮🇳',
    countries: ['India'],
  },
  {
    code: 'SEK',
    name: 'Corona sueca',
    pluralName: 'coronas suecas',
    symbol: 'kr',
    symbolPosition: 'after',
    flag: '🇸🇪',
    countries: ['Suecia'],
  },
  {
    code: 'NOK',
    name: 'Corona noruega',
    pluralName: 'coronas noruegas',
    symbol: 'kr',
    symbolPosition: 'after',
    flag: '🇳🇴',
    countries: ['Noruega'],
  },
  {
    code: 'DKK',
    name: 'Corona danesa',
    pluralName: 'coronas danesas',
    symbol: 'kr.',
    symbolPosition: 'after',
    flag: '🇩🇰',
    countries: ['Dinamarca'],
  },
  {
    code: 'PLN',
    name: 'Zloty polaco',
    pluralName: 'zlotys polacos',
    symbol: 'zł',
    symbolPosition: 'after',
    flag: '🇵🇱',
    countries: ['Polonia'],
  },
  {
    code: 'TRY',
    name: 'Lira turca',
    pluralName: 'liras turcas',
    symbol: '₺',
    symbolPosition: 'before',
    flag: '🇹🇷',
    countries: ['Turquía'],
  },
  {
    code: 'NZD',
    name: 'Dólar neozelandés',
    pluralName: 'dólares neozelandeses',
    symbol: '$',
    symbolPosition: 'before',
    flag: '🇳🇿',
    countries: ['Nueva Zelanda'],
  },
] as const satisfies readonly CurrencyCatalogEntry[];

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

/**
 * Coloca el símbolo de la moneda junto a un importe ya formateado, en el
 * lado que corresponde a su uso real (antes o después), separado por un
 * espacio.
 */
export function applyCurrencySymbol(
  code: CurrencyCode,
  formattedAmount: string,
): string {
  const entry = getCatalogEntry(code);

  return entry.symbolPosition === 'before'
    ? `${entry.symbol} ${formattedAmount}`
    : `${formattedAmount} ${entry.symbol}`;
}

/** Minúsculas y sin diacríticos, para comparar sin importar acentos. */
function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
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
