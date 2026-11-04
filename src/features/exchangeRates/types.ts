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

/**
 * Promedio P2P (Binance y Bybit) de 1 USDT en bolívares. Cambia varias veces
 * al día, a diferencia de BCV y EURO, que rigen el día entero.
 */
export type CurrentUsdtExchangeRate = {
  source: 'USDT';
  baseCurrency: 'USDT';
  quoteCurrency: 'VES';
  /** Último valor observado. */
  rate: string;
  /** Promedio del día venezolano en curso. */
  dailyAverage: string | null;
  observedAt: string;
  fetchedAt: string;
  /** `true` si `observedAt` tiene más de dos horas. */
  stale: boolean;
};

export type CurrentExchangeRates = {
  rates: Record<VenezuelaExchangeRateSource, CurrentExchangeRate> & {
    /**
     * `null` si la fuente USDT falló o la API aún no la ofrece: BCV y EURO
     * siguen llegando igual.
     */
    USDT?: CurrentUsdtExchangeRate | null;
  };
  ratesUpdatedAt: string;
  stale: boolean;
};

export type ExchangeRateConversion = {
  amountMinor: number;
  currency: VenezuelaCurrencyCode;
  rate: string;
};

/**
 * Conversión del importe al precio P2P. Desde USD sale en Bs; desde VES, en
 * USDT, que la app lee como dólares (1 USDT ≈ 1 $).
 */
export type UsdtRateConversion = {
  amountMinor: number;
  currency: 'VES' | 'USDT';
  rate: string;
};

export type ExchangeRatePreview = {
  conversions: Record<VenezuelaExchangeRateSource, ExchangeRateConversion> & {
    /** `null` si la fuente USDT no respondió o la API no la ofrece. */
    USDT?: UsdtRateConversion | null;
  };
  ratesUpdatedAt: string;
};

/**
 * Tasas que regían en una fecha (y hora) de Venezuela. BCV publica en días
 * hábiles: un fin de semana usa la última publicación anterior.
 */
export type VenezuelaRatesAt = {
  bcvUsd: string | null;
  bcvEur: string | null;
  usdt: VenezuelaUsdtRateAt | null;
};

/** Tasa USDT que regía en una fecha (y hora) de Venezuela. */
export type VenezuelaUsdtRateAt = {
  rate: string;
  /** `intraday`: lectura cercana a la hora; `daily_average`: promedio del día. */
  precision: 'intraday' | 'daily_average';
  observedAt: string | null;
};
