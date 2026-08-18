import {
  parseSignedAmountMinor,
  sanitizeSignedAmountInput,
  signedAmountMinorToInput,
} from '@/features/accounts/utils/signedAmountInput';

describe('parseSignedAmountMinor', () => {
  it('lee un importe positivo con y sin decimales', () => {
    expect(parseSignedAmountMinor('450')).toBe(45000);
    expect(parseSignedAmountMinor('450,50')).toBe(45050);
  });

  // El parseo genérico se comía el signo al sumar los céntimos: para
  // «-450,50» devolvía -44950 en vez de -45050.
  it('conserva el signo al aplicar los céntimos', () => {
    expect(parseSignedAmountMinor('-450')).toBe(-45000);
    expect(parseSignedAmountMinor('-450,50')).toBe(-45050);
    expect(parseSignedAmountMinor('-0,99')).toBe(-99);
  });

  it('trata el signo suelto como cero', () => {
    expect(parseSignedAmountMinor('-')).toBe(0);
  });
});

describe('signedAmountMinorToInput', () => {
  it('devuelve el importe listo para editarlo, con su signo', () => {
    expect(signedAmountMinorToInput(45000)).toBe('450');
    expect(signedAmountMinorToInput(-45000)).toBe('-450');
    expect(signedAmountMinorToInput(0)).toBe('0');
  });
});

describe('sanitizeSignedAmountInput', () => {
  it('deja pasar dígitos, la coma y un menos inicial', () => {
    // El separador de miles se descarta y la coma decimal se conserva.
    expect(sanitizeSignedAmountInput('-1.250,50 €')).toBe('-1250,50');
    expect(sanitizeSignedAmountInput('12a3')).toBe('123');
  });

  it('conserva el menos mientras todavía no hay dígitos', () => {
    expect(sanitizeSignedAmountInput('-')).toBe('-');
  });

  it('ignora un menos que no encabeza el importe', () => {
    expect(sanitizeSignedAmountInput('45-0')).toBe('450');
  });
});
