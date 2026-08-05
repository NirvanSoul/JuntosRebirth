import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { MarkedDates } from 'react-native-calendars/src/types';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { AppCalendar } from '@/components/ui/AppCalendar/AppCalendar';
import { Text } from '@/components/ui/Text/Text';
import { normalizeCustomOccurrenceDates } from '@/features/transactions/utils/transactionRecurrence';
import { colors } from '@/theme/colors';
import { layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { maxFontScale, typography } from '@/theme/typography';

type TransactionCustomRecurrenceModalProps = {
  initialDate: string;
  selectedDates: readonly string[];
  visible: boolean;
  onClose: () => void;
  onSelect: (dates: readonly string[]) => void;
};

type Step = 'amount' | 'dates';

export function TransactionCustomRecurrenceModal({
  initialDate,
  selectedDates,
  visible,
  onClose,
  onSelect,
}: TransactionCustomRecurrenceModalProps) {
  const [step, setStep] = useState<Step>('amount');
  const [amountInput, setAmountInput] = useState('1');
  const [draftDates, setDraftDates] = useState<readonly string[]>([]);
  const [isUnlimited, setUnlimited] = useState(false);
  const amount = Number(amountInput);
  const hasValidAmount = Number.isSafeInteger(amount) && amount > 0;

  useEffect(() => {
    if (!visible) return;
    setStep('amount');
    setAmountInput(String(selectedDates.length || 1));
    setDraftDates(selectedDates);
    setUnlimited(false);
  }, [initialDate, selectedDates, visible]);

  const markedDates = useMemo<MarkedDates>(
    () =>
      Object.fromEntries(
        draftDates.map((date) => [
          date,
          {
            selected: true,
            selectedColor: colors.cta,
            selectedTextColor: colors.onBrand,
          },
        ]),
      ),
    [draftDates],
  );

  const handleDatePress = (date: string) => {
    setDraftDates((current) => {
      if (current.includes(date)) {
        return current.filter((selectedDate) => selectedDate !== date);
      }
      if (!isUnlimited && current.length >= amount) return current;
      return normalizeCustomOccurrenceDates([...current, date]);
    });
  };

  const handleContinue = () => {
    if (!hasValidAmount) return;
    setUnlimited(false);
    setDraftDates((current) => current.slice(0, amount));
    setStep('dates');
  };

  const handleUnlimited = () => {
    setUnlimited(true);
    setStep('dates');
  };

  return (
    <AppModal
      onClose={onClose}
      stackBehavior="push"
      testID="transaction-custom-recurrence-picker"
      visible={visible}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <ModalCloseButton
            onPress={step === 'dates' ? () => setStep('amount') : onClose}
            variant="back"
          />
          <Text accessibilityRole="header" variant="heading">
            {step === 'amount' ? 'Cantidad de repeticiones' : 'Elige los días'}
          </Text>
        </View>

        {step === 'amount' ? (
          <View style={styles.amountContent}>
            <Text tone="secondary" variant="body">
              Indica cuántas veces se registrará este movimiento.
            </Text>
            <BottomSheetTextInput
              accessibilityLabel="Cantidad de repeticiones"
              keyboardType="number-pad"
              maxFontSizeMultiplier={maxFontScale.body}
              maxLength={3}
              onChangeText={(value) =>
                setAmountInput(value.replace(/[^0-9]/g, ''))
              }
              placeholder="Ej. 3"
              placeholderTextColor={colors.textMuted}
              style={styles.amountInput}
              value={amountInput}
            />
            <ModalPrimaryAction
              accessibilityLabel="No estoy seguro"
              label="No estoy seguro"
              onPress={handleUnlimited}
              variant="surface"
            />
            <ModalPrimaryAction
              accessibilityLabel="Continuar a elegir días"
              disabled={!hasValidAmount}
              label="Continuar"
              mutedWhenDisabled
              onPress={handleContinue}
            />
          </View>
        ) : (
          <>
            <Text
              accessibilityLiveRegion="polite"
              tone="secondary"
              variant="body"
            >
              {isUnlimited
                ? `${draftDates.length} días seleccionados, sin límite`
                : `${draftDates.length} de ${amount} días seleccionados`}
            </Text>
            <AppCalendar
              currentDate={draftDates[0] ?? initialDate}
              markedDates={markedDates}
              onSelectDate={handleDatePress}
              testID="transaction-custom-recurrence-calendar"
            />
            <ModalPrimaryAction
              accessibilityLabel="Guardar días personalizados"
              disabled={
                isUnlimited
                  ? draftDates.length === 0
                  : draftDates.length !== amount
              }
              label="Guardar"
              mutedWhenDisabled
              onPress={() =>
                onSelect(normalizeCustomOccurrenceDates(draftDates))
              }
              style={styles.saveButton}
            />
          </>
        )}
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  header: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  amountContent: { gap: spacing.lg },
  amountInput: {
    minHeight: layout.controlHeight.regular,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    letterSpacing: typography.body.letterSpacing,
    paddingHorizontal: spacing.lg,
  },
  saveButton: { marginTop: spacing.lg },
});
