import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { AppCalendar } from '@/components/ui/AppCalendar/AppCalendar';
import { Text } from '@/components/ui/Text/Text';
import { spacing } from '@/theme/spacing';

type TransactionDatePickerModalProps = {
  selectedDate: string;
  visible: boolean;
  onClose: () => void;
  onSelect: (date: string) => void;
};

export function TransactionDatePickerModal({
  selectedDate,
  visible,
  onClose,
  onSelect,
}: TransactionDatePickerModalProps) {
  const [draftDate, setDraftDate] = useState(selectedDate);

  useEffect(() => {
    if (visible) setDraftDate(selectedDate);
  }, [selectedDate, visible]);

  return (
    <AppModal
      onClose={onClose}
      stackBehavior="push"
      testID="transaction-date-picker"
      visible={visible}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <ModalCloseButton onPress={onClose} variant="back" />
          <View style={styles.headerText}>
            <Text accessibilityRole="header" variant="heading">
              Elige una fecha
            </Text>
          </View>
        </View>

        <AppCalendar
          currentDate={draftDate}
          key={draftDate}
          onSelectDate={setDraftDate}
          selectedDate={draftDate}
          testID="transaction-date-calendar"
        />

        <ModalPrimaryAction
          accessibilityLabel="Guardar fecha"
          label="Guardar"
          onPress={() => onSelect(draftDate)}
          style={styles.saveButton}
        />
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.none,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  saveButton: { marginTop: spacing.xxl },
});
