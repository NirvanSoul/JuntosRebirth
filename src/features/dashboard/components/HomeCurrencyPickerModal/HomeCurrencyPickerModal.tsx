import { StyleSheet, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { SelectableOption } from '@/components/ui/SelectableOption/SelectableOption';
import { Text } from '@/components/ui/Text/Text';
import {
  getCurrencyFlag,
  getCurrencyName,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import { spacing } from '@/theme/spacing';

type HomeCurrencyPickerModalProps = {
  currencies: readonly CurrencyCode[];
  onClose: () => void;
  onSelect: (currency: CurrencyCode) => void;
  selectedCurrency: CurrencyCode;
  visible: boolean;
};

export function HomeCurrencyPickerModal({
  currencies,
  onClose,
  onSelect,
  selectedCurrency,
  visible,
}: HomeCurrencyPickerModalProps) {
  return (
    <AppModal onClose={onClose} testID="home-currency-picker" visible={visible}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text
            accessibilityRole="header"
            style={styles.headerText}
            variant="heading"
          >
            Elige la moneda
          </Text>
          <ModalCloseButton onPress={onClose} />
        </View>

        <View accessibilityRole="radiogroup" style={styles.list}>
          {currencies.map((code) => (
            <SelectableOption
              accessibilityLabel={`${getCurrencyFlag(code)} ${getCurrencyName(code)} (${code})`}
              indicatorTestID={`home-currency-${code}-check`}
              key={code}
              label={`${getCurrencyFlag(code)}  ${getCurrencyName(code)} · ${code}`}
              onPress={() => onSelect(code)}
              selected={code === selectedCurrency}
              testID={`home-currency-${code}-option`}
            />
          ))}
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerText: { flex: 1 },
  list: { gap: spacing.sm },
});
