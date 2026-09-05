import { getVenezuelaDisplayValue } from './venezuelaDisplayMode';

const snapshot = {
  countryCode: 'VE' as const,
  createdWithCurrency: 'USD' as const,
  rates: {
    BCV: {
      baseCurrency: 'USD',
      quoteCurrency: 'VES',
      rate: '50',
      convertedAmountMinor: 50_000,
      convertedCurrency: 'VES' as const,
      observedAt: '2026-09-05T04:00:00.000Z',
    },
    EURO: {
      baseCurrency: 'USD',
      quoteCurrency: 'EUR',
      rate: '0.91',
      convertedAmountMinor: 910,
      convertedCurrency: 'EUR' as const,
      observedAt: '2026-09-05T04:00:00.000Z',
    },
  },
};

describe('getVenezuelaDisplayValue', () => {
  it('mantiene USD como el valor principal de un movimiento en dólares', () => {
    expect(
      getVenezuelaDisplayValue({
        amountMinor: 1_000,
        currency: 'USD',
        exchangeSnapshot: snapshot,
        mode: 'USD',
      }),
    ).toMatchObject({ amountMinor: 1_000, currency: 'USD', source: null });
  });

  it('lee las equivalencias BCV y Euro desde el snapshot congelado', () => {
    expect(
      getVenezuelaDisplayValue({
        amountMinor: 1_000,
        currency: 'USD',
        exchangeSnapshot: snapshot,
        mode: 'VES_BCV',
      }),
    ).toMatchObject({ amountMinor: 50_000, currency: 'VES', source: 'BCV' });
    expect(
      getVenezuelaDisplayValue({
        amountMinor: 1_000,
        currency: 'USD',
        exchangeSnapshot: snapshot,
        mode: 'EUR',
      }),
    ).toMatchObject({ amountMinor: 910, currency: 'EUR', source: 'EURO' });
  });

  it('no adivina la moneda de snapshots antiguos sin convertedCurrency', () => {
    expect(
      getVenezuelaDisplayValue({
        amountMinor: 1_000,
        currency: 'USD',
        exchangeSnapshot: {
          ...snapshot,
          rates: {
            ...snapshot.rates,
            BCV: { ...snapshot.rates.BCV, convertedCurrency: undefined },
          },
        },
        mode: 'VES_BCV',
      }),
    ).toBeNull();
  });
});
