import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { SegmentedControl } from '@/components/ui/SegmentedControl/SegmentedControl';
import { Text, type TextTone } from '@/components/ui/Text/Text';
import type { VenezuelaDisplayMode } from '@/features/exchangeRates/utils/venezuelaDisplayMode';
import { spacing } from '@/theme/spacing';

type VenezuelaDisplayModeSelectorProps = {
  hideLabel?: boolean;
  indicatorColor?: string;
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
  selectedTextTone,
  mode,
  onChange,
  style,
  testID,
}: VenezuelaDisplayModeSelectorProps) {
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
          { label: '$ BCV', value: 'VES_BCV' },
          { label: '€ BCV', value: 'EUR' },
        ]}
        selectedTextTone={
          selectedTextTone ?? (indicatorColor ? 'onBrand' : 'primary')
        }
        selectedValue={mode}
        testID={testID ? `${testID}-control` : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
});
