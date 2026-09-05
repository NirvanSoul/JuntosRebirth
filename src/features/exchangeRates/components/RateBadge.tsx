import { Text } from '@/components/ui/Text/Text';
import { getExchangeRateSourceLabel } from '@/lib/currency/exchangeRateSource';
import type { ExchangeRateSource } from '@/lib/currency/exchangeRateSource';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { formatCurrency } from '@/lib/currency/formatCurrency';

type RateBadgeProps = {
  convertedAmountMinor: number;
  currency: CurrencyCode;
  source: ExchangeRateSource;
  /** El backend sirvió el último snapshot conocido porque el proveedor falló hoy. */
  stale?: boolean;
  testID?: string;
};

/** Sección 10 del plan: «≈ $190,99 · BCV» bajo el importe. */
export function RateBadge({
  convertedAmountMinor,
  currency,
  source,
  stale = false,
  testID,
}: RateBadgeProps) {
  const formattedAmount = formatCurrency(
    convertedAmountMinor,
    currency,
    'es-ES',
  );
  const sourceLabel = getExchangeRateSourceLabel(source);

  return (
    <Text testID={testID} tone="secondary" variant="footnote">
      {`≈ ${formattedAmount} · ${sourceLabel}`}
      {stale ? ' · tasa no actualizada hoy' : ''}
    </Text>
  );
}
