import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { getCurrencyMinorUnitFactor } from '@/lib/currency/currencyCatalog';
import type { MinorUnitFactor } from '@/lib/currency/currencyCatalogData';

export type CalculatorOperator = 'add' | 'subtract' | 'multiply' | 'divide';

export type PendingOperationStep = {
  valueMinor: number;
  operator: CalculatorOperator;
};

export {
  amountMinorToInput,
  appendAmountKey,
  formatAmountInputForDisplay,
  parseAmountMinor,
  validateCurrencySwitch,
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
