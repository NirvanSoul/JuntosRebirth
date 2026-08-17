import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { SelectableOption } from '@/components/ui/SelectableOption/SelectableOption';
import { Text } from '@/components/ui/Text/Text';
import type { MoneyAccount } from '@/features/accounts/types';
import {
  getCurrencyFlag,
  getCurrencyName,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import type { TransactionRecurrence } from '@/features/transactions/types';
import { layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';

import { TransactionCustomRecurrenceModal } from './TransactionCustomRecurrenceModal';

export const defaultRecurrence: {
  value: TransactionRecurrence;
  label: string;
} = { value: 'once', label: 'Único' };

export const recurrenceOptions: readonly (typeof defaultRecurrence)[] = [
  defaultRecurrence,
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'custom', label: 'Personalizada' },
];

type TransactionMoneyAccountPickerModalProps = {
  accounts: readonly MoneyAccount[];
  moneyAccountId: string | undefined;
  visible: boolean;
  onClose: () => void;
  onCreateMoneyAccount?: () => void;
  onSelectMoneyAccount: (moneyAccountId: string | undefined) => void;
};

export function TransactionMoneyAccountPickerModal({
  accounts,
  moneyAccountId,
  visible,
  onClose,
  onCreateMoneyAccount,
  onSelectMoneyAccount,
}: TransactionMoneyAccountPickerModalProps) {
  const [draftMoneyAccountId, setDraftMoneyAccountId] =
    useState(moneyAccountId);

  useEffect(() => {
    if (visible) {
      setDraftMoneyAccountId(moneyAccountId);
    }
  }, [moneyAccountId, visible]);

  return (
    <AppModal
      onClose={onClose}
      stackBehavior="push"
      testID="transaction-money-account-picker"
      visible={visible}
    >
      <View style={optionPickerStyles.container}>
        <View style={optionPickerStyles.header}>
          <ModalCloseButton onPress={onClose} variant="back" />
          <Text accessibilityRole="header" variant="heading">
            Elige la cuenta
          </Text>
        </View>

        <View accessibilityRole="radiogroup" style={optionPickerStyles.list}>
          <SelectableOption
            accessibilityLabel="Sin cuenta"
            indicatorTestID="transaction-money-account-none-check"
            label="Sin cuenta"
            onPress={() => setDraftMoneyAccountId(undefined)}
            selected={draftMoneyAccountId === undefined}
          />
          {accounts.map((account) => (
            <SelectableOption
              accessibilityLabel={`${account.name} · ${account.currency}`}
              indicatorTestID={`transaction-money-account-${account.id}-check`}
              key={account.id}
              label={`${account.name} · ${account.currency}`}
              onPress={() => setDraftMoneyAccountId(account.id)}
              selected={draftMoneyAccountId === account.id}
            />
          ))}
        </View>

        {onCreateMoneyAccount ? (
          <Pressable
            accessibilityLabel="Crear cuenta"
            accessibilityRole="button"
            onPress={onCreateMoneyAccount}
            style={({ pressed }) => [
              optionPickerStyles.secondaryAction,
              pressed && { opacity: 0.64 },
            ]}
            testID="transaction-money-account-create"
          >
            <Text tone="secondary" variant="footnote" weight="semibold">
              Crear cuenta
            </Text>
          </Pressable>
        ) : null}

        <ModalPrimaryAction
          accessibilityLabel="Guardar cuenta"
          label="Guardar"
          onPress={() => onSelectMoneyAccount(draftMoneyAccountId)}
          style={optionPickerStyles.saveButton}
        />
      </View>
    </AppModal>
  );
}

type TransactionCurrencyPickerModalProps = {
  availableCurrencies: readonly CurrencyCode[];
  currency: CurrencyCode;
  visible: boolean;
  onClose: () => void;
  onSelectCurrency: (currency: CurrencyCode) => void;
};

export function TransactionCurrencyPickerModal({
  availableCurrencies,
  currency,
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
      <View style={optionPickerStyles.container}>
        <View style={optionPickerStyles.header}>
          <ModalCloseButton onPress={onClose} variant="back" />
          <Text accessibilityRole="header" variant="heading">
            Elige la moneda
          </Text>
        </View>

        <View accessibilityRole="radiogroup" style={optionPickerStyles.list}>
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

        <ModalPrimaryAction
          accessibilityLabel="Guardar moneda"
          label="Guardar"
          onPress={() => onSelectCurrency(draftCurrency)}
          style={optionPickerStyles.saveButton}
        />
      </View>
    </AppModal>
  );
}

export const optionPickerStyles = StyleSheet.create({
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
  secondaryAction: {
    minHeight: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: { marginTop: spacing.md },
});

type TransactionRecurrencePickerModalProps = {
  customOccurrenceDates: readonly string[];
  initialDate: string;
  recurrenceIndex: number;
  visible: boolean;
  onClose: () => void;
  onSelectRecurrence: (index: number) => void;
  onSelectCustomDates: (dates: readonly string[]) => void;
};

export function TransactionRecurrencePickerModal({
  customOccurrenceDates,
  initialDate,
  recurrenceIndex,
  visible,
  onClose,
  onSelectRecurrence,
  onSelectCustomDates,
}: TransactionRecurrencePickerModalProps) {
  const [draftRecurrenceIndex, setDraftRecurrenceIndex] =
    useState(recurrenceIndex);
  const [isCustomPickerVisible, setCustomPickerVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setDraftRecurrenceIndex(recurrenceIndex);
      setCustomPickerVisible(false);
    }
  }, [recurrenceIndex, visible]);

  return (
    <>
      <AppModal
        onClose={onClose}
        stackBehavior="push"
        testID="transaction-recurrence-picker"
        visible={visible}
      >
        <View style={optionPickerStyles.container}>
          <View style={optionPickerStyles.header}>
            <ModalCloseButton onPress={onClose} variant="back" />
            <Text accessibilityRole="header" variant="heading">
              Elige la recurrencia
            </Text>
          </View>

          <View accessibilityRole="radiogroup" style={optionPickerStyles.list}>
            {recurrenceOptions.map((option, index) => {
              const selected = index === draftRecurrenceIndex;

              return (
                <SelectableOption
                  accessibilityLabel={option.label}
                  indicatorTestID={`transaction-recurrence-${option.value}-check`}
                  key={option.value}
                  label={option.label}
                  onPress={() => {
                    setDraftRecurrenceIndex(index);
                    if (option.value === 'custom') {
                      setCustomPickerVisible(true);
                    }
                  }}
                  selected={selected}
                />
              );
            })}
          </View>

          <ModalPrimaryAction
            accessibilityLabel="Guardar recurrencia"
            disabled={
              recurrenceOptions[draftRecurrenceIndex]?.value === 'custom' &&
              customOccurrenceDates.length === 0
            }
            label="Guardar"
            onPress={() => onSelectRecurrence(draftRecurrenceIndex)}
            style={optionPickerStyles.saveButton}
          />
        </View>
      </AppModal>
      <TransactionCustomRecurrenceModal
        initialDate={initialDate}
        onClose={() => setCustomPickerVisible(false)}
        onSelect={(dates) => {
          onSelectCustomDates(dates);
          setDraftRecurrenceIndex(
            recurrenceOptions.findIndex((option) => option.value === 'custom'),
          );
          setCustomPickerVisible(false);
        }}
        selectedDates={customOccurrenceDates}
        visible={isCustomPickerVisible}
      />
    </>
  );
}
