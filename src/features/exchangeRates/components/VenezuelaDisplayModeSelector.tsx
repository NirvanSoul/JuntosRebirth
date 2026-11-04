import { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { SegmentedControl } from '@/components/ui/SegmentedControl/SegmentedControl';
import { Text, type TextTone } from '@/components/ui/Text/Text';
import type { VenezuelaDisplayMode } from '@/features/exchangeRates/utils/venezuelaDisplayMode';
import { spacing } from '@/theme/spacing';
import { useCurrencySymbolPreference } from '@/state/appPreferences/CurrencySymbolPreferenceProvider';

type VenezuelaDisplayModeSelectorProps = {
  hideLabel?: boolean;
  indicatorColor?: string;
  /**
   * `false` cuando no hay tasa USDT con la que valorar (la fuente P2P cayó):
   * la opción sigue visible pero apagada, para que el control no salte.
   */
  isUsdtAvailable?: boolean;
  selectedTextTone?: TextTone;
  mode: VenezuelaDisplayMode;
  onChange: (mode: VenezuelaDisplayMode) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Cambia solo cómo se lee un valor VE; nunca modifica el importe guardado. */
export function VenezuelaDisplayModeSelector({
  hideLabel = false,
  indicatorColor,
  isUsdtAvailable = true,
  selectedTextTone,
  mode,
  onChange,
  style,
  testID,
}: VenezuelaDisplayModeSelectorProps) {
  const { showCurrencySymbols } = useCurrencySymbolPreference();
  const isUsdtLost = mode === 'VES_USDT' && !isUsdtAvailable;

  useEffect(() => {
    if (isUsdtLost) onChange('USD');
  }, [isUsdtLost, onChange]);

  return (
    <View style={[styles.container, style]} testID={testID}>
      {!hideLabel ? (
        <Text tone="secondary" variant="caption">
          Ver en
        </Text>
      ) : null}
      <SegmentedControl
        indicatorColor={indicatorColor}
        onChange={onChange}
        options={[
          { label: 'Dolar', value: 'USD' },
          {
            label: showCurrencySymbols ? '$ BCV' : 'BCV',
            value: 'VES_BCV',
          },
          {
            label: showCurrencySymbols ? '€ BCV' : 'Euro BCV',
            value: 'EUR',
          },
          { disabled: !isUsdtAvailable, label: 'USDT', value: 'VES_USDT' },
        ]}
        selectedTextTone={
          selectedTextTone ?? (indicatorColor ? 'onBrand' : 'primary')
        }
        selectedValue={isUsdtLost ? 'USD' : mode}
        testID={testID ? `${testID}-control` : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
});
