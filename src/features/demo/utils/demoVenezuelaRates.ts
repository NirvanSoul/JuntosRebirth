import type {
  CurrentExchangeRates,
  ExchangeRatePreview,
  VenezuelaCurrencyCode,
  VenezuelaRatesAt,
} from '@/features/exchangeRates/types';
import type {
  ExchangeSnapshotRate,
  TransactionExchangeSnapshot,
} from '@/features/transactions/types';

/**
 * Tasas FICTICIAS del usuario demo venezolano. Imitan el comportamiento del
 * BCV (un bolívar que se devalúa unos puntos cada mes y una referencia EUR por
 * encima de la del dólar), pero no son datos oficiales ni se leen de ninguna
 * fuente: el demo nunca habla con Juntoss API.
 *
 * Son deterministas por fecha, de modo que la tasa de un día es la misma al
 * sembrar el snapshot de un movimiento y al pedir la tasa vigente días después.
 */
const anchorDate = '2026-10-17';
const anchorBcvRate = 420;
const monthlyDevaluation = 0.045;
const eurUsdReference = 1.16;
/** El dólar P2P cotiza por encima del oficial. */
const usdtBcvPremium = 1.12;
const millisecondsPerMonth = 30.44 * 24 * 60 * 60 * 1000;

function toTime(dateKey: string): number {
  return Date.parse(`${dateKey}T04:00:00.000Z`);
}

export function getDemoBcvRate(dateKey: string): number {
  const months = (toTime(dateKey) - toTime(anchorDate)) / millisecondsPerMonth;
  return Number(
    (anchorBcvRate * (1 + monthlyDevaluation) ** months).toFixed(4),
  );
}

export function getDemoEuroRate(dateKey: string): number {
  return Number((getDemoBcvRate(dateKey) * eurUsdReference).toFixed(4));
}

export function getDemoUsdtRate(dateKey: string): number {
  return Number((getDemoBcvRate(dateKey) * usdtBcvPremium).toFixed(4));
}

/** Un precio en bolívares se apunta en decenas, como en un ticket. */
export function usdMinorToDemoVesMinor(
  usdMinor: number,
  dateKey: string,
): number {
  const ves = (usdMinor / 100) * getDemoBcvRate(dateKey);
  const step = ves >= 100 ? 10 : 1;
  return Math.max(100, Math.round(ves / step) * step * 100);
}

const demoSources = {
  BCV: { baseCurrency: 'USD', rate: getDemoBcvRate, fromVes: 'USD' },
  EURO: { baseCurrency: 'EUR', rate: getDemoEuroRate, fromVes: 'USD' },
  USDT: { baseCurrency: 'USDT', rate: getDemoUsdtRate, fromVes: 'USDT' },
} as const;

function snapshotRate(
  source: keyof typeof demoSources,
  dateKey: string,
  amountMinor: number,
  currency: VenezuelaCurrencyCode,
): ExchangeSnapshotRate {
  const { baseCurrency, fromVes } = demoSources[source];
  const rate = demoSources[source].rate(dateKey);
  const fromUsd = currency === 'USD';
  return {
    baseCurrency,
    quoteCurrency: 'VES',
    rate: rate.toFixed(4),
    convertedAmountMinor: Math.round(
      fromUsd ? amountMinor * rate : amountMinor / rate,
    ),
    convertedCurrency: fromUsd ? 'VES' : fromVes,
    observedAt: `${dateKey}T04:00:00.000Z`,
  };
}

/**
 * Lo que el servidor congelaría al sincronizar un movimiento venezolano: el
 * valor contable en USD y sus equivalentes BCV y EUR del día.
 */
export function buildDemoExchangeSnapshot(input: {
  amountMinor: number;
  currency: VenezuelaCurrencyCode;
  occurredOn: string;
}): {
  accountingAmountMinorUsd: number;
  exchangeSnapshot: TransactionExchangeSnapshot;
} {
  const { amountMinor, currency, occurredOn } = input;
  const bcv = snapshotRate('BCV', occurredOn, amountMinor, currency);
  return {
    accountingAmountMinorUsd:
      currency === 'USD' ? amountMinor : bcv.convertedAmountMinor,
    exchangeSnapshot: {
      countryCode: 'VE',
      createdWithCurrency: currency,
      rates: {
        BCV: bcv,
        EURO: snapshotRate('EURO', occurredOn, amountMinor, currency),
        USDT: snapshotRate('USDT', occurredOn, amountMinor, currency),
      },
    },
  };
}

/** Tasa vigente que la app pediría a `/v1/exchange/rates`. */
export function getDemoCurrentExchangeRates(
  today: string,
): CurrentExchangeRates {
  const observedAt = `${today}T04:00:00.000Z`;
  return {
    rates: {
      BCV: {
        source: 'BCV',
        baseCurrency: 'USD',
        quoteCurrency: 'VES',
        rate: getDemoBcvRate(today).toFixed(4),
        observedAt,
        fetchedAt: observedAt,
      },
      EURO: {
        source: 'EURO',
        baseCurrency: 'EUR',
        quoteCurrency: 'VES',
        rate: getDemoEuroRate(today).toFixed(4),
        observedAt,
        fetchedAt: observedAt,
      },
      USDT: {
        source: 'USDT',
        baseCurrency: 'USDT',
        quoteCurrency: 'VES',
        rate: getDemoUsdtRate(today).toFixed(4),
        dailyAverage: getDemoUsdtRate(today).toFixed(4),
        observedAt,
        fetchedAt: observedAt,
        stale: false,
      },
    },
    ratesUpdatedAt: observedAt,
    stale: false,
  };
}

/** Conversión en vivo que la app pediría a `/v1/exchange/preview`. */
export function getDemoExchangePreview(input: {
  amountMinor: number;
  fromCurrency: VenezuelaCurrencyCode;
  today: string;
}): ExchangeRatePreview {
  const { amountMinor, fromCurrency, today } = input;
  const toCurrency = fromCurrency === 'USD' ? 'VES' : 'USD';
  const convert = (source: 'BCV' | 'EURO') => {
    const rate = snapshotRate(source, today, amountMinor, fromCurrency);
    return {
      amountMinor: rate.convertedAmountMinor,
      currency: toCurrency,
      rate: rate.rate,
    } as const;
  };
  const usdt = snapshotRate('USDT', today, amountMinor, fromCurrency);
  return {
    conversions: {
      BCV: convert('BCV'),
      EURO: convert('EURO'),
      USDT: {
        amountMinor: usdt.convertedAmountMinor,
        currency: fromCurrency === 'USD' ? 'VES' : 'USDT',
        rate: usdt.rate,
      },
    },
    ratesUpdatedAt: `${today}T04:00:00.000Z`,
  };
}

/** Tasas de un día que la app pediría a `/v1/exchange/rates/at`. */
export function getDemoRatesAt(dateKey: string): VenezuelaRatesAt {
  return {
    bcvUsd: getDemoBcvRate(dateKey).toFixed(4),
    bcvEur: getDemoEuroRate(dateKey).toFixed(4),
    usdt: {
      rate: getDemoUsdtRate(dateKey).toFixed(4),
      precision: 'daily_average',
      observedAt: `${dateKey}T04:00:00.000Z`,
    },
  };
}

/** Primer día con USDT que tendría el historial del demo. */
export function getDemoFirstRateDate(): string {
  return '2026-01-19';
}
