import {
  amountMinorToInput,
  appendAmountKey,
  applyCalculatorOperation,
  convertAmountMinor,
  evaluatePendingOperations,
  formatAmountInputForDisplay,
  parseAmountMinor,
  validateCurrencySwitch,
} from '@/features/transactions/utils/transactionAmount';

describe('transactionAmount', () => {
  describe('parseAmountMinor (factor 100, EUR)', () => {
    it('convierte la entrada decimal a unidades menores sin float como fuente', () => {
      expect(parseAmountMinor('10,50', 'EUR')).toEqual({
        ok: true,
        amountMinor: 1050,
      });
      expect(parseAmountMinor('1000', 'EUR')).toEqual({
        ok: true,
        amountMinor: 100000,
      });
      expect(parseAmountMinor('0', 'EUR')).toEqual({
        ok: true,
        amountMinor: 0,
      });
      expect(parseAmountMinor('', 'EUR')).toEqual({ ok: true, amountMinor: 0 });
    });

    it('rechaza formatos inválidos sin lanzar', () => {
      expect(parseAmountMinor('abc', 'EUR')).toEqual({
        ok: false,
        amountMinor: null,
        reason: 'invalid_format',
      });
      expect(parseAmountMinor('1,2,3', 'EUR')).toEqual({
        ok: false,
        amountMinor: null,
        reason: 'invalid_format',
      });
      expect(parseAmountMinor('10,ab', 'EUR')).toEqual({
        ok: false,
        amountMinor: null,
        reason: 'invalid_format',
      });
    });
  });

  describe('parseAmountMinor (factor 1, JPY)', () => {
    it('convierte la entrada entera a unidades menores', () => {
      expect(parseAmountMinor('1000', 'JPY')).toEqual({
        ok: true,
        amountMinor: 1000,
      });
      expect(parseAmountMinor('0', 'JPY')).toEqual({
        ok: true,
        amountMinor: 0,
      });
      expect(parseAmountMinor('', 'JPY')).toEqual({ ok: true, amountMinor: 0 });
    });

    it('rechaza fracciones sin truncar silenciosamente', () => {
      expect(parseAmountMinor('10,50', 'JPY')).toEqual({
        ok: false,
        amountMinor: null,
        reason: 'invalid_fraction_for_currency',
      });
      expect(parseAmountMinor('1000,', 'JPY')).toEqual({
        ok: false,
        amountMinor: null,
        reason: 'invalid_fraction_for_currency',
      });
    });
  });

  describe('amountMinorToInput', () => {
    it('factor 100', () => {
      expect(amountMinorToInput(1050, 'EUR')).toBe('10,5');
      expect(amountMinorToInput(100000, 'EUR')).toBe('1000');
      expect(amountMinorToInput(0, 'EUR')).toBe('0');
    });

    it('factor 1', () => {
      expect(amountMinorToInput(1000, 'JPY')).toBe('1000');
      expect(amountMinorToInput(50, 'JPY')).toBe('50');
      expect(amountMinorToInput(0, 'JPY')).toBe('0');
    });
  });

  describe('appendAmountKey', () => {
    it('limita la entrada a dos decimales (factor 100)', () => {
      expect(appendAmountKey('10,50', '4', 'EUR')).toBe('10,50');
      expect(appendAmountKey('0', '7', 'EUR')).toBe('7');
      expect(appendAmountKey('10', ',', 'EUR')).toBe('10,');
      expect(appendAmountKey('10,', '5', 'EUR')).toBe('10,5');
    });

    it('ignora la coma al teclear (factor 1)', () => {
      expect(appendAmountKey('100', ',', 'JPY')).toBe('100');
      expect(appendAmountKey('0', ',', 'JPY')).toBe('0');
      expect(appendAmountKey('100', '5', 'JPY')).toBe('1005');
    });
  });

  describe('applyCalculatorOperation', () => {
    it('calcula operaciones con factor 100', () => {
      expect(applyCalculatorOperation(1000, 250, 'add', 'EUR')).toBe(1250);
      expect(applyCalculatorOperation(1000, 250, 'subtract', 'EUR')).toBe(750);
      expect(applyCalculatorOperation(1000, 200, 'multiply', 'EUR')).toBe(2000);
      expect(applyCalculatorOperation(1000, 200, 'divide', 'EUR')).toBe(500);
      expect(applyCalculatorOperation(1000, 0, 'divide', 'EUR')).toBe(1000);
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
      expect(validateCurrencySwitch('EUR', 'JPY', 100000, [])).toEqual({
        ok: true,
      });
    });

    it('bloquea cambiar de EUR a JPY con fracciones', () => {
      expect(validateCurrencySwitch('EUR', 'JPY', 1050, [])).toEqual({
        ok: false,
        reason: 'fraction_not_allowed',
      });
    });

    it('bloquea cambiar de EUR a JPY con operaciones pendientes fraccionadas', () => {
      expect(validateCurrencySwitch('EUR', 'JPY', 1000, [1050])).toEqual({
        ok: false,
        reason: 'fraction_not_allowed',
      });
    });

    it('permite cambiar de JPY a EUR', () => {
      expect(validateCurrencySwitch('JPY', 'EUR', 1000, [])).toEqual({
        ok: true,
      });
    });

    it('permite cambiar entre monedas del mismo factor', () => {
      expect(validateCurrencySwitch('EUR', 'USD', 1050, [])).toEqual({
        ok: true,
      });
      expect(validateCurrencySwitch('JPY', 'CLP', 1000, [])).toEqual({
        ok: true,
      });
    });
  });

  describe('convertAmountMinor', () => {
    it('convierte factor 100 → 1 dividiendo entre 100 cuando es exacto', () => {
      expect(convertAmountMinor(100000, 'EUR', 'JPY')).toEqual({
        ok: true,
        amountMinor: 1000,
      });
      expect(convertAmountMinor(1000, 'EUR', 'JPY')).toEqual({
        ok: true,
        amountMinor: 10,
      });
    });

    it('rechaza factor 100 → 1 con fracción', () => {
      expect(convertAmountMinor(1050, 'EUR', 'JPY')).toEqual({
        ok: false,
        amountMinor: null,
        reason: 'fraction_not_allowed',
      });
    });

    it('convierte factor 1 → 100 multiplicando por 100', () => {
      expect(convertAmountMinor(1000, 'JPY', 'EUR')).toEqual({
        ok: true,
        amountMinor: 100000,
      });
    });

    it('conserva el valor en el mismo factor', () => {
      expect(convertAmountMinor(1050, 'EUR', 'USD')).toEqual({
        ok: true,
        amountMinor: 1050,
      });
      expect(convertAmountMinor(1000, 'JPY', 'CLP')).toEqual({
        ok: true,
        amountMinor: 1000,
      });
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
