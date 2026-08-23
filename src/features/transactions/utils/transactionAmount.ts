import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { getCurrencyMinorUnitFactor } from '@/lib/currency/currencyCatalog';
import {
  convertAmountMinor,
  validateCurrencySwitch,
} from '@/lib/currency/amountInput';
import type { CurrencySwitchReason } from '@/lib/currency/amountInput';

export type CalculatorOperator = 'add' | 'subtract' | 'multiply' | 'divide';

export type PendingOperationStep = {
  valueMinor: number;
  operator: CalculatorOperator;
};

export {
  amountMinorToInput,
  appendAmountKey,
  convertAmountMinor,
  formatAmountInputForDisplay,
  parseAmountMinor,
  validateCurrencySwitch,
} from '@/lib/currency/amountInput';
export type {
  AmountParseReason,
  ConvertAmountMinorResult,
  CurrencySwitchReason,
  CurrencySwitchValidation,
  ParseAmountMinorResult,
} from '@/lib/currency/amountInput';

export type CalculatorOperationResult =
  | { ok: true; valueMinor: number }
  | { ok: false; reason: CurrencySwitchReason };

function unsafeInteger(): CalculatorOperationResult {
  return { ok: false, reason: 'unsafe_integer' };
}

/**
 * Redondeo exacto de una división entera no negativa (mitad hacia arriba,
 * equivalente a Math.round sobre el cociente real) sin perder precisión
 * intermedia: el producto se evalúa con BigInt antes de redondear.
 */
function roundExactDivision(numerator: bigint, denominator: bigint): number {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  const rounded = remainder * 2n >= denominator ? quotient + 1n : quotient;
  return Number(rounded);
}

export function applyCalculatorOperation(
  leftMinor: number,
  rightMinor: number,
  operator: CalculatorOperator,
  currency: CurrencyCode,
): CalculatorOperationResult {
  if (!Number.isSafeInteger(leftMinor) || !Number.isSafeInteger(rightMinor)) {
    return unsafeInteger();
  }
  switch (operator) {
    case 'add': {
      const value = leftMinor + rightMinor;
      return Number.isSafeInteger(value)
        ? { ok: true, valueMinor: value }
        : unsafeInteger();
    }
    case 'subtract': {
      const value = Math.max(0, leftMinor - rightMinor);
      return { ok: true, valueMinor: value };
    }
    case 'multiply': {
      const factor = BigInt(getCurrencyMinorUnitFactor(currency));
      const value = roundExactDivision(
        BigInt(leftMinor) * BigInt(rightMinor),
        factor,
      );
      return Number.isSafeInteger(value)
        ? { ok: true, valueMinor: value }
        : unsafeInteger();
    }
    case 'divide': {
      if (rightMinor === 0) {
        return { ok: true, valueMinor: leftMinor };
      }
      const factor = BigInt(getCurrencyMinorUnitFactor(currency));
      const value = roundExactDivision(
        BigInt(leftMinor) * factor,
        BigInt(rightMinor),
      );
      return Number.isSafeInteger(value)
        ? { ok: true, valueMinor: value }
        : unsafeInteger();
    }
  }
}

/**
 * Evalúa una expresión de calculadora: aplica los operadores pendientes
 * en orden y cierra con el operando actual. Si cualquier paso produce un
 * entero no seguro, falla de forma discriminada sin devolver valores
 * parciales.
 */
export function evaluatePendingOperations(
  pendingOperations: readonly PendingOperationStep[],
  currentAmountMinor: number,
  currency: CurrencyCode,
): CalculatorOperationResult {
  if (pendingOperations.length === 0) {
    if (!Number.isSafeInteger(currentAmountMinor)) {
      return unsafeInteger();
    }
    return { ok: true, valueMinor: currentAmountMinor };
  }

  let accumulator = pendingOperations[0]!.valueMinor;
  for (let index = 1; index < pendingOperations.length; index += 1) {
    const step = applyCalculatorOperation(
      accumulator,
      pendingOperations[index]!.valueMinor,
      pendingOperations[index - 1]!.operator,
      currency,
    );
    if (!step.ok) {
      return step;
    }
    accumulator = step.valueMinor;
  }

  return applyCalculatorOperation(
    accumulator,
    currentAmountMinor,
    pendingOperations[pendingOperations.length - 1]!.operator,
    currency,
  );
}

/** Resultado discriminado de convertir un borrador completo entre monedas. */
export type CurrencySwitchConversion =
  | { ok: true; amountMinor: number; pendingOperations: PendingOperationStep[] }
  | { ok: false; reason: CurrencySwitchReason };

/**
 * Valida y convierte atómicamente un borrador (importe + operaciones
 * pendientes) de una moneda a otra. Si cualquier conversión falla, no
 * devuelve ningún valor parcial.
 */
export function convertCurrencySwitch(
  currentCurrency: CurrencyCode,
  targetCurrency: CurrencyCode,
  amountMinor: number,
  pendingOperations: readonly PendingOperationStep[],
): CurrencySwitchConversion {
  const validation = validateCurrencySwitch(
    currentCurrency,
    targetCurrency,
    amountMinor,
    pendingOperations.map((op) => op.valueMinor),
  );
  if (!validation.ok) {
    return { ok: false, reason: validation.reason };
  }

  const convertedAmount = convertAmountMinor(
    amountMinor,
    currentCurrency,
    targetCurrency,
  );
  if (!convertedAmount.ok) {
    return { ok: false, reason: convertedAmount.reason };
  }

  const convertedOperations: PendingOperationStep[] = [];
  for (const operation of pendingOperations) {
    const converted = convertAmountMinor(
      operation.valueMinor,
      currentCurrency,
      targetCurrency,
    );
    if (!converted.ok) {
      return { ok: false, reason: converted.reason };
    }
    convertedOperations.push({
      valueMinor: converted.amountMinor,
      operator: operation.operator,
    });
  }

  return {
    ok: true,
    amountMinor: convertedAmount.amountMinor,
    pendingOperations: convertedOperations,
  };
}
