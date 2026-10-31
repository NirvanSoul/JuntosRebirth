import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { SelectableOption } from '@/components/ui/SelectableOption/SelectableOption';
import { CreatePreviewBadge } from '@/components/ui/CreatePreviewBadge/CreatePreviewBadge';
import { Text } from '@/components/ui/Text/Text';
import { MoneyAccountPickerGrid } from '@/features/accounts/components/MoneyAccountPickerGrid/MoneyAccountPickerGrid';
import type { MoneyAccountSummary } from '@/features/accounts/utils/moneyAccountSummary';
import {
  getCurrencyFlag,
  getCurrencyName,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import type { TransactionRecurrence } from '@/features/transactions/types';
import { useDepsChanged } from '@/hooks/useDepsChanged';
import { layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import { useCurrencySymbolPreference } from '@/state/appPreferences/CurrencySymbolPreferenceProvider';

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
  accounts: readonly MoneyAccountSummary[];
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

  if (useDepsChanged([moneyAccountId, visible]) && visible) {
    setDraftMoneyAccountId(moneyAccountId);
  }

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
          <MoneyAccountPickerGrid
            accounts={accounts}
            onSelect={setDraftMoneyAccountId}
            selectedId={draftMoneyAccountId}
          />

          <View style={optionPickerStyles.badgeRow}>
            <CreatePreviewBadge
              accessibilityLabel="Sin cuenta"
              bordered
              label="Sin cuenta"
              onPress={() => setDraftMoneyAccountId(undefined)}
              removeSelected={draftMoneyAccountId === undefined}
              testID="money-account-picker-none"
            />
            {onCreateMoneyAccount ? (
              <CreatePreviewBadge
                accessibilityLabel="Crear cuenta"
                bordered
                label="Crear cuenta"
                onPress={onCreateMoneyAccount}
                testID="transaction-money-account-create"
              />
            ) : null}
          </View>
        </View>

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
  /** Para Venezuela el flujo de captura solo ofrece USD y VES. */
  venezuelaMode?: boolean;
  visible: boolean;
  onClose: () => void;
  onSelectCurrency: (currency: CurrencyCode) => void;
};

export function TransactionCurrencyPickerModal({
  availableCurrencies,
  currency,
  venezuelaMode = false,
  visible,
  onClose,
  onSelectCurrency,
}: TransactionCurrencyPickerModalProps) {
  const { showCurrencySymbols } = useCurrencySymbolPreference();
  const [draftCurrency, setDraftCurrency] = useState(currency);

  if (useDepsChanged([currency, visible]) && visible) {
    setDraftCurrency(currency);
  }

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
          {(venezuelaMode
            ? (['USD', 'VES'] as const)
            : availableCurrencies
          ).map((code) => (
            <SelectableOption
              accessibilityLabel={
                venezuelaMode
                  ? code === 'USD'
                    ? 'Dólares estadounidenses'
                    : 'Bolívares venezolanos'
                  : `${getCurrencyFlag(code)} ${getCurrencyName(code)} (${code})`
              }
              indicatorTestID={`transaction-currency-${code}-check`}
              key={code}
              label={
                venezuelaMode
                  ? code === 'USD'
                    ? showCurrencySymbols
                      ? '$  Dólares'
                      : 'Dólares'
                    : showCurrencySymbols
                      ? 'Bs.  Bolívares'
                      : 'Bolívares'
                  : `${getCurrencyFlag(code)}  ${getCurrencyName(code)} · ${code}`
              }
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
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
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

  if (useDepsChanged([recurrenceIndex, visible]) && visible) {
    setDraftRecurrenceIndex(recurrenceIndex);
    setCustomPickerVisible(false);
  }

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
