import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { VenezuelaDisplayModeSelector } from '@/features/exchangeRates/components/VenezuelaDisplayModeSelector';
import {
  getHistoricalRateDescription,
  getVenezuelaDisplayValue,
  type VenezuelaDisplayMode,
} from '@/features/exchangeRates/utils/venezuelaDisplayMode';
import type { TransactionExchangeSnapshot } from '@/features/transactions/types';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { formatCurrency } from '@/lib/currency/formatCurrency';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useThemedStyles } from '@/theme/useThemedStyles';

type TransactionExchangeSnapshotCardProps = {
  accountingAmountMinorUsd?: number | null;
  amountMinor: number;
  currency: CurrencyCode;
  exchangeSnapshot: TransactionExchangeSnapshot | null | undefined;
};

export function TransactionExchangeSnapshotCard({
  accountingAmountMinorUsd,
  amountMinor,
  currency,
  exchangeSnapshot,
}: TransactionExchangeSnapshotCardProps) {
  const styles = useThemedStyles(createStyles);
  const [mode, setMode] = useState<VenezuelaDisplayMode>('USD');
  if (!exchangeSnapshot) return null;
  const displayValue = getVenezuelaDisplayValue({
    accountingAmountMinorUsd,
    amountMinor,
    currency,
    exchangeSnapshot,
    mode,
  });

  return (
    <View style={styles.card} testID="transaction-detail-exchange-snapshot">
      <Text tone="secondary" variant="caption">
        Valor histórico
      </Text>
      <VenezuelaDisplayModeSelector
        mode={mode}
        onChange={setMode}
        testID="transaction-detail-display-mode-selector"
      />
      {displayValue ? (
        <>
          <Text
            testID="transaction-detail-rate-badge"
            variant="body"
            weight="semibold"
          >
            {formatCurrency(
              displayValue.amountMinor,
              displayValue.currency,
              'es-ES',
            )}
          </Text>
          <Text tone="secondary" variant="footnote">
            {getHistoricalRateDescription(displayValue)}
          </Text>
        </>
      ) : (
        <Text tone="secondary" variant="footnote">
          Conversión histórica no disponible.
        </Text>
      )}
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    card: {
      gap: spacing.xs,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      marginTop: spacing.sm,
      padding: spacing.md,
    },
  });
}
