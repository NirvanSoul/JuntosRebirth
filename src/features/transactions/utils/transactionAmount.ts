import type {
  CurrencyCode,
  MinorUnitFactor,
} from '@/lib/currency/currencyCatalog';
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

export function applyCalculatorOperation(
  leftMinor: number,
  rightMinor: number,
  operator: CalculatorOperator,
  currency: CurrencyCode,
): number {
  const factor: MinorUnitFactor = getCurrencyMinorUnitFactor(currency);
  switch (operator) {
    case 'add':
      return leftMinor + rightMinor;
    case 'subtract':
      return Math.max(0, leftMinor - rightMinor);
    case 'multiply':
      return Math.round((leftMinor * rightMinor) / factor);
    case 'divide':
      return rightMinor === 0
        ? leftMinor
        : Math.round((leftMinor * factor) / rightMinor);
  }
}

/**
 * Evalúa una expresión de calculadora: aplica los operadores pendientes
 * en orden y cierra con el operando actual.
 */
export function evaluatePendingOperations(
  pendingOperations: readonly PendingOperationStep[],
  currentAmountMinor: number,
  currency: CurrencyCode,
): number {
  if (pendingOperations.length === 0) {
    return currentAmountMinor;
  }

  let accumulator = pendingOperations[0]!.valueMinor;
  for (let index = 1; index < pendingOperations.length; index += 1) {
    accumulator = applyCalculatorOperation(
      accumulator,
      pendingOperations[index]!.valueMinor,
      pendingOperations[index - 1]!.operator,
      currency,
    );
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
