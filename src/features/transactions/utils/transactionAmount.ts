export type CalculatorOperator = 'add' | 'subtract' | 'multiply' | 'divide';

export {
  amountMinorToInput,
  appendAmountKey,
  formatAmountInputForDisplay,
  parseAmountMinor,
} from '@/lib/currency/amountInput';

export function applyCalculatorOperation(
  leftMinor: number,
  rightMinor: number,
  operator: CalculatorOperator,
): number {
  switch (operator) {
    case 'add':
      return leftMinor + rightMinor;
    case 'subtract':
      return Math.max(0, leftMinor - rightMinor);
    case 'multiply':
      return Math.round((leftMinor * rightMinor) / 100);
    case 'divide':
      return rightMinor === 0
        ? leftMinor
        : Math.round((leftMinor * 100) / rightMinor);
  }
}
