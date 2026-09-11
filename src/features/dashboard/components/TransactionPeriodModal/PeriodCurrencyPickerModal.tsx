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

type PeriodCurrencyPickerModalProps = {
  availableCurrencies: readonly CurrencyCode[];
  effectiveCurrency: CurrencyCode;
  onClose: () => void;
  onSelectCurrency: (code: CurrencyCode) => void;
  type: string;
  visible: boolean;
};

export function PeriodCurrencyPickerModal({
  availableCurrencies,
  effectiveCurrency,
  onClose,
  onSelectCurrency,
  type,
  visible,
}: PeriodCurrencyPickerModalProps) {
  return (
    <AppModal
      onClose={onClose}
      stackBehavior="push"
      testID={`${type}-period-currency-picker`}
      visible={visible}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <ModalCloseButton onPress={onClose} variant="back" />
          <Text accessibilityRole="header" variant="heading">
            Elige la moneda
          </Text>
        </View>

        <View accessibilityRole="radiogroup" style={styles.list}>
          {availableCurrencies.map((code) => (
            <SelectableOption
              accessibilityLabel={`${getCurrencyFlag(code)} ${getCurrencyName(code)} (${code})`}
              indicatorTestID={`${type}-period-currency-${code}-check`}
              key={code}
              label={`${getCurrencyFlag(code)}  ${getCurrencyName(code)} · ${code}`}
              onPress={() => onSelectCurrency(code)}
              selected={code === effectiveCurrency}
              testID={`${type}-period-currency-${code}-option`}
            />
          ))}
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  list: { gap: spacing.sm },
});
