import {
  applyCurrencySymbol,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';

type FormatCurrencyOptions = {
  omitZeroDecimals?: boolean;
};

function getGroupingSeparator(locale: string): string {
  const formattedMillion = new Intl.NumberFormat(locale, {
    useGrouping: true,
  }).format(1_000_000);
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
  locale: string,
  options: FormatCurrencyOptions = {},
): string {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new Error('El importe debe ser un entero seguro en unidades menores');
  }

  const omitZeroDecimals = options.omitZeroDecimals ?? true;
  const omitDecimals = omitZeroDecimals && amountMinor % 100 === 0;
  const fractionDigits = omitDecimals ? 0 : 2;

  const formatter = new Intl.NumberFormat(locale, {
    useGrouping: true,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

  const groupedAmount = enforceGrouping(
    formatter.format(amountMinor / 100),
    fractionDigits,
    locale,
  );

  return applyCurrencySymbol(currency, groupedAmount);
}
