import {
  getHistoricalRateDescription,
  getVenezuelaDisplayValue,
} from './venezuelaDisplayMode';

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
      quoteCurrency: 'VES',
      rate: '60',
      convertedAmountMinor: 60_000,
      convertedCurrency: 'VES' as const,
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

  it('lee las equivalencias BCV y Tasa EUR en bolívares desde el snapshot congelado', () => {
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
    ).toMatchObject({
      amountMinor: 60_000,
      currency: 'VES',
      source: 'EURO',
    });
  });

  it('usa exclusivamente el valor contable congelado para leer VES en USD', () => {
    expect(
      getVenezuelaDisplayValue({
        accountingAmountMinorUsd: 1_000,
        amountMinor: 50_000,
        currency: 'VES',
        exchangeSnapshot: snapshot,
        mode: 'USD',
      }),
    ).toMatchObject({ amountMinor: 1_000, currency: 'USD', source: null });
  });

  it('declara cobertura incompleta si un movimiento VES no tiene valor contable', () => {
    expect(
      getVenezuelaDisplayValue({
        amountMinor: 50_000,
        currency: 'VES',
        exchangeSnapshot: snapshot,
        mode: 'USD',
      }),
    ).toBeNull();
  });

  it('sin convertedCurrency no adivina su importe: usa el USD por la tasa congelada', () => {
    expect(
      getVenezuelaDisplayValue({
        amountMinor: 1_000,
        currency: 'USD',
        exchangeSnapshot: {
          ...snapshot,
          rates: {
            ...snapshot.rates,
            BCV: {
              ...snapshot.rates.BCV,
              convertedAmountMinor: 1,
              convertedCurrency: undefined,
            },
          },
        },
        mode: 'VES_BCV',
      }),
    ).toMatchObject({ amountMinor: 50_000, currency: 'VES' });
  });

  it('lee la tasa EUR en bolívares aunque el servidor la congele en euros', () => {
    expect(
      getVenezuelaDisplayValue({
        amountMinor: 500,
        currency: 'USD',
        exchangeSnapshot: {
          countryCode: 'VE',
          createdWithCurrency: 'USD',
          rates: {
            EURO: {
              baseCurrency: 'EUR',
              quoteCurrency: 'VES',
              rate: '999.7691920000',
              convertedAmountMinor: 447,
              convertedCurrency: 'EUR',
              observedAt: '2026-11-04T04:00:00.000Z',
            },
          },
        },
        mode: 'EUR',
      }),
    ).toMatchObject({ amountMinor: 499_885, currency: 'VES', source: 'EURO' });
  });

  it('describe la tasa histórica solo con números cuando se ocultan los símbolos', () => {
    const displayValue = getVenezuelaDisplayValue({
      amountMinor: 1_000,
      currency: 'USD',
      exchangeSnapshot: snapshot,
      mode: 'VES_BCV',
    });

    expect(displayValue).not.toBeNull();
    expect(getHistoricalRateDescription(displayValue!, false)).toContain(
      '50,00',
    );
    expect(getHistoricalRateDescription(displayValue!, false)).not.toMatch(
      /\$|Bs\.|USD|VES/,
    );
  });
});
