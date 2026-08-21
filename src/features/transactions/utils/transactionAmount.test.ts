import {
  amountMinorToInput,
  appendAmountKey,
  applyCalculatorOperation,
  evaluatePendingOperations,
  formatAmountInputForDisplay,
  parseAmountMinor,
  validateCurrencySwitch,
} from '@/features/transactions/utils/transactionAmount';

describe('transactionAmount', () => {
  describe('factor 100 (EUR)', () => {
    it('convierte la entrada decimal a unidades menores sin float como fuente', () => {
      expect(parseAmountMinor('10,50', 'EUR')).toBe(1050);
      expect(parseAmountMinor('1000', 'EUR')).toBe(100000);
      expect(parseAmountMinor('0', 'EUR')).toBe(0);
      expect(parseAmountMinor('', 'EUR')).toBe(0);
    });

    it('convierte unidades menores a texto de entrada', () => {
      expect(amountMinorToInput(1050, 'EUR')).toBe('10,5');
      expect(amountMinorToInput(100000, 'EUR')).toBe('1000');
      expect(amountMinorToInput(0, 'EUR')).toBe('0');
    });

    it('limita la entrada a dos decimales', () => {
      expect(appendAmountKey('10,50', '4', 'EUR')).toBe('10,50');
      expect(appendAmountKey('0', '7', 'EUR')).toBe('7');
      expect(appendAmountKey('10', ',', 'EUR')).toBe('10,');
      expect(appendAmountKey('10,', '5', 'EUR')).toBe('10,5');
    });

    it('calcula operaciones con factor 100', () => {
      expect(applyCalculatorOperation(1000, 250, 'add', 'EUR')).toBe(1250);
      expect(applyCalculatorOperation(1000, 250, 'subtract', 'EUR')).toBe(750);
      expect(applyCalculatorOperation(1000, 200, 'multiply', 'EUR')).toBe(2000);
      expect(applyCalculatorOperation(1000, 200, 'divide', 'EUR')).toBe(500);
      expect(applyCalculatorOperation(1000, 0, 'divide', 'EUR')).toBe(1000);
    });
  });

  describe('factor 1 (JPY)', () => {
    it('convierte la entrada entera a unidades menores', () => {
      expect(parseAmountMinor('1000', 'JPY')).toBe(1000);
      expect(parseAmountMinor('50', 'JPY')).toBe(50);
      expect(parseAmountMinor('0', 'JPY')).toBe(0);
      expect(parseAmountMinor('', 'JPY')).toBe(0);
    });

    it('convierte unidades menores a texto sin decimales', () => {
      expect(amountMinorToInput(1000, 'JPY')).toBe('1000');
      expect(amountMinorToInput(50, 'JPY')).toBe('50');
      expect(amountMinorToInput(0, 'JPY')).toBe('0');
    });

    it('ignora la coma al teclear', () => {
      expect(appendAmountKey('100', ',', 'JPY')).toBe('100');
      expect(appendAmountKey('0', ',', 'JPY')).toBe('0');
      expect(appendAmountKey('100', '5', 'JPY')).toBe('1005');
    });

    it('calcula operaciones con factor 1', () => {
      expect(applyCalculatorOperation(1000, 500, 'add', 'JPY')).toBe(1500);
      expect(applyCalculatorOperation(1000, 500, 'subtract', 'JPY')).toBe(500);
      expect(applyCalculatorOperation(1000, 3, 'multiply', 'JPY')).toBe(3000);
      expect(applyCalculatorOperation(1000, 4, 'divide', 'JPY')).toBe(250);
      expect(applyCalculatorOperation(1000, 0, 'divide', 'JPY')).toBe(1000);
    });
  });

  describe('formatAmountInputForDisplay', () => {
    it('agrupa visualmente los millares y conserva la coma decimal', () => {
      expect(formatAmountInputForDisplay('1000')).toBe('1.000');
      expect(formatAmountInputForDisplay('10000')).toBe('10.000');
      expect(formatAmountInputForDisplay('100000')).toBe('100.000');
      expect(formatAmountInputForDisplay('1000000')).toBe('1.000.000');
      expect(formatAmountInputForDisplay('1234,')).toBe('1.234,0');
      expect(formatAmountInputForDisplay('1234,5')).toBe('1.234,5');
    });
  });

  describe('validateCurrencySwitch', () => {
    it('permite cambiar de EUR a JPY con importe entero', () => {
      expect(validateCurrencySwitch('EUR', 'JPY', 100000, [])).toBeNull();
    });

    it('bloquea cambiar de EUR a JPY con fracciones', () => {
      expect(validateCurrencySwitch('EUR', 'JPY', 1050, [])).not.toBeNull();
    });

    it('bloquea cambiar de EUR a JPY con operaciones pendientes fraccionadas', () => {
      expect(validateCurrencySwitch('EUR', 'JPY', 1000, [1050])).not.toBeNull();
    });

    it('permite cambiar de JPY a EUR', () => {
      expect(validateCurrencySwitch('JPY', 'EUR', 1000, [])).toBeNull();
    });

    it('permite cambiar entre monedas del mismo factor', () => {
      expect(validateCurrencySwitch('EUR', 'USD', 1050, [])).toBeNull();
      expect(validateCurrencySwitch('JPY', 'CLP', 1000, [])).toBeNull();
    });
  });

  describe('evaluatePendingOperations', () => {
    it('evalúa suma y resta con factor 100', () => {
      const ops = [
        { valueMinor: 1000, operator: 'add' as const },
        { valueMinor: 250, operator: 'subtract' as const },
      ];
      expect(evaluatePendingOperations(ops, 100, 'EUR')).toBe(1150);
    });

    it('evalúa multiplicación y división con factor 1', () => {
      const ops = [{ valueMinor: 1000, operator: 'multiply' as const }];
      expect(evaluatePendingOperations(ops, 3, 'JPY')).toBe(3000);
    });

    it('devuelve el importe actual sin operaciones pendientes', () => {
      expect(evaluatePendingOperations([], 500, 'JPY')).toBe(500);
    });
  });
});
