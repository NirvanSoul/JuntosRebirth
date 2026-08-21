import type { CurrencyCode, MinorUnitFactor } from './currencyCatalog';
import { getCurrencyMinorUnitFactor } from './currencyCatalog';

/** Motivo por el que un texto de importe no es parseable. */
export type AmountParseReason =
  'invalid_format' | 'invalid_fraction_for_currency';

/** Resultado discriminado de parsear un importe de entrada. */
export type ParseAmountMinorResult =
  | { ok: true; amountMinor: number }
  | { ok: false; amountMinor: null; reason: AmountParseReason };

/** Motivo por el que un cambio de moneda o una conversión de escala falla. */
export type CurrencySwitchReason = 'fraction_not_allowed' | 'unsafe_integer';

/** Resultado discriminado de validar un cambio de moneda. */
export type CurrencySwitchValidation =
  { ok: true } | { ok: false; reason: CurrencySwitchReason };

/** Resultado discriminado de convertir un importe entre escalas. */
export type ConvertAmountMinorResult =
  | { ok: true; amountMinor: number }
  | { ok: false; amountMinor: null; reason: CurrencySwitchReason };

function parseWholePart(raw: string): number | null {
  if (raw === '') return 0;
  if (!/^\d+$/.test(raw)) return null;
  return Number(raw);
}

/**
 * Convierte el texto de entrada (coma decimal) a unidades menores.
 * Nunca lanza durante render. Devuelve un resultado discriminado: un
 * importe con fracciones en una moneda de factor 1 es un error, no un
 * truncamiento silencioso.
 */
export function parseAmountMinor(
  value: string,
  currency: CurrencyCode,
): ParseAmountMinorResult {
  const factor: MinorUnitFactor = getCurrencyMinorUnitFactor(currency);
  const parts = value.split(',');

  if (parts.length > 2) {
    return { ok: false, amountMinor: null, reason: 'invalid_format' };
  }

  const wholeRaw = parts[0] ?? '';
  const decimalsRaw = parts[1] ?? '';

  if (factor === 1) {
    if (parts.length === 2) {
      return {
        ok: false,
        amountMinor: null,
        reason: 'invalid_fraction_for_currency',
      };
    }
    const whole = parseWholePart(wholeRaw);
    if (whole === null) {
      return { ok: false, amountMinor: null, reason: 'invalid_format' };
    }
    return { ok: true, amountMinor: whole };
  }

  const whole = parseWholePart(wholeRaw);
  if (whole === null) {
    return { ok: false, amountMinor: null, reason: 'invalid_format' };
  }

  let decimals = 0;
  if (decimalsRaw !== '') {
    if (!/^\d+$/.test(decimalsRaw)) {
      return { ok: false, amountMinor: null, reason: 'invalid_format' };
    }
    decimals = Number(`${decimalsRaw}00`.slice(0, 2));
  }

  return { ok: true, amountMinor: whole * 100 + decimals };
}

/**
 * Convierte unidades menores al texto de entrada (coma decimal).
 */
export function amountMinorToInput(
  amountMinor: number,
  currency: CurrencyCode,
): string {
  const factor: MinorUnitFactor = getCurrencyMinorUnitFactor(currency);
  const safeAmount = Math.max(0, Math.round(amountMinor));
  if (factor === 1) {
    return String(safeAmount);
  }
  const whole = Math.floor(safeAmount / 100);
  const decimals = safeAmount % 100;
  return decimals === 0
    ? String(whole)
    : `${whole},${String(decimals).padStart(2, '0').replace(/0$/, '')}`;
}

/**
 * Agrupa visualmente los millares con puntos. No conoce la moneda:
 * solo formatea el texto existente sin truncar fracciones.
 */
export function formatAmountInputForDisplay(value: string): string {
  const [whole = '0', decimals] = value.split(',');
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  if (decimals === undefined) return groupedWhole;

  return `${groupedWhole},${decimals || '0'}`;
}

/**
 * Añade una tecla al texto de entrada. Para monedas con factor 1
 * (JPY, CLP, PYG) la coma se ignora: no admiten fracciones.
 */
export function appendAmountKey(
  value: string,
  key: string,
  currency: CurrencyCode,
): string {
  const factor: MinorUnitFactor = getCurrencyMinorUnitFactor(currency);

  if (key === ',') {
    if (factor === 1) return value;
    return value.includes(',') ? value : `${value},`;
  }

  const [, decimals = ''] = value.split(',');
  if (value.includes(',') && decimals.length >= 2) return value;
  if (value === '0') return key;

  return `${value}${key}`;
}

/**
 * Valida si un cambio de moneda es permitido dado el borrador actual.
 * Devuelve un código discriminado: la UI traduce el código al mensaje.
 *
 * Regla: cambiar a una moneda de factor 1 (sin decimales) con un importe
 * que tenga fracciones bloquea el cambio. Aplica al importe en curso y a
 * las operaciones pendientes de la calculadora.
 */
export function validateCurrencySwitch(
  currentCurrency: CurrencyCode,
  targetCurrency: CurrencyCode,
  amountMinor: number,
  pendingValueMinors: readonly number[],
): CurrencySwitchValidation {
  const currentFactor: MinorUnitFactor =
    getCurrencyMinorUnitFactor(currentCurrency);
  const targetFactor: MinorUnitFactor =
    getCurrencyMinorUnitFactor(targetCurrency);

  // Solo hay restricción al pasar a factor 1 desde factor 100
  if (targetFactor !== 1 || currentFactor !== 100) {
    return { ok: true };
  }

  if (amountMinor % 100 !== 0) {
    return { ok: false, reason: 'fraction_not_allowed' };
  }
  for (const value of pendingValueMinors) {
    if (value % 100 !== 0) {
      return { ok: false, reason: 'fraction_not_allowed' };
    }
  }
  return { ok: true };
}

/**
 * Convierte un importe en unidades menores entre dos escalas de moneda.
 *
 * - factor 100 → 1: divide entre 100 solo si es exacto;
 * - factor 1 → 100: multiplica por 100 comprobando Number.isSafeInteger;
 * - mismo factor: conserva.
 */
export function convertAmountMinor(
  amountMinor: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
): ConvertAmountMinorResult {
  const fromFactor: MinorUnitFactor = getCurrencyMinorUnitFactor(fromCurrency);
  const toFactor: MinorUnitFactor = getCurrencyMinorUnitFactor(toCurrency);

  if (fromFactor === toFactor) {
    return { ok: true, amountMinor };
  }

  if (fromFactor === 100 && toFactor === 1) {
    if (amountMinor % 100 !== 0) {
      return { ok: false, amountMinor: null, reason: 'fraction_not_allowed' };
    }
    return { ok: true, amountMinor: amountMinor / 100 };
  }

  const converted = amountMinor * 100;
  if (!Number.isSafeInteger(converted)) {
    return { ok: false, amountMinor: null, reason: 'unsafe_integer' };
  }
  return { ok: true, amountMinor: converted };
}
