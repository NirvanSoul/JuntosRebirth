import {
  getCurrencyMinorUnitDigits,
  getCurrencyMinorUnitFactor,
} from '@/lib/currency/currencyCatalog';
import type {
  CurrencyCode,
  MinorUnitFactor,
} from '@/lib/currency/currencyCatalog';

export type NormalizeAmountResult =
  | {
      ok: true;
      amountMinor: number;
      isNegative: boolean;
    }
  | {
      ok: false;
      amountMinor: null;
      isNegative: false;
      reason: 'unparseable' | 'invalid_fraction';
    };

function roundToMinor(value: number, factor: MinorUnitFactor): number {
  return Math.round(value * factor);
}

/**
 * Convierte un importe crudo (número de celda o texto bancario) a unidades
 * menores (enteras). Nunca usa `float` como modelo final (Bible §16):
 * siempre redondea a un entero en la unidad menor de la moneda antes de devolverlo.
 *
 * Soporta separador decimal coma o punto, separador de miles, espacios como
 * separador de miles, símbolos de moneda, paréntesis negativos, guion en
 * cualquier posición (`45,20-`, `-45,20`, `$-45,20`) y sufijo CR/DR
 * (`45.20 DR`), habitual en banca para marcar cargo/abono.
 */
export function normalizeAmount(
  rawValue: string | number | null | undefined,
  currency: CurrencyCode,
): NormalizeAmountResult {
  const digits = getCurrencyMinorUnitDigits(currency);
  const factor = getCurrencyMinorUnitFactor(currency);

  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return {
      ok: false,
      amountMinor: null,
      isNegative: false,
      reason: 'unparseable',
    };
  }

  if (typeof rawValue === 'number') {
    if (!Number.isFinite(rawValue)) {
      return {
        ok: false,
        amountMinor: null,
        isNegative: false,
        reason: 'unparseable',
      };
    }
    const isNegative = rawValue < 0;
    const absValue = Math.abs(rawValue);

    // Rechaza fracciones en monedas sin decimales (factor 1)
    if (digits === 0 && absValue % 1 !== 0) {
      return {
        ok: false,
        amountMinor: null,
        isNegative: false,
        reason: 'invalid_fraction',
      };
    }

    const amountMinor = roundToMinor(absValue, factor);
    if (!Number.isSafeInteger(amountMinor)) {
      return {
        ok: false,
        amountMinor: null,
        isNegative: false,
        reason: 'unparseable',
      };
    }
    return {
      ok: true,
      amountMinor,
      isNegative,
    };
  }

  let text = rawValue.trim();
  if (!text) {
    return {
      ok: false,
      amountMinor: null,
      isNegative: false,
      reason: 'unparseable',
    };
  }

  let isNegative = false;

  const parenMatch = /^\((.*)\)$/.exec(text);
  if (parenMatch) {
    isNegative = true;
    text = parenMatch[1]!.trim();
  }

  // Sufijo CR/DR pegado al importe: señal explícita de abono/cargo, más
  // confiable que buscar un signo suelto (Bible §17).
  const creditDebitSuffixMatch = /\s*(CR|DR)\.?$/i.exec(text);
  if (creditDebitSuffixMatch) {
    isNegative = creditDebitSuffixMatch[1]!.toUpperCase() === 'DR';
    text = text.slice(0, creditDebitSuffixMatch.index).trim();
  }

  // Un guion en cualquier posición (inicio, final, o pegado a un símbolo de
  // moneda como "$-45.20") significa negativo: no basta con mirar solo el
  // principio o el final del texto, porque para entonces ya se perdería un
  // signo intermedio al descartarlo junto con las letras de moneda.
  if (text.includes('-')) {
    isNegative = true;
    text = text.replace(/-/g, '').trim();
  } else if (text.startsWith('+')) {
    text = text.slice(1).trim();
  }

  // Descarta símbolos de moneda y letras; conserva dígitos, separadores y
  // espacios (que a su vez también se descartan a continuación, ya que solo
  // se usan como separador de miles: "1 234,56").
  text = text.replace(/[^\d.,\s]/g, '').replace(/\s+/g, '');
  if (!text) {
    return {
      ok: false,
      amountMinor: null,
      isNegative: false,
      reason: 'unparseable',
    };
  }

  const hasDot = text.includes('.');
  const hasComma = text.includes(',');
  let integerPart: string;
  let fractionPart: string;

  if (hasDot && hasComma) {
    const decimalSeparatorIndex = Math.max(
      text.lastIndexOf('.'),
      text.lastIndexOf(','),
    );
    integerPart = text.slice(0, decimalSeparatorIndex).replace(/[.,]/g, '');
    fractionPart = text.slice(decimalSeparatorIndex + 1).replace(/\D/g, '');
  } else if (hasDot || hasComma) {
    const parts = text.split(hasDot ? '.' : ',');
    const lastPart = parts[parts.length - 1]!;
    if (parts.length === 2 && lastPart.length > 0 && lastPart.length <= 2) {
      integerPart = parts[0]!;
      fractionPart = lastPart;
    } else {
      // Varias ocurrencias, o un único separador con 3 dígitos detrás:
      // separador de miles, importe sin decimales.
      integerPart = parts.join('');
      fractionPart = '';
    }
  } else {
    integerPart = text;
    fractionPart = '';
  }

  if (integerPart === '' && fractionPart === '') {
    return {
      ok: false,
      amountMinor: null,
      isNegative: false,
      reason: 'unparseable',
    };
  }
  if (!/^\d*$/.test(integerPart) || !/^\d*$/.test(fractionPart)) {
    return {
      ok: false,
      amountMinor: null,
      isNegative: false,
      reason: 'unparseable',
    };
  }

  if (digits === 0 && fractionPart !== '') {
    if (Number(fractionPart) > 0) {
      return {
        ok: false,
        amountMinor: null,
        isNegative: false,
        reason: 'invalid_fraction',
      };
    }
  }

  const normalizedFraction = `${fractionPart}00`.slice(0, 2);
  const amountMinor =
    Number(integerPart || '0') * factor +
    (digits === 0 ? 0 : Number(normalizedFraction));

  if (!Number.isSafeInteger(amountMinor)) {
    return {
      ok: false,
      amountMinor: null,
      isNegative: false,
      reason: 'unparseable',
    };
  }

  return { ok: true, amountMinor, isNegative };
}
