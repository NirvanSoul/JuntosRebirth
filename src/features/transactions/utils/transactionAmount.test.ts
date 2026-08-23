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

  describe('parseAmountMinor (decimales adicionales, factor 100)', () => {
    it('rechaza un tercer decimal sin truncarlo silenciosamente', () => {
      // Regresión bab8ecc: «10,999» se truncaba a 10,99 sin avisar.
      expect(parseAmountMinor('10,999', 'EUR')).toEqual({
        ok: false,
        amountMinor: null,
        reason: 'too_many_decimals',
      });
      expect(parseAmountMinor('0,001', 'USD')).toEqual({
        ok: false,
        amountMinor: null,
        reason: 'too_many_decimals',
      });
    });

    it('acepta uno o dos decimales legítimos', () => {
      expect(parseAmountMinor('10,9', 'EUR')).toEqual({
        ok: true,
        amountMinor: 1090,
      });
      expect(parseAmountMinor('10,99', 'EUR')).toEqual({
        ok: true,
        amountMinor: 1099,
      });
    });
  });

  describe('parseAmountMinor (límites de enteros seguros)', () => {
    it('acepta el mayor valor representable de cada escala', () => {
      expect(parseAmountMinor('9007199254740991', 'JPY')).toEqual({
        ok: true,
        amountMinor: Number.MAX_SAFE_INTEGER,
      });
      expect(parseAmountMinor('90071992547409', 'EUR')).toEqual({
        ok: true,
        amountMinor: 9007199254740900,
      });
    });

    it('rechaza entradas muy largas que producen enteros no seguros', () => {
      expect(parseAmountMinor('99999999999999999999', 'JPY')).toEqual({
        ok: false,
        amountMinor: null,
        reason: 'unsafe_integer',
      });
      expect(parseAmountMinor('9007199254740992', 'JPY')).toEqual({
        ok: false,
        amountMinor: null,
        reason: 'unsafe_integer',
      });
      expect(parseAmountMinor('90071992547410', 'EUR')).toEqual({
        ok: false,
        amountMinor: null,
        reason: 'unsafe_integer',
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
      expect(applyCalculatorOperation(1000, 250, 'add', 'EUR')).toEqual({
        ok: true,
        valueMinor: 1250,
      });
      expect(applyCalculatorOperation(1000, 250, 'subtract', 'EUR')).toEqual({
        ok: true,
        valueMinor: 750,
      });
      expect(applyCalculatorOperation(1000, 200, 'multiply', 'EUR')).toEqual({
        ok: true,
        valueMinor: 2000,
      });
      expect(applyCalculatorOperation(1000, 200, 'divide', 'EUR')).toEqual({
        ok: true,
        valueMinor: 500,
      });
      expect(applyCalculatorOperation(1000, 0, 'divide', 'EUR')).toEqual({
        ok: true,
        valueMinor: 1000,
      });
    });

    it('calcula operaciones con factor 1', () => {
      expect(applyCalculatorOperation(1000, 500, 'add', 'JPY')).toEqual({
        ok: true,
        valueMinor: 1500,
      });
      expect(applyCalculatorOperation(1000, 500, 'subtract', 'JPY')).toEqual({
        ok: true,
        valueMinor: 500,
      });
      expect(applyCalculatorOperation(1000, 3, 'multiply', 'JPY')).toEqual({
        ok: true,
        valueMinor: 3000,
      });
      expect(applyCalculatorOperation(1000, 4, 'divide', 'JPY')).toEqual({
        ok: true,
        valueMinor: 250,
      });
      expect(applyCalculatorOperation(1000, 0, 'divide', 'JPY')).toEqual({
        ok: true,
        valueMinor: 1000,
      });
    });

    it('rechaza resultados fuera del rango entero seguro', () => {
      const halfMaxSafe = 4503599627370496; // 2^52
      expect(
        applyCalculatorOperation(halfMaxSafe, halfMaxSafe, 'add', 'JPY'),
      ).toEqual({ ok: false, reason: 'unsafe_integer' });
      // Regresión bab8ecc: el producto intermedio se evaluaba en float y
      // devolvía un entero impreciso «válido».
      expect(
        applyCalculatorOperation(
          Number.MAX_SAFE_INTEGER,
          200,
          'multiply',
          'EUR',
        ),
      ).toEqual({ ok: false, reason: 'unsafe_integer' });
      expect(
        applyCalculatorOperation(Number.MAX_SAFE_INTEGER, 2, 'divide', 'EUR'),
      ).toEqual({ ok: false, reason: 'unsafe_integer' });
    });

    it('evalúa la división con precisión exacta aunque el producto desborde float', () => {
      // MAX_SAFE_INTEGER * 100 supera 2^53: un producto en float perdería
      // precisión antes de dividir; BigInt lo mantiene exacto.
      expect(
        applyCalculatorOperation(
          Number.MAX_SAFE_INTEGER,
          1_000_000_000,
          'divide',
          'EUR',
        ),
      ).toEqual({ ok: true, valueMinor: 900719925 });
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
      expect(evaluatePendingOperations(ops, 100, 'EUR')).toEqual({
        ok: true,
        valueMinor: 1150,
      });
    });

    it('evalúa multiplicación y división con factor 1', () => {
      const ops = [{ valueMinor: 1000, operator: 'multiply' as const }];
      expect(evaluatePendingOperations(ops, 3, 'JPY')).toEqual({
        ok: true,
        valueMinor: 3000,
      });
    });

    it('devuelve el importe actual sin operaciones pendientes', () => {
      expect(evaluatePendingOperations([], 500, 'JPY')).toEqual({
        ok: true,
        valueMinor: 500,
      });
    });

    it('falla de forma discriminada si cualquier paso desborda', () => {
      // Regresión bab8ecc: un desborde intermedio devolvía un entero
      // impreciso como si fuera válido.
      const halfMaxSafe = 4503599627370496; // 2^52
      const ops = [{ valueMinor: halfMaxSafe, operator: 'add' as const }];
      expect(evaluatePendingOperations(ops, halfMaxSafe, 'JPY')).toEqual({
        ok: false,
        reason: 'unsafe_integer',
      });
    });
  });
});
