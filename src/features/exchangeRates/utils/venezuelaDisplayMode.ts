import type {
  TransactionExchangeSnapshot,
  ExchangeSnapshotRate,
} from '@/features/transactions/types';
import {
  isCurrencyCode,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import { getExchangeRateSourceLabel } from '@/lib/currency/exchangeRateSource';
import { formatExchangeRate } from '@/lib/currency/formatCurrency';

/**
 * `VES_USDT` lee el valor en bolívares al precio P2P de 1 USDT: igual que
 * `VES_BCV` y `EUR`, siempre en Bs; solo cambian la tasa y lo seguido que se
 * actualiza.
 */
export type VenezuelaDisplayMode = 'USD' | 'VES_BCV' | 'EUR' | 'VES_USDT';

/** Fuente del snapshot que alimenta cada modo en bolívares. */
const displayModeSource = {
  VES_BCV: 'BCV',
  EUR: 'EURO',
  VES_USDT: 'USDT',
} as const;

export type VenezuelaBolivarRates = {
  bcvRate: number | null;
  eurRate: number | null;
  usdtRate?: number | null;
};

function positive(rate: number | null | undefined): number | null {
  return rate && rate > 0 ? rate : null;
}

/**
 * Bolívares por dólar con los que se valora hoy un total en un modo en Bs.
 * Sin la tasa del modo se usa la BCV, y sin ninguna, 1: el mismo respaldo que
 * ya tenía la referencia EUR. El selector no ofrece USDT sin tasa.
 */
export function getCurrentBolivarRate(
  mode: Exclude<VenezuelaDisplayMode, 'USD'>,
  rates: VenezuelaBolivarRates,
): number {
  const bcv = positive(rates.bcvRate);
  if (mode === 'VES_BCV') return bcv ?? 1;
  const modeRate = positive(mode === 'EUR' ? rates.eurRate : rates.usdtRate);
  return modeRate ?? bcv ?? 1;
}

export type VenezuelaDisplayValue = {
  amountMinor: number;
  currency: CurrencyCode;
  rate: ExchangeSnapshotRate | null;
  source: 'BCV' | 'EURO' | 'USDT' | null;
};

type FrozenAmountInput = {
  amountMinor: number;
  accountingAmountMinorUsd?: number | null;
  currency: CurrencyCode;
  exchangeSnapshot?: TransactionExchangeSnapshot | null;
};

/**
 * Bolívares de un movimiento a la tasa que el servidor congeló para `source`
 * (1 $ = tasa en Bs). Cuando el servidor ya convirtió a Bs se usa su importe;
 * si no —la fila EURO se congela en euros, y la de un movimiento en VES en
 * dólares—, el valor en USD del movimiento por esa misma tasa congelada.
 * Nunca usa la tasa actual.
 */
export function getFrozenBolivarAmount(
  transaction: FrozenAmountInput,
  source: keyof TransactionExchangeSnapshot['rates'],
): { amountMinor: number; rate: ExchangeSnapshotRate } | null {
  const rate = transaction.exchangeSnapshot?.rates[source];
  if (!rate || rate.quoteCurrency !== 'VES') return null;
  if (transaction.currency === 'USD' && rate.convertedCurrency === 'VES') {
    return { amountMinor: rate.convertedAmountMinor, rate };
  }
  const rateValue = Number(rate.rate);
  const usdAmountMinor =
    transaction.currency === 'USD'
      ? transaction.amountMinor
      : transaction.accountingAmountMinorUsd;
  if (!(rateValue > 0) || typeof usdAmountMinor !== 'number') return null;
  return { amountMinor: Math.round(usdAmountMinor * rateValue), rate };
}

/**
 * Resuelve una lectura histórica sin recalcular nunca contra la tasa actual.
 * El importe original se conserva como salida cuando ya está en el modo pedido.
 */
export function getVenezuelaDisplayValue({
  amountMinor,
  accountingAmountMinorUsd,
  currency,
  exchangeSnapshot,
  mode,
}: {
  amountMinor: number;
  accountingAmountMinorUsd?: number | null;
  currency: CurrencyCode;
  exchangeSnapshot: TransactionExchangeSnapshot;
  mode: VenezuelaDisplayMode;
}): VenezuelaDisplayValue | null {
  if (mode === 'USD') {
    const usdAmountMinor =
      currency === 'USD' ? amountMinor : accountingAmountMinorUsd;

    return typeof usdAmountMinor === 'number'
      ? {
          amountMinor: usdAmountMinor,
          currency: 'USD',
          rate: null,
          source: null,
        }
      : null;
  }
  if (mode === 'VES_BCV' && currency === 'VES') {
    return { amountMinor, currency: 'VES', rate: null, source: null };
  }

  // En Venezuela, «EUR» es la referencia EUR/VES del BCV, no una moneda de
  // salida: todos los modos de tasa muestran el equivalente histórico en Bs.
  const source = displayModeSource[mode];
  const frozen = getFrozenBolivarAmount(
    { amountMinor, accountingAmountMinorUsd, currency, exchangeSnapshot },
    source,
  );
  return frozen
    ? {
        amountMinor: frozen.amountMinor,
        currency: 'VES',
        rate: frozen.rate,
        source,
      }
    : null;
}

/** Tasas de un día, en Bs por unidad, como números. */
export type BolivarRatesOfDay = {
  bcvUsd: number | null;
  bcvEur: number | null;
  usdt: number | null;
};

/**
 * Lo que habría valido el movimiento con las tasas de otro día: su valor en
 * USD (el contable, congelado al guardarlo) por la tasa del modo. En modo
 * Dólar, un importe en Bs se convierte con la BCV de ese día. `null` si ese
 * día no tiene la tasa que pide el modo.
 */
export function getValueAtRates({
  accountingAmountMinorUsd,
  amountMinor,
  currency,
  mode,
  rates,
}: {
  accountingAmountMinorUsd?: number | null;
  amountMinor: number;
  currency: CurrencyCode;
  mode: VenezuelaDisplayMode;
  rates: BolivarRatesOfDay;
}): {
  amountMinor: number;
  currency: CurrencyCode;
  rate: number | null;
} | null {
  if (mode === 'USD') {
    if (currency === 'USD') return { amountMinor, currency: 'USD', rate: null };
    const bcv = positive(rates.bcvUsd);
    return bcv
      ? {
          amountMinor: Math.round(amountMinor / bcv),
          currency: 'USD',
          rate: bcv,
        }
      : null;
  }
  const rate = positive(
    mode === 'VES_BCV'
      ? rates.bcvUsd
      : mode === 'EUR'
        ? rates.bcvEur
        : rates.usdt,
  );
  const usdAmountMinor =
    currency === 'USD' ? amountMinor : accountingAmountMinorUsd;
  if (!rate || typeof usdAmountMinor !== 'number') return null;
  return {
    amountMinor: Math.round(usdAmountMinor * rate),
    currency: 'VES',
    rate,
  };
}

export function getHistoricalRateDescription(
  displayValue: VenezuelaDisplayValue,
  showCurrencySymbols = true,
): string {
  if (!displayValue.rate || !displayValue.source) return 'Importe original';

  const { baseCurrency, observedAt, quoteCurrency, rate } = displayValue.rate;
  const source = getExchangeRateSourceLabel(displayValue.source);
  const formattedDate = observedAt
    ? new Intl.DateTimeFormat('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(observedAt))
    : null;
  const formattedRate =
    isCurrencyCode(baseCurrency) && isCurrencyCode(quoteCurrency)
      ? formatExchangeRate(rate, baseCurrency, quoteCurrency, 'es-ES', {
          showCurrencySymbol: showCurrencySymbols,
        })
      : source;

  return formattedDate
    ? `${source} · ${formattedRate} · ${formattedDate}`
    : `${source} · ${formattedRate}`;
}
