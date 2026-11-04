import type {
  CurrentExchangeRate,
  CurrentExchangeRates,
  CurrentUsdtExchangeRate,
  ExchangeRateConversion,
  UsdtRateConversion,
  ExchangeRatePreview,
  VenezuelaCurrencyCode,
  VenezuelaExchangeRateSource,
} from '@/features/exchangeRates/types';
import {
  getDemoCurrentExchangeRates,
  getDemoExchangePreview,
} from '@/features/demo/utils/demoVenezuelaRates';
import { clearVenezuelaRateHistoryCache } from '@/features/exchangeRates/gateways/juntossVenezuelaRateHistoryGateway';
import { getLocalTodayKey } from '@/lib/date/localDate';
import { ApiError } from '@/services/api/client';
import { apiClient } from '@/services/api/juntossApiClient';
import { loadDemoSession } from '@/state/demoSession/demoSessionStore';

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
  > & { USDT?: unknown };
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

/**
 * La fuente USDT es independiente de BCV y EURO: una respuesta sin ella, con
 * `null` o malformada deja la tasa USDT en `null` y nunca tumba las otras dos.
 */
function mapUsdtRate(raw: unknown): CurrentUsdtExchangeRate | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const rate = raw as Record<string, unknown>;
  if (
    rate.source !== 'USDT' ||
    rate.baseCurrency !== 'USDT' ||
    rate.quoteCurrency !== 'VES' ||
    typeof rate.rate !== 'string' ||
    !(Number(rate.rate) > 0) ||
    typeof rate.observedAt !== 'string'
  ) {
    return null;
  }
  return {
    source: 'USDT',
    baseCurrency: 'USDT',
    quoteCurrency: 'VES',
    rate: rate.rate,
    dailyAverage:
      typeof rate.dailyAverage === 'string' ? rate.dailyAverage : null,
    observedAt: rate.observedAt,
    fetchedAt: typeof rate.fetchedAt === 'string' ? rate.fetchedAt : '',
    stale: rate.stale === true,
  };
}

/** Igual que la tasa vigente: un USDT ausente o roto es `null`, nunca un error. */
function mapUsdtConversion(raw: unknown): UsdtRateConversion | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const conversion = raw as Record<string, unknown>;
  if (
    (conversion.currency !== 'VES' && conversion.currency !== 'USDT') ||
    typeof conversion.amount !== 'string' ||
    typeof conversion.rate !== 'string'
  ) {
    return null;
  }
  try {
    return {
      amountMinor: decimalStringToAmountMinor(conversion.amount, 'USDT'),
      currency: conversion.currency,
      rate: conversion.rate,
    };
  } catch {
    return null;
  }
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

/**
 * Las tasas vigentes cambian como mucho unas veces al día, pero cada hoja que
 * las muestra las pedía al abrirse y enseñaba antes un estado de carga. Se
 * reutilizan unos minutos y se comparte la petición en curso.
 */
const currentRatesTtlMs = 5 * 60 * 1000;
let cachedCurrentRates: {
  fetchedAt: number;
  rates: CurrentExchangeRates;
} | null = null;
let currentRatesRequest: Promise<CurrentExchangeRates> | null = null;

/** Tasas vigentes ya descargadas y aún frescas, sin pedir nada. */
export function peekCurrentExchangeRates(): CurrentExchangeRates | null {
  return cachedCurrentRates &&
    Date.now() - cachedCurrentRates.fetchedAt < currentRatesTtlMs
    ? cachedCurrentRates.rates
    : null;
}

export function clearCurrentExchangeRatesCache(): void {
  cachedCurrentRates = null;
  currentRatesRequest = null;
  clearVenezuelaRateHistoryCache();
  serverAcceptsPreviewDate = true;
}

export async function getCurrentExchangeRates(): Promise<CurrentExchangeRates> {
  // El usuario demo venezolano usa tasas ficticias locales: no hay API, y no
  // se cachean para no mezclarlas con las reales.
  if (await loadDemoSession()) {
    return getDemoCurrentExchangeRates(getLocalTodayKey());
  }
  const cached = peekCurrentExchangeRates();
  if (cached) return cached;
  if (!currentRatesRequest) {
    const request = fetchCurrentExchangeRates()
      .then((rates) => {
        cachedCurrentRates = { fetchedAt: Date.now(), rates };
        return rates;
      })
      .finally(() => {
        if (currentRatesRequest === request) currentRatesRequest = null;
      });
    currentRatesRequest = request;
  }
  return currentRatesRequest;
}

async function fetchCurrentExchangeRates(): Promise<CurrentExchangeRates> {
  const response = await apiClient.get<{
    data: {
      rates: Record<VenezuelaExchangeRateSource, RawCurrentExchangeRate> & {
        USDT?: unknown;
      };
      ratesUpdatedAt: string;
      stale: boolean;
    };
  }>('/v1/exchange/rates');
  const raw = response.data;

  return {
    rates: {
      BCV: mapCurrentRate(raw.rates.BCV, 'BCV'),
      EURO: mapCurrentRate(raw.rates.EURO, 'EURO'),
      USDT: mapUsdtRate(raw.rates.USDT),
    },
    ratesUpdatedAt: raw.ratesUpdatedAt,
    stale: raw.stale,
  };
}

/** `false` tras ver que el servidor no admite `occurredOn` en el preview. */
let serverAcceptsPreviewDate = true;

async function postPreview(
  body: Record<string, string>,
): Promise<RawExchangeRatePreview> {
  const response = await apiClient.post<{ data: RawExchangeRatePreview }>(
    '/v1/exchange/preview',
    body,
  );
  return response.data;
}

export async function previewExchangeRate({
  amountMinor,
  fromCurrency,
  occurredOn,
}: {
  amountMinor: number;
  fromCurrency: VenezuelaCurrencyCode;
  /**
   * Fecha local del movimiento. Con una fecha pasada el servidor usa las
   * tasas de ese día, las mismas que congelará al guardar; sin ella, las de
   * hoy.
   */
  occurredOn?: string;
}): Promise<ExchangeRatePreview> {
  if (await loadDemoSession()) {
    return getDemoExchangePreview({
      amountMinor,
      fromCurrency,
      today: getLocalTodayKey(),
    });
  }
  const body = {
    amount: amountMinorToDecimalString(amountMinor),
    countryCode: 'VE',
    currency: fromCurrency,
  };
  // Hoy es el valor por defecto del servidor: solo se envía una fecha pasada
  // (o futura), y así el preview de hoy no cambia.
  const sendsDate =
    serverAcceptsPreviewDate &&
    occurredOn !== undefined &&
    occurredOn !== getLocalTodayKey();
  const raw = sendsDate
    ? await postPreview({ ...body, occurredOn }).catch((error: unknown) => {
        // Un servidor anterior rechaza la clave desconocida con 400: se
        // reintenta con las tasas de hoy y no se vuelve a enviar la fecha.
        if (!(error instanceof ApiError) || error.status !== 400) throw error;
        serverAcceptsPreviewDate = false;
        return postPreview(body);
      })
    : await postPreview(body);
  const bcvCurrency = fromCurrency === 'USD' ? 'VES' : 'USD';

  return {
    conversions: {
      BCV: mapConversion(raw.conversions.BCV, 'BCV', bcvCurrency),
      // Ambas referencias devuelven la misma moneda de salida. EURO significa
      // «dólar a tasa EUR/BCV», no una conversión a euros europeos.
      EURO: mapConversion(raw.conversions.EURO, 'EURO', bcvCurrency),
      USDT: mapUsdtConversion(raw.conversions.USDT),
    },
    ratesUpdatedAt: raw.ratesUpdatedAt,
  };
}
