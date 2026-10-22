import {
  buildDemoExchangeSnapshot,
  getDemoBcvRate,
  getDemoCurrentExchangeRates,
  getDemoEuroRate,
  getDemoExchangePreview,
  usdMinorToDemoVesMinor,
} from '@/features/demo/utils/demoVenezuelaRates';

describe('demoVenezuelaRates', () => {
  it('devalúa el bolívar con el tiempo y mantiene la referencia EUR por encima', () => {
    expect(getDemoBcvRate('2026-10-17')).toBe(420);
    expect(getDemoBcvRate('2026-05-17')).toBeLessThan(
      getDemoBcvRate('2026-10-17'),
    );
    expect(getDemoBcvRate('2026-12-17')).toBeGreaterThan(420);
    expect(getDemoEuroRate('2026-10-17')).toBeGreaterThan(420);
  });

  it('convierte precios en dólares a bolívares redondeados como un ticket', () => {
    // 1,00 $ a 420 Bs/$ = 420 Bs.
    expect(usdMinorToDemoVesMinor(100, '2026-10-17')).toBe(42_000);
    expect(usdMinorToDemoVesMinor(133, '2026-10-17') % 1_000).toBe(0);
  });

  it('congela un movimiento en USD con su valor contable y sus equivalentes en Bs', () => {
    const { accountingAmountMinorUsd, exchangeSnapshot } =
      buildDemoExchangeSnapshot({
        amountMinor: 1_000,
        currency: 'USD',
        occurredOn: '2026-10-17',
      });

    expect(accountingAmountMinorUsd).toBe(1_000);
    expect(exchangeSnapshot.createdWithCurrency).toBe('USD');
    expect(exchangeSnapshot.rates.BCV).toMatchObject({
      baseCurrency: 'USD',
      quoteCurrency: 'VES',
      convertedAmountMinor: 420_000,
      convertedCurrency: 'VES',
    });
    expect(exchangeSnapshot.rates.EURO).toMatchObject({
      baseCurrency: 'EUR',
      convertedCurrency: 'VES',
    });
  });

  it('congela un movimiento en VES con su equivalente en dólares a tasa BCV', () => {
    const { accountingAmountMinorUsd, exchangeSnapshot } =
      buildDemoExchangeSnapshot({
        amountMinor: 420_000,
        currency: 'VES',
        occurredOn: '2026-10-17',
      });

    expect(accountingAmountMinorUsd).toBe(1_000);
    expect(exchangeSnapshot.rates.BCV?.convertedCurrency).toBe('USD');
  });

  it('responde la tasa vigente y el preview que pediría la app', () => {
    const current = getDemoCurrentExchangeRates('2026-10-17');
    expect(current.rates.BCV.rate).toBe('420.0000');
    expect(current.stale).toBe(false);

    const preview = getDemoExchangePreview({
      amountMinor: 1_000,
      fromCurrency: 'USD',
      today: '2026-10-17',
    });
    expect(preview.conversions.BCV).toEqual({
      amountMinor: 420_000,
      currency: 'VES',
      rate: '420.0000',
    });
    expect(preview.conversions.EURO.currency).toBe('VES');
  });
});
