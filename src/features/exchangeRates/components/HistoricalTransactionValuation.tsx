import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { RateSourceSelector } from '@/features/exchangeRates/components/RateSourceSelector';
import type { HistoricalTransactionSummary } from '@/features/exchangeRates/utils/transactionSnapshot';
import type { ExchangeRateSource } from '@/lib/currency/exchangeRateSource';
import { formatCurrency } from '@/lib/currency/formatCurrency';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useThemedStyles } from '@/theme/useThemedStyles';

type HistoricalTransactionValuationProps = {
  availableSources: readonly ExchangeRateSource[];
  onChangeSource: (source: ExchangeRateSource) => void;
  selectedSource: ExchangeRateSource;
  summary: HistoricalTransactionSummary;
  testID: string;
};

/** Totales derivados de snapshots, separados del saldo o importe nominal. */
export function HistoricalTransactionValuation({
  availableSources,
  onChangeSource,
  selectedSource,
  summary,
  testID,
}: HistoricalTransactionValuationProps) {
  const styles = useThemedStyles(createStyles);
  const hasExpenses = summary.expenseMinor > 0;
  const hasIncome = summary.incomeMinor > 0;

  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.heading}>
        <Text variant="label" weight="semibold">
          Movimientos valorados históricamente
        </Text>
        <Text tone="secondary" variant="footnote">
          Con la tasa guardada en cada movimiento
        </Text>
      </View>
      <RateSourceSelector
        availableSources={availableSources}
        onChange={onChangeSource}
        selectedSource={selectedSource}
        testID={`${testID}-source-selector`}
      />
      <View style={styles.totals}>
        {hasExpenses ? (
          <Value
            label="Gastos"
            summary={summary}
            value={summary.expenseMinor}
          />
        ) : null}
        {hasIncome ? (
          <Value
            label="Ingresos"
            summary={summary}
            value={summary.incomeMinor}
          />
        ) : null}
      </View>
      {summary.missingTransactionCount > 0 ? (
        <Text tone="secondary" variant="footnote">
          {summary.missingTransactionCount === 1
            ? '1 movimiento no tiene esta conversión guardada.'
            : `${summary.missingTransactionCount} movimientos no tienen esta conversión guardada.`}
        </Text>
      ) : null}
    </View>
  );
}

function Value({
  label,
  summary,
  value,
}: {
  label: string;
  summary: HistoricalTransactionSummary;
  value: number;
}) {
  return (
    <View style={styles.value}>
      <Text tone="secondary" variant="caption">
        {label}
      </Text>
      <Text numberOfLines={1} variant="body" weight="semibold">
        {formatCurrency(value, summary.currency, 'es-ES')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  value: { minWidth: 0, flex: 1, gap: spacing.xxs },
});

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    card: {
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      padding: spacing.md,
    },
    heading: { gap: spacing.xxs },
    totals: { flexDirection: 'row', gap: spacing.sm },
  });
}
