import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { RateBadge } from '@/features/exchangeRates/components/RateBadge';
import type { ExchangePreviewState } from '@/features/exchangeRates/hooks/useExchangePreview';

type TransactionExchangePreviewProps = {
  preview: ExchangePreviewState;
  style?: StyleProp<ViewStyle>;
};

/** Las dos equivalencias del importe que se está introduciendo en VE. */
export function TransactionExchangePreview({
  preview,
  style,
}: TransactionExchangePreviewProps) {
  return (
    <View style={style} testID="transaction-exchange-preview">
      {preview.status === 'success' || preview.status === 'stale' ? (
        <>
          <RateBadge
            convertedAmountMinor={preview.conversions.BCV.amountMinor}
            currency={preview.conversions.BCV.currency}
            source="BCV"
            stale={preview.status === 'stale'}
            testID="transaction-exchange-preview-badge"
          />
          <RateBadge
            convertedAmountMinor={preview.conversions.EURO.amountMinor}
            currency={preview.conversions.EURO.currency}
            source="EURO"
            stale={preview.status === 'stale'}
            testID="transaction-exchange-preview-euro-badge"
          />
        </>
      ) : preview.status === 'error' ? (
        <Text tone="secondary" variant="footnote">
          No pudimos actualizar la conversión.
        </Text>
      ) : (
        <Text tone="secondary" variant="footnote">
          Calculando conversión…
        </Text>
      )}
    </View>
  );
}
