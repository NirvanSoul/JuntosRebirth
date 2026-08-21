import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { SelectableOption } from '@/components/ui/SelectableOption/SelectableOption';
import { Text } from '@/components/ui/Text/Text';
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

export type TransactionRecurrencePickerModalProps = {
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

const optionPickerStyles = StyleSheet.create({
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
