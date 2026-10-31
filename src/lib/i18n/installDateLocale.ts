/**
 * Las fechas se formatean en el código con `Intl.DateTimeFormat('es-ES')`,
 * el idioma de referencia. Este módulo hace que ese locale signifique «el
 * idioma activo de la app»: en inglés salen «October 3, 2026» o «10/03/2026»
 * sin cambiar los componentes.
 *
 * El formateador elige el locale al formatear, no al crearse, porque varios
 * módulos lo construyen una sola vez al cargarse. Se importa primero en
 * `index.ts`, antes que cualquier pantalla.
 */
import { getAppLocale } from '@/lib/i18n/i18n';

const referenceLocale = 'es-ES';
const NativeDateTimeFormat = Intl.DateTimeFormat;
const formatters = new Map<string, Intl.DateTimeFormat>();

function getFormatter(options?: Intl.DateTimeFormatOptions) {
  const locale = getAppLocale();
  const cacheKey = `${locale}|${JSON.stringify(options ?? {})}`;
  let formatter = formatters.get(cacheKey);
  if (!formatter) {
    formatter = new NativeDateTimeFormat(locale, options);
    formatters.set(cacheKey, formatter);
  }
  return formatter;
}

function AppDateTimeFormat(
  locales?: string | readonly string[],
  options?: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  if (locales !== referenceLocale) {
    return new NativeDateTimeFormat(locales as string | string[], options);
  }
  return {
    format: (date?: Date | number) => getFormatter(options).format(date),
    formatToParts: (date?: Date | number) =>
      getFormatter(options).formatToParts(date),
    formatRange: (start: Date, end: Date) =>
      getFormatter(options).formatRange(start, end),
    formatRangeToParts: (start: Date, end: Date) =>
      getFormatter(options).formatRangeToParts(start, end),
    resolvedOptions: () => getFormatter(options).resolvedOptions(),
  } as unknown as Intl.DateTimeFormat;
}

AppDateTimeFormat.supportedLocalesOf = NativeDateTimeFormat.supportedLocalesOf;

Intl.DateTimeFormat =
  AppDateTimeFormat as unknown as typeof Intl.DateTimeFormat;
