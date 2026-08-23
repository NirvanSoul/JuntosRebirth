import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { SelectableOption } from '@/components/ui/SelectableOption/SelectableOption';
import { Text } from '@/components/ui/Text/Text';
import type { CurrencySwitchReason } from '@/features/transactions/utils/transactionAmount';
import {
  getCurrencyFlag,
  getCurrencyName,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import { layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';

export const currencySwitchErrorMessages: Record<CurrencySwitchReason, string> =
  {
    fraction_not_allowed:
      'La moneda elegida no admite decimales. Ajusta el importe antes de cambiar.',
    unsafe_integer: 'El importe es demasiado grande para esta moneda.',
  };

export type TransactionCurrencyPickerModalProps = {
  availableCurrencies: readonly CurrencyCode[];
  currency: CurrencyCode;
  error?: CurrencySwitchReason | null;
  visible: boolean;
  onClose: () => void;
  onSelectCurrency: (currency: CurrencyCode) => void;
};

export function TransactionCurrencyPickerModal({
  availableCurrencies,
  currency,
  error,
  visible,
  onClose,
  onSelectCurrency,
}: TransactionCurrencyPickerModalProps) {
  const [draftCurrency, setDraftCurrency] = useState(currency);

  useEffect(() => {
    if (visible) {
      setDraftCurrency(currency);
    }
  }, [currency, visible]);

  return (
    <AppModal
      onClose={onClose}
      stackBehavior="push"
      testID="transaction-currency-picker"
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
              indicatorTestID={`transaction-currency-${code}-check`}
              key={code}
              label={`${getCurrencyFlag(code)}  ${getCurrencyName(code)} · ${code}`}
              onPress={() => setDraftCurrency(code)}
              selected={draftCurrency === code}
            />
          ))}
        </View>

        {error ? (
          <Text tone="expense" variant="footnote">
            {currencySwitchErrorMessages[error]}
          </Text>
        ) : null}

        <ModalPrimaryAction
          accessibilityLabel="Guardar moneda"
          label="Guardar"
          onPress={() => onSelectCurrency(draftCurrency)}
          style={styles.saveButton}
        />
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    paddingBottom: spacing.sm,
  },
  header: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  saveButton: { marginTop: spacing.md },
});
