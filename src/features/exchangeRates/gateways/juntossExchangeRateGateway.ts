import type {
  CurrentExchangeRate,
  CurrentExchangeRates,
  ExchangeRateConversion,
  ExchangeRatePreview,
  VenezuelaCurrencyCode,
  VenezuelaExchangeRateSource,
} from '@/features/exchangeRates/types';
import { apiClient } from '@/services/api/juntossApiClient';

/**
 * `/v1/exchange/*` usa strings decimales de moneda mayor. Esta es la única
 * frontera de la app que cruza ese límite: el resto conserva unidades menores.
 */
function amountMinorToDecimalString(amountMinor: number): string {
  const whole = Math.trunc(amountMinor / 100);
  const fraction = Math.abs(amountMinor % 100);
  return `${whole}.${fraction.toString().padStart(2, '0')}`;
}

function decimalStringToAmountMinor(value: string, context: string): number {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) {
    throw new Error(
      `[exchangeRates] La API devolvió un importe no numérico en ${context}: ${value}`,
    );
  }
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? '').padEnd(2, '0'));
  const amountMinor = whole * 100 + fraction;
  if (!Number.isSafeInteger(amountMinor)) {
    throw new Error(
      `[exchangeRates] La API devolvió un importe fuera de rango en ${context}`,
    );
  }
  return amountMinor;
}

type RawCurrentExchangeRate = {
  source: string;
  baseCurrency: string;
  quoteCurrency: string;
  rate: string;
  observedAt: string;
  fetchedAt: string;
};

type RawExchangeRatePreview = {
  conversions: Record<
    VenezuelaExchangeRateSource,
    { amount: string; currency: string; rate: string }
  >;
  ratesUpdatedAt: string;
};

function mapCurrentRate(
  raw: RawCurrentExchangeRate,
  source: VenezuelaExchangeRateSource,
): CurrentExchangeRate {
  const expectedBaseCurrency = source === 'BCV' ? 'USD' : 'EUR';
  if (
    raw.source !== source ||
    raw.baseCurrency !== expectedBaseCurrency ||
    raw.quoteCurrency !== 'VES'
  ) {
    throw new Error('[exchangeRates] La API devolvió una tasa no reconocida');
  }
  return {
    source: raw.source,
    baseCurrency: raw.baseCurrency,
    quoteCurrency: raw.quoteCurrency,
    rate: raw.rate,
    observedAt: raw.observedAt,
    fetchedAt: raw.fetchedAt,
  } as CurrentExchangeRate;
}

function mapConversion(
  raw: { amount: string; currency: string; rate: string },
  source: VenezuelaExchangeRateSource,
  expectedCurrency: VenezuelaCurrencyCode,
): ExchangeRateConversion {
  if (raw.currency !== expectedCurrency) {
    throw new Error(
      `[exchangeRates] Moneda inesperada en ${source}: ${raw.currency}`,
    );
  }
  return {
    amountMinor: decimalStringToAmountMinor(raw.amount, source),
    currency: raw.currency,
    rate: raw.rate,
  };
}

export async function getCurrentExchangeRates(): Promise<CurrentExchangeRates> {
  const response = await apiClient.get<{
    data: {
      rates: Record<VenezuelaExchangeRateSource, RawCurrentExchangeRate>;
      ratesUpdatedAt: string;
      stale: boolean;
    };
  }>('/v1/exchange/rates');
  const raw = response.data;

  return {
    rates: {
      BCV: mapCurrentRate(raw.rates.BCV, 'BCV'),
      EURO: mapCurrentRate(raw.rates.EURO, 'EURO'),
    },
    ratesUpdatedAt: raw.ratesUpdatedAt,
    stale: raw.stale,
  };
}

export async function previewExchangeRate({
  amountMinor,
  fromCurrency,
}: {
  amountMinor: number;
  fromCurrency: VenezuelaCurrencyCode;
}): Promise<ExchangeRatePreview> {
  const response = await apiClient.post<{ data: RawExchangeRatePreview }>(
    '/v1/exchange/preview',
    {
      amount: amountMinorToDecimalString(amountMinor),
      countryCode: 'VE',
      currency: fromCurrency,
    },
  );
  const raw = response.data;
  const bcvCurrency = fromCurrency === 'USD' ? 'VES' : 'USD';

  return {
    conversions: {
      BCV: mapConversion(raw.conversions.BCV, 'BCV', bcvCurrency),
      // Ambas referencias devuelven la misma moneda de salida. EURO significa
      // «dólar a tasa EUR/BCV», no una conversión a euros europeos.
      EURO: mapConversion(raw.conversions.EURO, 'EURO', bcvCurrency),
    },
    ratesUpdatedAt: raw.ratesUpdatedAt,
  };
}
