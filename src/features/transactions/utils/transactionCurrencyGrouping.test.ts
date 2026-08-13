import type { SessionTransaction } from '@/features/transactions/types';
import {
  getAvailableCurrencies,
  groupTransactionsByCurrency,
  pickEffectiveCurrency,
} from '@/features/transactions/utils/transactionCurrencyGrouping';

function buildTransaction(
  overrides: Partial<SessionTransaction> & { id: string },
): SessionTransaction {
  return {
    spaceId: 'personal',
    type: 'expense',
    amountMinor: 1_000,
    currency: 'EUR',
    title: 'Movimiento',
    categoryId: 'general',
    occurredOn: '2026-07-01',
    recurrence: 'once',
    updatedAt: '2026-07-01T12:00:00.000Z',
    ...overrides,
  };
}

const eurTransaction = buildTransaction({ id: 'eur-1', currency: 'EUR' });
const copTransactionA = buildTransaction({ id: 'cop-1', currency: 'COP' });
const copTransactionB = buildTransaction({ id: 'cop-2', currency: 'COP' });
const usdTransaction = buildTransaction({ id: 'usd-1', currency: 'USD' });

describe('getAvailableCurrencies', () => {
  it('devuelve las monedas presentes sin duplicados, ordenadas alfabéticamente', () => {
    expect(
      getAvailableCurrencies([
        usdTransaction,
        eurTransaction,
        copTransactionA,
        copTransactionB,
      ]),
    ).toEqual(['COP', 'EUR', 'USD']);
  });

  it('devuelve un arreglo vacío sin movimientos', () => {
    expect(getAvailableCurrencies([])).toEqual([]);
  });
});

describe('groupTransactionsByCurrency', () => {
  it('agrupa los movimientos por su propia moneda', () => {
    const grouped = groupTransactionsByCurrency([
      eurTransaction,
      copTransactionA,
      copTransactionB,
      usdTransaction,
    ]);

    expect(grouped.get('EUR')).toEqual([eurTransaction]);
    expect(grouped.get('COP')).toEqual([copTransactionA, copTransactionB]);
    expect(grouped.get('USD')).toEqual([usdTransaction]);
  });
});

describe('pickEffectiveCurrency', () => {
  it('usa la moneda seleccionada cuando está disponible', () => {
    expect(pickEffectiveCurrency(['COP', 'EUR'], 'COP')).toBe('COP');
  });

  it('cae a la primera moneda disponible cuando la seleccionada no está presente', () => {
    expect(pickEffectiveCurrency(['COP', 'EUR'], 'USD')).toBe('COP');
  });

  it('cae a la primera moneda disponible sin selección', () => {
    expect(pickEffectiveCurrency(['COP', 'EUR'], null)).toBe('COP');
  });

  it('usa el valor por defecto cuando no hay monedas disponibles', () => {
    expect(pickEffectiveCurrency([], null)).toBe('EUR');
    expect(pickEffectiveCurrency([], null, 'USD')).toBe('USD');
  });
});
