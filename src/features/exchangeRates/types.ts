/** Fuentes oficiales que el backend resuelve para Venezuela. */
export type VenezuelaExchangeRateSource = 'BCV' | 'EURO';

/** Monedas originales admitidas por el preview Venezuela. */
export type VenezuelaCurrencyCode = 'USD' | 'VES';

export type CurrentExchangeRate = {
  source: VenezuelaExchangeRateSource;
  baseCurrency: 'USD' | 'EUR';
  quoteCurrency: 'VES';
  rate: string;
  observedAt: string;
  fetchedAt: string;
};

export type CurrentExchangeRates = {
  rates: Record<VenezuelaExchangeRateSource, CurrentExchangeRate>;
  ratesUpdatedAt: string;
  stale: boolean;
};

export type ExchangeRateConversion = {
  amountMinor: number;
  currency: 'USD' | 'VES' | 'EUR';
  rate: string;
};

export type ExchangeRatePreview = {
  conversions: Record<VenezuelaExchangeRateSource, ExchangeRateConversion>;
  ratesUpdatedAt: string;
};
