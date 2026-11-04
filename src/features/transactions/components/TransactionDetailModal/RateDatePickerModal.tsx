import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { AppCalendar } from '@/components/ui/AppCalendar/AppCalendar';
import { CalendarMonthGrid } from '@/components/ui/AppCalendar/CalendarMonthGrid';
import { Text, type TextTone } from '@/components/ui/Text/Text';
import { getFirstVenezuelaRateDate } from '@/features/exchangeRates/gateways/juntossVenezuelaRateHistoryGateway';
import { useDepsChanged } from '@/hooks/useDepsChanged';
import { getLocalTodayKey } from '@/lib/date/localDate';
import { spacing } from '@/theme/spacing';

type RateDatePickerModalProps = {
  /** Color del botón principal: el degradado de la categoría. */
  accentColor?: string;
  accentTextTone?: TextTone;
  onClose: () => void;
  onSelect: (date: string) => void;
  selectedDate: string;
  visible: boolean;
};

/**
 * Elige el día con cuyas tasas se lee el importe de un movimiento: desde la
 * primera tasa de 2026 guardada hasta hoy. «Hoy» aplica la tasa de hoy sin
 * tener que buscarla en el calendario.
 */
export function RateDatePickerModal({
  accentColor,
  accentTextTone,
  onClose,
  onSelect,
  selectedDate,
  visible,
}: RateDatePickerModalProps) {
  const [draftDate, setDraftDate] = useState(selectedDate);
  const [minDate, setMinDate] = useState<string | undefined>(undefined);
  /** Mes que muestra el calendario (`YYYY-MM`) y si se eligen meses. */
  const [visibleMonth, setVisibleMonth] = useState(selectedDate.slice(0, 7));
  const [isMonthGridVisible, setMonthGridVisible] = useState(false);
  /** Cambia solo al saltar de mes desde la cuadrícula, para recolocarlo. */
  const [monthJump, setMonthJump] = useState(0);
  const today = getLocalTodayKey();

  if (useDepsChanged([selectedDate, visible]) && visible) {
    setDraftDate(selectedDate);
    setVisibleMonth(selectedDate.slice(0, 7));
    setMonthGridVisible(false);
  }

  const selectMonth = (month: string) => {
    setVisibleMonth(month);
    setMonthJump((jump) => jump + 1);
    setMonthGridVisible(false);
  };

  useEffect(() => {
    if (!visible) return;
    let isCurrent = true;
    void getFirstVenezuelaRateDate().then((date) => {
      if (isCurrent) setMinDate(date);
    });
    return () => {
      isCurrent = false;
    };
  }, [visible]);

  return (
    <AppModal
      onClose={onClose}
      stackBehavior="push"
      testID="rate-date-picker"
      visible={visible}
    >
      <View style={styles.header}>
        <ModalCloseButton onPress={onClose} variant="back" />
        <View style={styles.headerText}>
          <Text accessibilityRole="header" variant="heading">
            Tasa de otro día
          </Text>
          <Text tone="secondary" variant="footnote">
            Mira cuánto valía este importe en otra fecha.
          </Text>
        </View>
      </View>

      {isMonthGridVisible ? (
        <CalendarMonthGrid
          accentColor={accentColor}
          maxMonth={today.slice(0, 7)}
          minMonth={minDate?.slice(0, 7)}
          onClose={() => setMonthGridVisible(false)}
          onSelectMonth={selectMonth}
          selectedMonth={visibleMonth}
          testID="rate-date-months"
        />
      ) : (
        <AppCalendar
          currentDate={
            draftDate.startsWith(visibleMonth)
              ? draftDate
              : `${visibleMonth}-01`
          }
          key={`${monthJump}|${minDate ?? ''}`}
          maxDate={today}
          minDate={minDate}
          onFocusedMonthChange={setVisibleMonth}
          onPressHeader={() => setMonthGridVisible(true)}
          onSelectDate={setDraftDate}
          selectedColor={accentColor}
          selectedDate={draftDate}
          testID="rate-date-calendar"
        />
      )}

      <View style={styles.actions}>
        <ModalPrimaryAction
          accessibilityLabel="Usar la tasa de hoy"
          label="Hoy"
          onPress={() => onSelect(today)}
          style={styles.todayButton}
          testID="rate-date-today"
          variant="surface"
        />
        <ModalPrimaryAction
          accessibilityLabel="Seleccionar fecha de la tasa"
          gradientColor={accentColor}
          gradientTextTone={accentTextTone}
          label="Seleccionar fecha"
          onPress={() => onSelect(draftDate)}
          style={styles.selectButton}
          testID="rate-date-select"
        />
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerText: { flex: 1, gap: spacing.xs },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  todayButton: { flex: 1 },
  selectButton: { flex: 2 },
});
