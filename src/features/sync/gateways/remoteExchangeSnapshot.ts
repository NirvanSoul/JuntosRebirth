import type {
  ExchangeSnapshotRate,
  TransactionExchangeSnapshot,
} from '@/features/transactions/types';
import { isCurrencyCode } from '@/lib/currency/currencyCatalog';

function snapshotRate(
  source: keyof TransactionExchangeSnapshot['rates'],
  raw: unknown,
): ExchangeSnapshotRate {
  if (typeof raw !== 'object' || raw === null)
    throw new Error('[sync] Tasa histórica inválida');
  const rate = raw as Record<string, unknown>;
  if (
    typeof rate.baseCurrency !== 'string' ||
    typeof rate.quoteCurrency !== 'string' ||
    typeof rate.rate !== 'string' ||
    (rate.convertedCurrency !== undefined &&
      (typeof rate.convertedCurrency !== 'string' ||
        !(
          isCurrencyCode(rate.convertedCurrency) ||
          (source === 'USDT' && rate.convertedCurrency === 'USDT')
        )))
  )
    throw new Error('[sync] Tasa histórica inválida');
  const convertedAmountMinor = Number(rate.convertedAmountMinor);
  if (!Number.isFinite(convertedAmountMinor)) {
    throw new Error('[sync] La API devolvió un importe que no es numérico');
  }
  return {
    baseCurrency: rate.baseCurrency,
    quoteCurrency: rate.quoteCurrency,
    rate: rate.rate,
    convertedAmountMinor,
    ...(rate.convertedCurrency === undefined
      ? {}
      : { convertedCurrency: rate.convertedCurrency }),
    observedAt:
      typeof rate.observedAt === 'string' && rate.observedAt.length > 0
        ? rate.observedAt
        : null,
  };
}

/**
 * Snapshot de tasas congelado por el servidor para un movimiento venezolano.
 * Solo lee las fuentes conocidas y descarta cualquier otra clave.
 */
export function readRemoteExchangeSnapshot(
  value: unknown,
): TransactionExchangeSnapshot | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object')
    throw new Error('[sync] Snapshot de tasa inválido');
  const snapshot = value as Record<string, unknown>;
  if (
    snapshot.countryCode !== 'VE' ||
    (snapshot.createdWithCurrency !== 'USD' &&
      snapshot.createdWithCurrency !== 'VES') ||
    typeof snapshot.rates !== 'object' ||
    snapshot.rates === null
  ) {
    throw new Error('[sync] Snapshot de tasa inválido');
  }
  const rates: TransactionExchangeSnapshot['rates'] = {};
  for (const source of ['BCV', 'EURO', 'CUSTOM', 'USDT'] as const) {
    const raw = (snapshot.rates as Record<string, unknown>)[source];
    if (raw === undefined) continue;
    try {
      rates[source] = snapshotRate(source, raw);
    } catch (error) {
      // USDT es solo una referencia: una fila rota se descarta sin tumbar
      // la restauración. BCV, EURO y CUSTOM sí sostienen los saldos.
      if (source !== 'USDT') throw error;
    }
  }
  return {
    countryCode: 'VE',
    createdWithCurrency: snapshot.createdWithCurrency,
    rates,
  };
}
