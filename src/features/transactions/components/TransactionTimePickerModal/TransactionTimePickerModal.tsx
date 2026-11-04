import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import { useDepsChanged } from '@/hooks/useDepsChanged';
import { formatTimeOfDay, timeOfDayToDate } from '@/lib/date/timeOfDay';
import { layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/useTheme';

type TransactionTimePickerModalProps = {
  /** Hora guardada `HH:mm`; sin ella el selector parte de la hora actual. */
  occurredTime?: string;
  visible: boolean;
  onClose: () => void;
  /** `null` quita la hora del movimiento. */
  onSelect: (occurredTime: string | null) => void;
};

function initialPickerDate(occurredTime: string | undefined): Date {
  return occurredTime ? timeOfDayToDate(occurredTime) : new Date();
}

/**
 * Selector nativo de la hora de un movimiento. En iOS es una hoja apilada
 * sobre el detalle, como el selector de fecha; en Android, el diálogo del
 * sistema, cuyo botón neutro quita la hora. Ambos respetan el formato 12/24 h
 * del dispositivo.
 */
export function TransactionTimePickerModal({
  occurredTime,
  visible,
  onClose,
  onSelect,
}: TransactionTimePickerModalProps) {
  const { colors, colorScheme } = useTheme();
  const [draftDate, setDraftDate] = useState(() =>
    initialPickerDate(occurredTime),
  );

  if (useDepsChanged([occurredTime, visible]) && visible) {
    setDraftDate(initialPickerDate(occurredTime));
  }

  if (Platform.OS !== 'ios') {
    if (!visible) return null;
    return (
      <DateTimePicker
        display="default"
        mode="time"
        neutralButton={occurredTime ? { label: 'Quitar hora' } : undefined}
        onDismiss={onClose}
        onNeutralButtonPress={() => onSelect(null)}
        onValueChange={(_event, date) => onSelect(formatTimeOfDay(date))}
        testID="transaction-time-picker"
        value={draftDate}
      />
    );
  }

  return (
    <AppModal
      // La hoja no debe robarle el arrastre vertical a la rueda.
      enableContentPanningGesture={false}
      onClose={onClose}
      stackBehavior="push"
      testID="transaction-time-picker-modal"
      visible={visible}
    >
      <View style={styles.header}>
        <ModalCloseButton onPress={onClose} variant="back" />
        <View style={styles.headerText}>
          <Text accessibilityRole="header" variant="heading">
            Elige una hora
          </Text>
        </View>
      </View>

      <DateTimePicker
        display="spinner"
        mode="time"
        onValueChange={(_event, date) => setDraftDate(date)}
        style={styles.picker}
        testID="transaction-time-picker"
        // Sigue el tema de la app, que puede no coincidir con el del sistema.
        textColor={colors.textPrimary}
        themeVariant={colorScheme}
        value={draftDate}
      />

      <ModalPrimaryAction
        accessibilityLabel="Guardar hora"
        label="Guardar"
        onPress={() => onSelect(formatTimeOfDay(draftDate))}
        style={styles.saveButton}
        testID="transaction-time-save"
      />
      {occurredTime ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => onSelect(null)}
          style={({ pressed }) => [
            styles.removeButton,
            pressed && styles.pressed,
          ]}
          testID="transaction-time-remove"
        >
          <Text tone="secondary" variant="label" weight="bold">
            Quitar hora
          </Text>
        </Pressable>
      ) : null}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerText: { flex: 1, gap: spacing.xs },
  picker: { alignSelf: 'center', marginTop: spacing.lg },
  saveButton: { marginTop: spacing.xl },
  removeButton: {
    minHeight: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  pressed: { opacity: 0.64 },
});
