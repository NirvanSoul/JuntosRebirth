import {
  getCurrentBolivarRate,
  getValueAtRates,
  getVenezuelaDisplayValue,
} from '@/features/exchangeRates/utils/venezuelaDisplayMode';
import { computePeriodValuation } from '@/features/dashboard/utils/periodValuation';
import type {
  SessionTransaction,
  TransactionExchangeSnapshot,
} from '@/features/transactions/types';

const usdSnapshot: TransactionExchangeSnapshot = {
  countryCode: 'VE',
  createdWithCurrency: 'USD',
  rates: {
    BCV: {
      baseCurrency: 'USD',
      quoteCurrency: 'VES',
      rate: '900',
      convertedAmountMinor: 900_000,
      convertedCurrency: 'VES',
      observedAt: '2026-11-04T04:00:00.000Z',
    },
    USDT: {
      baseCurrency: 'USDT',
      quoteCurrency: 'VES',
      rate: '1010',
      convertedAmountMinor: 1_010_000,
      convertedCurrency: 'VES',
      observedAt: '2026-11-04T15:05:02.510Z',
    },
  },
};

describe('modo USDT', () => {
  it('lee un movimiento en USD en bolívares al precio P2P congelado', () => {
    expect(
      getVenezuelaDisplayValue({
        amountMinor: 1_000,
        currency: 'USD',
        exchangeSnapshot: usdSnapshot,
        mode: 'VES_USDT',
      }),
    ).toMatchObject({
      amountMinor: 1_010_000,
      currency: 'VES',
      source: 'USDT',
    });
  });

  it('lee un movimiento en VES como su valor en USD por la tasa USDT', () => {
    expect(
      getVenezuelaDisplayValue({
        accountingAmountMinorUsd: 1_000,
        amountMinor: 900_000,
        currency: 'VES',
        exchangeSnapshot: { ...usdSnapshot, createdWithCurrency: 'VES' },
        mode: 'VES_USDT',
      }),
    ).toMatchObject({ amountMinor: 1_010_000, currency: 'VES' });
  });

  it('no inventa un valor si el movimiento no tiene tasa USDT', () => {
    expect(
      getVenezuelaDisplayValue({
        amountMinor: 1_000,
        currency: 'USD',
        exchangeSnapshot: {
          ...usdSnapshot,
          rates: { BCV: usdSnapshot.rates.BCV },
        },
        mode: 'VES_USDT',
      }),
    ).toBeNull();
  });

  it('valora los totales con la tasa de su modo y cae a BCV como EUR', () => {
    const rates = { bcvRate: 900, eurRate: 1_000, usdtRate: 1_010 };

    expect(getCurrentBolivarRate('VES_BCV', rates)).toBe(900);
    expect(getCurrentBolivarRate('EUR', rates)).toBe(1_000);
    expect(getCurrentBolivarRate('VES_USDT', rates)).toBe(1_010);
    expect(
      getCurrentBolivarRate('VES_USDT', { ...rates, usdtRate: null }),
    ).toBe(900);
  });

  it('el total de un periodo en USDT es el total en USD por la tasa USDT', () => {
    const transaction = {
      amountMinor: 1_000,
      currency: 'USD',
      type: 'expense',
    } as SessionTransaction;

    expect(
      computePeriodValuation({
        bcvRate: 900,
        eurRate: 1_000,
        mode: 'VES_USDT',
        transactions: [transaction, transaction],
        type: 'expense',
        usdtRate: 1_010,
      }),
    ).toEqual({ currency: 'VES', totalMinor: 2_020_000 });
  });
});

describe('getValueAtRates', () => {
  const rates = { bcvUsd: 832.49, bcvEur: 968.07, usdt: 960.82 };

  it('valora el USD del movimiento con la tasa del día elegido en cada modo', () => {
    const usd = { amountMinor: 500, currency: 'USD' as const, rates };

    expect(getValueAtRates({ ...usd, mode: 'VES_BCV' })).toEqual({
      amountMinor: 416_245,
      currency: 'VES',
      rate: 832.49,
    });
    expect(getValueAtRates({ ...usd, mode: 'EUR' })?.amountMinor).toBe(484_035);
    expect(getValueAtRates({ ...usd, mode: 'VES_USDT' })?.amountMinor).toBe(
      480_410,
    );
    expect(getValueAtRates({ ...usd, mode: 'USD' })).toEqual({
      amountMinor: 500,
      currency: 'USD',
      rate: null,
    });
  });

  it('en modo Dólar convierte un importe en Bs con la BCV de ese día', () => {
    expect(
      getValueAtRates({
        amountMinor: 832_490,
        currency: 'VES',
        mode: 'USD',
        rates,
      }),
    ).toEqual({ amountMinor: 1_000, currency: 'USD', rate: 832.49 });
  });

  it('sin la tasa del modo ese día no da valor', () => {
    expect(
      getValueAtRates({
        amountMinor: 500,
        currency: 'USD',
        mode: 'VES_USDT',
        rates: { ...rates, usdt: null },
      }),
    ).toBeNull();
  });
});
