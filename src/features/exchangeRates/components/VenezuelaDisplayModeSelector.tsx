import { StyleSheet, View } from 'react-native';

import { SegmentedControl } from '@/components/ui/SegmentedControl/SegmentedControl';
import { Text } from '@/components/ui/Text/Text';
import type { VenezuelaDisplayMode } from '@/features/exchangeRates/utils/venezuelaDisplayMode';
import { spacing } from '@/theme/spacing';

type VenezuelaDisplayModeSelectorProps = {
  mode: VenezuelaDisplayMode;
  onChange: (mode: VenezuelaDisplayMode) => void;
  testID?: string;
};

/** Cambia solo cómo se lee un valor VE; nunca modifica el importe guardado. */
export function VenezuelaDisplayModeSelector({
  mode,
  onChange,
  testID,
}: VenezuelaDisplayModeSelectorProps) {
  return (
    <View style={styles.container} testID={testID}>
      <Text tone="secondary" variant="caption">
        Ver en
      </Text>
      <SegmentedControl
        onChange={onChange}
        options={[
          { label: 'USD', value: 'USD' },
          { label: 'Bs. BCV', value: 'VES_BCV' },
          { label: 'EUR', value: 'EUR' },
        ]}
        selectedValue={mode}
        testID={testID ? `${testID}-control` : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
});
