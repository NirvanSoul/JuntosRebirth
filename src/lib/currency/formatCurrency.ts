import {
  applyCurrencySymbol,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import { getAppLocale } from '@/lib/i18n/i18n';

export type FormatCurrencyOptions = {
  omitZeroDecimals?: boolean;
  showCurrencySymbol?: boolean;
};

/**
 * El código formatea importes con `'es-ES'`, el locale de referencia: se
 * resuelve aquí al idioma activo para que en inglés salga `1,234.56`.
 */
function resolveDisplayLocale(locale: string): string {
  return locale === 'es-ES' ? getAppLocale() : locale;
}

// Crear un `Intl.NumberFormat` es caro en Hermes y estas funciones se llaman
// por cada fila en cada render: se reutiliza uno por locale y decimales.
const numberFormatters = new Map<string, Intl.NumberFormat>();
const groupingSeparators = new Map<string, string>();

function getNumberFormatter(
  locale: string,
  fractionDigits: number,
): Intl.NumberFormat {
  const key = `${locale}:${fractionDigits}`;
  let formatter = numberFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      useGrouping: true,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    numberFormatters.set(key, formatter);
  }
  return formatter;
}

function getGroupingSeparator(locale: string): string {
  let separator = groupingSeparators.get(locale);
  if (separator === undefined) {
    separator = resolveGroupingSeparator(locale);
    groupingSeparators.set(locale, separator);
  }
  return separator;
}

function resolveGroupingSeparator(locale: string): string {
  const formattedMillion = getNumberFormatter(locale, 0).format(1_000_000);
  const digitIndexes = Array.from(formattedMillion.matchAll(/\d/g), (match) =>
    Number(match.index),
  );
  const firstSeparator =
    digitIndexes.length > 1
      ? formattedMillion.slice(digitIndexes[0]! + 1, digitIndexes[1])
      : '';

  if (firstSeparator) return firstSeparator;
  return locale.toLowerCase().startsWith('es') ? '.' : ',';
}

function enforceGrouping(
  formattedValue: string,
  fractionDigits: number,
  locale: string,
): string {
  const digitMatches = [...formattedValue.matchAll(/\d/g)];
  const integerDigitCount = digitMatches.length - fractionDigits;

  if (digitMatches.length === 0 || integerDigitCount <= 0) {
    return formattedValue;
  }

  const integerDigits = digitMatches
    .slice(0, integerDigitCount)
    .map((match) => match[0]);
  const integerGroups: string[] = [];

  for (let end = integerDigits.length; end > 0; end -= 3) {
    integerGroups.unshift(
      integerDigits.slice(Math.max(0, end - 3), end).join(''),
    );
  }

  const firstDigitIndex = digitMatches[0]!.index!;
  const lastDigitIndex = digitMatches.at(-1)!.index!;
  const groupedInteger = integerGroups.join(getGroupingSeparator(locale));
  const fraction = digitMatches
    .slice(integerDigitCount)
    .map((match) => match[0])
    .join('');
  const decimalSeparator =
    fractionDigits > 0
      ? formattedValue.slice(
          digitMatches[integerDigitCount - 1]!.index! + 1,
          digitMatches[integerDigitCount]!.index,
        )
      : '';

  return `${formattedValue.slice(0, firstDigitIndex)}${groupedInteger}${decimalSeparator}${fraction}${formattedValue.slice(lastDigitIndex + 1)}`;
}

export function formatCurrency(
  amountMinor: number,
  currency: CurrencyCode,
  requestedLocale: string,
  options: FormatCurrencyOptions = {},
): string {
  const locale = resolveDisplayLocale(requestedLocale);
  if (!Number.isSafeInteger(amountMinor)) {
    throw new Error('El importe debe ser un entero seguro en unidades menores');
  }

  const omitZeroDecimals = options.omitZeroDecimals ?? true;
  const omitDecimals = omitZeroDecimals && amountMinor % 100 === 0;
  const fractionDigits = omitDecimals ? 0 : 2;

  const groupedAmount = enforceGrouping(
    getNumberFormatter(locale, fractionDigits).format(amountMinor / 100),
    fractionDigits,
    locale,
  );

  return options.showCurrencySymbol === false
    ? groupedAmount
    : applyCurrencySymbol(currency, groupedAmount);
}

/**
 * Formatea una tasa de cambio para mostrarla, ej. «1 USD = Bs. 52,35».
 *
 * `rate` llega como string, nunca como `float`: es el mismo tipo con el que
 * el backend define sus tasas (ver
 * `Bible/JUNTOSS_VENEZUELA_CURRENCY_PLAN.md`), para no perder precisión al pasar por un
 * `number` de JS antes de esta función.
 */
export function formatExchangeRate(
  rate: string,
  baseCurrency: CurrencyCode,
  quoteCurrency: CurrencyCode,
  requestedLocale: string,
  options: Pick<FormatCurrencyOptions, 'showCurrencySymbol'> = {},
): string {
  const locale = resolveDisplayLocale(requestedLocale);
  const rateValue = Number(rate);
  if (!Number.isFinite(rateValue)) {
    throw new Error('La tasa debe ser un número válido');
  }

  const groupedRate = enforceGrouping(
    getNumberFormatter(locale, 2).format(rateValue),
    2,
    locale,
  );

  if (options.showCurrencySymbol === false) return groupedRate;

  return `1 ${baseCurrency} = ${applyCurrencySymbol(quoteCurrency, groupedRate)}`;
}
