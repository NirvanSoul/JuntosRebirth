import type { CurrencyCode } from './currencyCatalog';
import { getCurrencyMinorUnitFactor } from './currencyCatalog';
import type { MinorUnitFactor } from './currencyCatalogData';

/**
 * Convierte el texto de entrada (coma decimal) a unidades menores.
 * Nunca lanza durante render: valores no numéricos devuelven 0.
 */
export function parseAmountMinor(
  value: string,
  currency: CurrencyCode,
): number {
  const factor: MinorUnitFactor = getCurrencyMinorUnitFactor(currency);
  if (factor === 1) {
    const whole = Number(value.split(',')[0] ?? '0');
    return Number.isFinite(whole) ? Math.max(0, Math.round(whole)) : 0;
  }
  const [whole = '0', decimals = ''] = value.split(',');
  const normalizedDecimals = `${decimals}00`.slice(0, 2);
  const wholeNum = Number(whole);
  const decNum = Number(normalizedDecimals);
  if (!Number.isFinite(wholeNum) || !Number.isFinite(decNum)) return 0;
  return Math.max(0, Math.round(wholeNum * 100 + decNum));
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
 * Devuelve `null` si el cambio es válido, o un mensaje de error si no.
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
): string | null {
  const currentFactor: MinorUnitFactor =
    getCurrencyMinorUnitFactor(currentCurrency);
  const targetFactor: MinorUnitFactor =
    getCurrencyMinorUnitFactor(targetCurrency);

  // Solo hay restricción al pasar a factor 1 desde factor 100
  if (targetFactor !== 1 || currentFactor !== 100) return null;

  if (amountMinor % 100 !== 0) {
    return 'La moneda elegida no admite decimales. Ajusta el importe antes de cambiar.';
  }
  for (const value of pendingValueMinors) {
    if (value % 100 !== 0) {
      return 'La moneda elegida no admite decimales. Ajusta el importe antes de cambiar.';
    }
  }
  return null;
}
