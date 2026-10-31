import { getAppLanguage, i18n } from '@/lib/i18n/i18n';
import { englishDictionary } from '@/lib/i18n/dictionary/en';

/**
 * Traduce un texto visible escrito en español en el código.
 *
 * Los componentes conservan sus textos en español; esta capa los sustituye al
 * pintarse cuando el idioma activo es inglés. Resuelve, por orden:
 *
 * 1. Coincidencia exacta en el diccionario.
 * 2. Patrones con marcadores (`Correo copiado: {{email}}`), cuyos valores
 *    capturados también se traducen si están en el diccionario.
 * 3. Fechas compuestas solo por nombres de días y meses, números y «de».
 *
 * Un texto sin traducción se devuelve tal cual: nunca se rompe la pantalla.
 */

type CompiledPattern = {
  regex: RegExp;
  names: string[];
  english: string;
  literalLength: number;
};

const placeholderPattern = /\{\{(\w+)\}\}/g;
const exact = new Map<string, string>();
const patternsByPrefix = new Map<string, CompiledPattern[]>();
const patternsWithoutPrefix: CompiledPattern[] = [];
const prefixLength = 3;

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

for (const [spanish, english] of Object.entries(englishDictionary)) {
  if (!spanish.includes('{{')) {
    exact.set(spanish, english);
    continue;
  }
  // `split` con grupo alterna texto fijo y nombres de marcador.
  const parts = spanish.split(placeholderPattern);
  const literals = parts.filter((_, index) => index % 2 === 0);
  const names = parts.filter((_, index) => index % 2 === 1);
  // Sin texto fijo suficiente, el patrón encajaría con frases ajenas.
  if (literals.join('').replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ]/g, '').length < 2) {
    continue;
  }
  const regex = new RegExp(
    `^${literals.map(escapeRegex).join('([\\s\\S]+?)')}$`,
  );
  const pattern: CompiledPattern = {
    regex,
    names,
    english,
    literalLength: literals.join('').length,
  };
  const prefix = literals[0]!.slice(0, prefixLength);
  if (prefix.length < prefixLength) patternsWithoutPrefix.push(pattern);
  else {
    const bucket = patternsByPrefix.get(prefix) ?? [];
    bucket.push(pattern);
    patternsByPrefix.set(prefix, bucket);
  }
}
// Los patrones más específicos (más texto fijo) ganan a los genéricos.
const bySpecificity = (a: CompiledPattern, b: CompiledPattern) =>
  b.literalLength - a.literalLength;
patternsWithoutPrefix.sort(bySpecificity);
for (const bucket of patternsByPrefix.values()) bucket.sort(bySpecificity);

const monthNames: Record<string, string> = {
  enero: 'January',
  febrero: 'February',
  marzo: 'March',
  abril: 'April',
  mayo: 'May',
  junio: 'June',
  julio: 'July',
  agosto: 'August',
  septiembre: 'September',
  setiembre: 'September',
  octubre: 'October',
  noviembre: 'November',
  diciembre: 'December',
  ene: 'Jan',
  feb: 'Feb',
  mar: 'Mar',
  abr: 'Apr',
  may: 'May',
  jun: 'Jun',
  jul: 'Jul',
  ago: 'Aug',
  sept: 'Sep',
  sep: 'Sep',
  oct: 'Oct',
  nov: 'Nov',
  dic: 'Dec',
};
const weekdayNames: Record<string, string> = {
  lunes: 'Monday',
  martes: 'Tuesday',
  miércoles: 'Wednesday',
  jueves: 'Thursday',
  viernes: 'Friday',
  sábado: 'Saturday',
  domingo: 'Sunday',
  lun: 'Mon',
  mié: 'Wed',
  jue: 'Thu',
  vie: 'Fri',
  sáb: 'Sat',
  dom: 'Sun',
  hoy: 'Today',
  ayer: 'Yesterday',
  mañana: 'Tomorrow',
};

function matchCase(source: string, translated: string): string {
  const first = source.charAt(0);
  return first === first.toLocaleLowerCase('es-ES') &&
    first !== first.toLocaleUpperCase('es-ES')
    ? translated.charAt(0).toLocaleLowerCase('en-US') + translated.slice(1)
    : translated;
}

/** «lunes, 3 de octubre de 2026» → «Monday, 3 October 2026». */
function translateDate(text: string): string | null {
  const tokens = text.split(/(\s+|,|–|-|\/|\.)/);
  let hasDateWord = false;
  const translated: string[] = [];
  for (const token of tokens) {
    const word = token.toLocaleLowerCase('es-ES');
    if (word === 'de' || word === 'del') continue;
    if (!/[a-záéíóúñ]/i.test(token)) {
      translated.push(token);
      continue;
    }
    const english = monthNames[word] ?? weekdayNames[word];
    if (!english) return null;
    hasDateWord = true;
    translated.push(english);
  }
  if (!hasDateWord) return null;
  return translated
    .join('')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function lookupExact(text: string): string | undefined {
  const direct = exact.get(text);
  if (direct !== undefined) return direct;
  // Textos pasados a minúsculas o capitalizados en el código.
  const capitalized = text.charAt(0).toLocaleUpperCase('es-ES') + text.slice(1);
  const fromCapitalized = exact.get(capitalized);
  if (fromCapitalized !== undefined) return matchCase(text, fromCapitalized);
  return undefined;
}

function matchPattern(
  text: string,
  pattern: CompiledPattern,
  depth: number,
): string | null {
  const match = pattern.regex.exec(text);
  if (!match) return null;
  const values = new Map<string, string>();
  pattern.names.forEach((name, index) => {
    // Los valores capturados pueden ser a su vez textos traducibles.
    const value = match[index + 1] ?? '';
    values.set(name, depth < 2 ? translateCore(value, depth + 1) : value);
  });
  return pattern.english.replace(
    placeholderPattern,
    (_, name: string) => values.get(name) ?? '',
  );
}

/** Las horas se guardan y se muestran como `HH:mm`; en inglés, «8:05 PM». */
function translateTime(text: string): string | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text);
  if (!match) return null;
  const hours = Number(match[1]);
  if (hours > 23) return null;
  const period = hours < 12 ? 'AM' : 'PM';
  return `${hours % 12 || 12}:${match[2]} ${period}`;
}

function translateCore(text: string, depth = 0): string {
  const fromExact = lookupExact(text);
  if (fromExact !== undefined) return fromExact;
  const time = translateTime(text);
  if (time !== null) return time;

  for (const pattern of patternsByPrefix.get(text.slice(0, prefixLength)) ??
    []) {
    const translated = matchPattern(text, pattern, depth);
    if (translated !== null) return translated;
  }
  for (const pattern of patternsWithoutPrefix) {
    const translated = matchPattern(text, pattern, depth);
    if (translated !== null) return translated;
  }
  return translateDate(text) ?? translateSegments(text) ?? text;
}

/** Etiquetas compuestas como «🇪🇸  España · EUR» o «España, EUR». */
function translateSegments(text: string): string | null {
  const segments = text.split(/( · |\s{2,}|, )/);
  if (segments.length < 3) return null;
  let changed = false;
  const translated = segments.map((segment, index) => {
    if (index % 2 === 1) return segment;
    const value = lookupExact(segment) ?? translateDate(segment);
    if (value === null || value === undefined) return segment;
    changed = true;
    return value;
  });
  return changed ? translated.join('') : null;
}

// Los mismos textos se pintan en cada render: se recuerdan las respuestas.
const cache = new Map<string, string>();
const maxCacheSize = 4000;
i18n.on('languageChanged', () => cache.clear());

export function translateText(text: string): string {
  if (
    getAppLanguage() === 'es' ||
    (!/[A-Za-zÁÉÍÓÚáéíóúñÑ]/.test(text) && !/\d:\d\d/.test(text))
  ) {
    return text;
  }
  const cached = cache.get(text);
  if (cached !== undefined) return cached;

  const leading = text.match(/^\s*/)![0];
  const trailing = text.slice(leading.length).match(/\s*$/)![0];
  const core = text.slice(leading.length, text.length - trailing.length);
  const translated = core ? leading + translateCore(core) + trailing : text;

  if (cache.size >= maxCacheSize) cache.clear();
  cache.set(text, translated);
  return translated;
}
