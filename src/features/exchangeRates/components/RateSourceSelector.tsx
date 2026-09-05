import { StyleSheet, View } from 'react-native';

import { SegmentedControl } from '@/components/ui/SegmentedControl/SegmentedControl';
import { Text } from '@/components/ui/Text/Text';
import { getExchangeRateSourceLabel } from '@/lib/currency/exchangeRateSource';
import type { ExchangeRateSource } from '@/lib/currency/exchangeRateSource';
import { spacing } from '@/theme/spacing';

type RateSourceSelectorProps = {
  availableSources: readonly ExchangeRateSource[];
  onChange: (source: ExchangeRateSource) => void;
  selectedSource: ExchangeRateSource;
  testID?: string;
};

/** Selector local de la fuente usada para leer conversiones históricas. */
export function RateSourceSelector({
  availableSources,
  onChange,
  selectedSource,
  testID,
}: RateSourceSelectorProps) {
  if (availableSources.length < 2) return null;

  return (
    <View style={styles.container} testID={testID}>
      <Text tone="secondary" variant="caption">
        Tasa usada
      </Text>
      <SegmentedControl
        onChange={onChange}
        options={availableSources.map((source) => ({
          label: getExchangeRateSourceLabel(source),
          value: source,
        }))}
        selectedValue={selectedSource}
        testID={testID ? `${testID}-control` : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
});
