import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import {
  AppCalendar,
  type MarkedDates,
} from '@/components/ui/AppCalendar/AppCalendar';
import { Text } from '@/components/ui/Text/Text';
import { getLocalDateKey } from '@/features/transactions/utils/transactionSummary';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/useTheme';

export type TransactionDateRange = {
  endDate: string;
  startDate: string;
};

type TransactionDateRangePickerModalProps = {
  initialRange?: TransactionDateRange;
  onClose: () => void;
  onSelect: (range: TransactionDateRange) => void;
  visible: boolean;
};

function dateFromKey(date: string): Date {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  return new Date(year, month - 1, day, 12);
}

function addDay(date: string): string {
  const next = dateFromKey(date);
  next.setDate(next.getDate() + 1);
  return getLocalDateKey(next);
}

export function formatTransactionDateRangeDate(date: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
    .format(dateFromKey(date))
    .replace('.', '');
}

export function TransactionDateRangePickerModal({
  initialRange,
  onClose,
  onSelect,
  visible,
}: TransactionDateRangePickerModalProps) {
  const { colors } = useTheme();
  const today = getLocalDateKey(new Date());
  const [draftRange, setDraftRange] = useState<TransactionDateRange>({
    startDate: today,
    endDate: today,
  });
  const [selectingEnd, setSelectingEnd] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setDraftRange(initialRange ?? { startDate: today, endDate: today });
    setSelectingEnd(false);
  }, [initialRange, today, visible]);

  const markedDates = useMemo(() => {
    const dates: MarkedDates = {};
    let date = draftRange.startDate;
    while (date <= draftRange.endDate) {
      dates[date] = {
        selected: true,
        selectedColor: colors.cta,
        selectedTextColor: colors.onBrand,
      };
      date = addDay(date);
    }
    return dates;
  }, [colors, draftRange]);

  const selectDate = (date: string) => {
    if (!selectingEnd) {
      setDraftRange({ startDate: date, endDate: date });
      setSelectingEnd(true);
      return;
    }

    setDraftRange((current) => ({
      startDate: date < current.startDate ? date : current.startDate,
      endDate: date < current.startDate ? current.startDate : date,
    }));
    setSelectingEnd(false);
  };

  return (
    <AppModal
      onClose={onClose}
      stackBehavior="push"
      testID="transaction-date-range-picker"
      visible={visible}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <ModalCloseButton onPress={onClose} variant="back" />
          <View style={styles.headerText}>
            <Text accessibilityRole="header" variant="heading">
              Elige un rango
            </Text>
            <Text tone="secondary" variant="footnote">
              {selectingEnd
                ? 'Ahora selecciona la fecha final.'
                : 'Selecciona la fecha inicial.'}
            </Text>
          </View>
        </View>

        <AppCalendar
          currentDate={draftRange.endDate}
          markedDates={markedDates}
          onSelectDate={selectDate}
          testID="transaction-date-range-calendar"
        />

        <Text align="center" tone="secondary" variant="footnote">
          {formatTransactionDateRangeDate(draftRange.startDate)} —{' '}
          {formatTransactionDateRangeDate(draftRange.endDate)}
        </Text>

        <ModalPrimaryAction
          accessibilityLabel="Guardar rango de fechas"
          label="Guardar rango"
          onPress={() => onSelect(draftRange)}
          style={styles.saveButton}
        />
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.none },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerText: { flex: 1, gap: spacing.xs },
  saveButton: { marginTop: spacing.xl },
});
