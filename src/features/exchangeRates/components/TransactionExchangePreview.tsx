import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import type { ExchangePreviewState } from '@/features/exchangeRates/hooks/useExchangePreview';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { useCurrencySymbolPreference } from '@/state/appPreferences/CurrencySymbolPreferenceProvider';
import { spacing } from '@/theme/spacing';

type TransactionExchangePreviewProps = {
  preview: ExchangePreviewState;
  style?: StyleProp<ViewStyle>;
};

type PreviewRate = {
  amountMinor: number | null;
  currency: CurrencyCode;
  label: string;
  testID: string;
};

/**
 * Las tres equivalencias del importe que se está introduciendo en VE, una al
 * lado de otra: $ BCV, € BCV y USDT. El USDT de un importe en Bs llega en
 * USDT y se lee como dólares (1 USDT ≈ 1 $).
 */
export function TransactionExchangePreview({
  preview,
  style,
}: TransactionExchangePreviewProps) {
  const { formatCurrency, showCurrencySymbols } = useCurrencySymbolPreference();

  if (preview.status !== 'success' && preview.status !== 'stale') {
    return (
      <View style={style} testID="transaction-exchange-preview">
        <Text tone="secondary" variant="footnote">
          {preview.status === 'error'
            ? 'No pudimos actualizar la conversión.'
            : 'Calculando conversión…'}
        </Text>
      </View>
    );
  }

  const { BCV, EURO, USDT } = preview.conversions;
  const rates: PreviewRate[] = [
    {
      amountMinor: BCV.amountMinor,
      currency: BCV.currency,
      label: showCurrencySymbols ? '$ BCV' : 'BCV',
      testID: 'transaction-exchange-preview-badge',
    },
    {
      amountMinor: EURO.amountMinor,
      currency: EURO.currency,
      label: showCurrencySymbols ? '€ BCV' : 'Euro BCV',
      testID: 'transaction-exchange-preview-euro-badge',
    },
    {
      amountMinor: USDT?.amountMinor ?? null,
      currency: USDT?.currency === 'VES' ? 'VES' : 'USD',
      label: 'USDT',
      testID: 'transaction-exchange-preview-usdt-badge',
    },
  ];

  return (
    <View
      style={[style, styles.container]}
      testID="transaction-exchange-preview"
    >
      <View style={styles.row}>
        {rates.map((rate) => (
          <View key={rate.label} style={styles.cell} testID={rate.testID}>
            <Text align="center" numberOfLines={1} variant="footnote">
              {rate.amountMinor === null
                ? '—'
                : `≈ ${formatCurrency(rate.amountMinor, rate.currency, 'es-ES')}`}
            </Text>
            <Text align="center" tone="secondary" variant="caption">
              {rate.label}
            </Text>
          </View>
        ))}
      </View>
      {preview.status === 'stale' ? (
        <Text align="center" tone="secondary" variant="caption">
          Conversión no actualizada hoy
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'stretch', gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm },
  cell: { flex: 1, alignItems: 'center', gap: spacing.xxs },
});
