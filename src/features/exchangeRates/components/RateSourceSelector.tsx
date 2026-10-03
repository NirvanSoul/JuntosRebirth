import { StyleSheet, View } from 'react-native';

import { SegmentedControl } from '@/components/ui/SegmentedControl/SegmentedControl';
import { Text } from '@/components/ui/Text/Text';
import { getExchangeRateSourceLabel } from '@/lib/currency/exchangeRateSource';
import type { ExchangeRateSource } from '@/lib/currency/exchangeRateSource';
import { spacing } from '@/theme/spacing';
import { useCurrencySymbolPreference } from '@/state/appPreferences/CurrencySymbolPreferenceProvider';

type RateSourceSelectorProps = {
  availableSources: readonly ExchangeRateSource[];
  /** Oculta el rótulo cuando el contexto ya deja claro qué se elige. */
  hideLabel?: boolean;
  onChange: (source: ExchangeRateSource) => void;
  selectedSource: ExchangeRateSource;
  testID?: string;
};

/** Selector local de la fuente usada para leer conversiones históricas. */
export function RateSourceSelector({
  availableSources,
  hideLabel = false,
  onChange,
  selectedSource,
  testID,
}: RateSourceSelectorProps) {
  const { showCurrencySymbols } = useCurrencySymbolPreference();
  if (availableSources.length < 2) return null;

  return (
    <View style={styles.container} testID={testID}>
      {hideLabel ? null : (
        <Text tone="secondary" variant="caption">
          Tasa usada
        </Text>
      )}
      <SegmentedControl
        onChange={onChange}
        options={availableSources.map((source) => ({
          label:
            source === 'BCV'
              ? showCurrencySymbols
                ? '$ BCV'
                : 'BCV'
              : source === 'EURO'
                ? showCurrencySymbols
                  ? '€ BCV'
                  : 'Euro BCV'
                : getExchangeRateSourceLabel(source),
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
