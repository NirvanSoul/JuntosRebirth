import {
  getDemoFirstRateDate,
  getDemoRatesAt,
} from '@/features/demo/utils/demoVenezuelaRates';
import type {
  VenezuelaRatesAt,
  VenezuelaUsdtRateAt,
} from '@/features/exchangeRates/types';
import { getLocalTodayKey } from '@/lib/date/localDate';
import { apiClient } from '@/services/api/juntossApiClient';
import { loadDemoSession } from '@/state/demoSession/demoSessionStore';

/** Las tasas de hoy siguen moviéndose (el USDT varias veces al día). */
const todayRatesTtlMs = 5 * 60 * 1000;

/**
 * Las tasas de una fecha pasada no cambian: se recuerdan toda la sesión. Las
 * de hoy caducan como las vigentes.
 */
const ratesAtCache = new Map<
  string,
  { fetchedAt: number; request: Promise<VenezuelaRatesAt> }
>();
let firstRateDateRequest: Promise<string> | null = null;

export function clearVenezuelaRateHistoryCache(): void {
  ratesAtCache.clear();
  firstRateDateRequest = null;
}

function positiveDecimal(value: unknown): string | null {
  return typeof value === 'string' && Number(value) > 0 ? value : null;
}

function mapUsdt(raw: unknown): VenezuelaUsdtRateAt | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const usdt = raw as Record<string, unknown>;
  const rate = positiveDecimal(usdt.rate);
  if (!rate) return null;
  return {
    rate,
    precision: usdt.precision === 'intraday' ? 'intraday' : 'daily_average',
    observedAt: typeof usdt.observedAt === 'string' ? usdt.observedAt : null,
  };
}

function mapRatesAt(raw: Record<string, unknown>): VenezuelaRatesAt {
  const bcv =
    typeof raw.bcv === 'object' && raw.bcv !== null
      ? (raw.bcv as Record<string, unknown>)
      : null;
  return {
    bcvUsd: positiveDecimal(bcv?.usd),
    bcvEur: positiveDecimal(bcv?.eur),
    usdt: mapUsdt(raw.usdt),
  };
}

/**
 * Tasas BCV $, BCV € y USDT que regían un día (y una hora, si la hay) desde
 * `GET /v1/exchange/rates/at`. Cada tasa es `null` si ese día no hay dato.
 */
export async function getVenezuelaRatesAt(
  date: string,
  time?: string,
): Promise<VenezuelaRatesAt> {
  if (await loadDemoSession()) return getDemoRatesAt(date);

  const key = `${date}|${time ?? ''}`;
  const cached = ratesAtCache.get(key);
  const isToday = date >= getLocalTodayKey();
  if (cached && (!isToday || Date.now() - cached.fetchedAt < todayRatesTtlMs)) {
    return cached.request;
  }

  const request = apiClient
    .get<{ data: Record<string, unknown> }>(
      `/v1/exchange/rates/at?date=${date}${time ? `&time=${time}` : ''}`,
    )
    .then((response) => mapRatesAt(response.data));
  ratesAtCache.set(key, { fetchedAt: Date.now(), request });
  // Un fallo no se recuerda: el siguiente intento vuelve a pedirlo.
  request.catch(() => ratesAtCache.delete(key));
  return request;
}

/** Se busca la primera tasa USDT a partir de aquí. */
const ratesHistoryStart = '2026-01-01';
/**
 * Primer día con USDT guardado en el historial de Kuanto. Es el límite si no
 * se puede consultar: antes de él ningún modo tiene las tres tasas.
 */
const firstKnownUsdtDate = '2026-01-19';

/**
 * Primer día de 2026 con tasa USDT guardada, desde
 * `GET /v1/exchange/rates/history`: no se puede consultar un importe más
 * atrás. Si la consulta falla, el primer día conocido.
 */
export function getFirstVenezuelaRateDate(): Promise<string> {
  if (!firstRateDateRequest) {
    firstRateDateRequest = fetchFirstRateDate().catch(() => {
      firstRateDateRequest = null;
      return firstKnownUsdtDate;
    });
  }
  return firstRateDateRequest;
}

async function fetchFirstRateDate(): Promise<string> {
  if (await loadDemoSession()) return getDemoFirstRateDate();
  const response = await apiClient.get<{
    data: { rates?: Record<string, unknown>[] };
  }>(`/v1/exchange/rates/history?from=${ratesHistoryStart}&to=2026-01-31`);
  const first = (response.data.rates ?? []).find((row) =>
    positiveDecimal(row.usdtDailyAverage),
  );
  return typeof first?.date === 'string' ? first.date : firstKnownUsdtDate;
}
