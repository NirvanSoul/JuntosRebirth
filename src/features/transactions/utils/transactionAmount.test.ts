import {
  amountMinorToInput,
  appendAmountKey,
  applyCalculatorOperation,
  formatAmountInputForDisplay,
  parseAmountMinor,
} from '@/features/transactions/utils/transactionAmount';

describe('transactionAmount', () => {
  it('convierte la entrada decimal a unidades menores sin float como fuente', () => {
    expect(parseAmountMinor('10,50')).toBe(1050);
    expect(amountMinorToInput(1050)).toBe('10,5');
  });

  it('limita la entrada a dos decimales', () => {
    expect(appendAmountKey('10,50', '4')).toBe('10,50');
    expect(appendAmountKey('0', '7')).toBe('7');
  });

  it('agrupa visualmente los millares y conserva la coma decimal', () => {
    expect(formatAmountInputForDisplay('1000')).toBe('1.000');
    expect(formatAmountInputForDisplay('10000')).toBe('10.000');
    expect(formatAmountInputForDisplay('100000')).toBe('100.000');
    expect(formatAmountInputForDisplay('1000000')).toBe('1.000.000');
    expect(formatAmountInputForDisplay('1234,')).toBe('1.234,0');
    expect(formatAmountInputForDisplay('1234,5')).toBe('1.234,5');
  });

  it('calcula operaciones y evita una división inválida', () => {
    expect(applyCalculatorOperation(1000, 250, 'add')).toBe(1250);
    expect(applyCalculatorOperation(1000, 250, 'subtract')).toBe(750);
    expect(applyCalculatorOperation(1000, 200, 'multiply')).toBe(2000);
    expect(applyCalculatorOperation(1000, 200, 'divide')).toBe(500);
    expect(applyCalculatorOperation(1000, 0, 'divide')).toBe(1000);
  });
});
