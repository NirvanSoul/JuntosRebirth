import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { AppCalendar } from '@/components/ui/AppCalendar/AppCalendar';
import { Text } from '@/components/ui/Text/Text';
import { ReminderTimesEditor } from '@/features/transactions/components/ReminderTimesEditor/ReminderTimesEditor';
import type { TransactionReminder } from '@/features/transactions/types';
import { getLocalTodayKey } from '@/lib/date/localDate';
import { layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';

type Step = 'date' | 'times';

type TransactionReminderModalProps = {
  onClose: () => void;
  onRemove: () => boolean | Promise<boolean>;
  onSave: (input: {
    remindOn: string;
    times: readonly string[];
  }) => boolean | Promise<boolean>;
  reminder: TransactionReminder | null;
  transactionOccurredOn: string;
  transactionTitle: string;
  visible: boolean;
};

function capitalize(text: string): string {
  return text.length > 0 ? text[0]!.toUpperCase() + text.slice(1) : text;
}

function formatReminderDate(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`);
  const weekday = capitalize(
    new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(date),
  );
  const day = new Intl.DateTimeFormat('es-ES', { day: 'numeric' }).format(date);
  const month = capitalize(
    new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(date),
  );
  const year = new Intl.DateTimeFormat('es-ES', { year: 'numeric' }).format(
    date,
  );
  return `${weekday}, ${day} de ${month} de ${year}`;
}

export function TransactionReminderModal({
  onClose,
  onRemove,
  onSave,
  reminder,
  transactionOccurredOn,
  transactionTitle,
  visible,
}: TransactionReminderModalProps) {
  const today = getLocalTodayKey();
  const [step, setStep] = useState<Step>('date');
  const [draftDate, setDraftDate] = useState(today);
  const [draftTimes, setDraftTimes] = useState<readonly string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setSaving] = useState(false);
  const [isRemoving, setRemoving] = useState(false);

  useEffect(() => {
    if (!visible) return;

    setStep('date');
    setDraftDate(
      reminder?.remindOn ??
        (transactionOccurredOn >= today ? transactionOccurredOn : today),
    );
    setDraftTimes(reminder?.times ?? []);
    setError(null);
    setSaving(false);
    setRemoving(false);
  }, [reminder, today, transactionOccurredOn, visible]);

  const handleSelectDate = (date: string) => {
    if (date < today) return;
    setDraftDate(date);
  };

  const handleSave = () => {
    if (draftTimes.length === 0 || isSaving) return;
    setSaving(true);
    setError(null);
    void Promise.resolve()
      .then(() => onSave({ remindOn: draftDate, times: draftTimes }))
      .then((succeeded) => {
        if (succeeded) {
          onClose();
          return;
        }
        setError(
          'No pudimos programar el recordatorio. Revisa los permisos de notificaciones e inténtalo de nuevo.',
        );
      })
      .catch(() =>
        setError(
          'No pudimos programar el recordatorio. Revisa los permisos de notificaciones e inténtalo de nuevo.',
        ),
      )
      .finally(() => setSaving(false));
  };

  const handleRemove = () => {
    if (isRemoving) return;
    setRemoving(true);
    setError(null);
    void Promise.resolve()
      .then(() => onRemove())
      .then((succeeded) => {
        if (succeeded) {
          onClose();
          return;
        }
        setError('No pudimos quitar el recordatorio. Inténtalo de nuevo.');
      })
      .catch(() =>
        setError('No pudimos quitar el recordatorio. Inténtalo de nuevo.'),
      )
      .finally(() => setRemoving(false));
  };

  return (
    <AppModal
      onClose={onClose}
      stackBehavior="push"
      testID="transaction-reminder-modal"
      visible={visible}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <ModalCloseButton
            onPress={step === 'times' ? () => setStep('date') : onClose}
            variant="back"
          />
          <View style={styles.headerCopy}>
            <Text accessibilityRole="header" variant="heading">
              {step === 'date' ? '¿Qué día te recordamos?' : 'Elige las horas'}
            </Text>
            <Text numberOfLines={1} tone="secondary" variant="footnote">
              {transactionTitle}
            </Text>
          </View>
        </View>

        {step === 'date' ? (
          <>
            <AppCalendar
              currentDate={draftDate}
              onSelectDate={handleSelectDate}
              selectedDate={draftDate}
              testID="transaction-reminder-calendar"
            />
            <ModalPrimaryAction
              accessibilityLabel="Continuar a elegir las horas"
              label="Continuar"
              onPress={() => setStep('times')}
              style={styles.continueButton}
            />
          </>
        ) : (
          <View style={styles.timesContent}>
            <Text tone="secondary" variant="body">
              {formatReminderDate(draftDate)}
            </Text>

            <ReminderTimesEditor onChange={setDraftTimes} times={draftTimes} />

            {error ? (
              <Text
                accessibilityLiveRegion="polite"
                tone="expense"
                variant="footnote"
              >
                {error}
              </Text>
            ) : null}

            <ModalPrimaryAction
              accessibilityLabel="Guardar recordatorio"
              disabled={draftTimes.length === 0 || isSaving}
              label={isSaving ? 'Guardando…' : 'Guardar recordatorio'}
              mutedWhenDisabled
              onPress={handleSave}
              style={styles.saveButton}
            />
            {reminder ? (
              <Pressable
                accessibilityLabel="Quitar recordatorio"
                accessibilityRole="button"
                disabled={isRemoving}
                onPress={handleRemove}
                style={({ pressed }) => [
                  styles.removeButton,
                  (pressed || isRemoving) && styles.pressed,
                ]}
              >
                <Text tone="expense" variant="label" weight="semibold">
                  {isRemoving ? 'Quitando…' : 'Quitar recordatorio'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.lg },
  header: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerCopy: { flex: 1, gap: spacing.xxs },
  continueButton: { marginTop: spacing.xl },
  timesContent: { gap: spacing.md },
  saveButton: { marginTop: spacing.sm },
  removeButton: {
    minHeight: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.64 },
});
