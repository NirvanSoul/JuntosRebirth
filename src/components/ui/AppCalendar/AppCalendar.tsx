import {
  type ComponentProps,
  forwardRef,
  memo,
  type ReactElement,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import type { CalendarProps, DateData } from 'react-native-calendars';
import {
  MonthNavigatorArrow,
  MonthNavigatorLabel,
  MonthNavigatorLabelButton,
} from '@/components/ui/MonthNavigator/MonthNavigator';
import { createCalendarTheme } from '@/components/ui/AppCalendar/appCalendarTheme';
import '@/components/ui/AppCalendar/calendarLocale';
import { Text } from '@/components/ui/Text/Text';
import {
  getCalendarFutureMonthRange,
  getCalendarPastMonthRange,
  getMonthDistance,
  getMonthStartAtOffset,
  minimumCalendarDate,
} from '@/lib/date/monthDistance';
import { layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

// Tipos derivados del contrato público de react-native-calendars (ADR-079).
export type MarkedDates = NonNullable<CalendarProps['markedDates']>;

type AppCalendarProps = {
  currentDate: string;
  footer?: ReactElement | null;
  markedDates?: MarkedDates;
  /** Últimos y primeros días elegibles (`YYYY-MM-DD`); fuera quedan apagados. */
  maxDate?: string;
  minDate?: string;
  mode?: 'month' | 'scroll';
  onFocusedMonthChange?: (month: string, date?: string) => void;
  onPressHeader?: () => void; // Mes y año pulsables (solo en modo mes).
  onSelectDate: (date: string) => void;
  rangeEndDate?: string;
  selectedDate?: string;
  selectedColor?: string; // Fondo del día elegido; por defecto, el CTA.
  testID: string;
};

export type AppCalendarHandle = {
  scrollToDate: (date: string) => void;
};

const calendarFutureRange = 12;
const scrollCalendarDayHeight = 52;
const scrollCalendarNumberSize = 32;
const calendarDotSize = 7;
const scrollCalendarRenderWindow = 9;
// showSixWeeks mantiene seis filas por mes, con las celdas ajenas al mes
// vacías. La separación después de cada bloque evita que dos meses parezcan
// una única cuadrícula continua. El nombre del mes y Lun-Dom viven fuera de la
// lista (ver `ScrollWeekdayRow`).
const calendarGridRows = 6;
const calendarWeekRowVerticalMargin = spacing.sm;
const calendarMonthGridHeight =
  calendarGridRows *
  (scrollCalendarDayHeight + calendarWeekRowVerticalMargin * 2);
const calendarMonthSpacing = spacing.xl;
const calendarMonthHeight = calendarMonthGridHeight + calendarMonthSpacing;

export function getDominantScrollMonthIndex(
  contentOffsetY: number,
  viewportHeight: number,
  monthCount: number,
): number {
  if (monthCount <= 0) return -1;

  const viewportCenter = Math.max(0, contentOffsetY) + viewportHeight / 2;
  return Math.min(
    monthCount - 1,
    Math.max(0, Math.floor(viewportCenter / calendarMonthHeight)),
  );
}

type ScrollCalendarDayProps = Omit<
  ComponentProps<NonNullable<CalendarProps['dayComponent']>>,
  'date'
> & {
  date?: DateData;
  displayMonth: string;
};

function ScrollCalendarDay({
  accessibilityLabel,
  children,
  date,
  displayMonth,
  marking,
  onPress,
  state,
  testID,
}: ScrollCalendarDayProps) {
  const themedStyles = useThemedStyles(createThemedStyles);
  const isSelected = Boolean(marking?.selected) || state === 'selected';
  const isDisabled = Boolean(marking?.disabled) || state === 'disabled';
  const isToday = state === 'today';
  const isOutsideDisplayedMonth = date?.dateString.slice(0, 7) !== displayMonth;
  if (state === 'disabled' || isOutsideDisplayedMonth) {
    return <View style={styles.scrollDay} testID={testID} />;
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={isDisabled ? undefined : 'button'}
      accessibilityState={{ disabled: isDisabled, selected: isSelected }}
      disabled={isDisabled}
      hitSlop={spacing.xs}
      onPress={() => onPress?.(date)}
      style={({ pressed }) => [
        styles.scrollDay,
        pressed && styles.scrollDayPressed,
      ]}
      testID={testID}
    >
      <View
        style={[
          styles.scrollDayNumber,
          isToday && !isSelected && themedStyles.scrollDayToday,
          isSelected && themedStyles.scrollDaySelected,
        ]}
      >
        <Text tone={isSelected ? 'onBrand' : 'primary'} variant="body">
          {String(children)}
        </Text>
      </View>
      <View
        style={styles.calendarDots}
        testID={testID ? `${testID}.dots` : undefined}
      >
        {marking?.dots?.map((dot) => (
          <View
            key={dot.key ?? dot.color}
            style={[styles.calendarDot, { backgroundColor: dot.color }]}
            testID={
              testID ? `${testID}.dot.${dot.key ?? dot.color}` : undefined
            }
          />
        ))}
      </View>
    </Pressable>
  );
}

const scrollWeekdayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// El modo scroll no muestra cabecera dentro de cada mes: el nombre del mes lo
// pinta la pantalla que lo usa (ver la pestaña de mes de Mapa) y la fila
// Lun-Dom es fija fuera de la lista mediante `ScrollWeekdayRow`. `Calendar`
// siempre invoca el componente de `customHeader`, así que este no puede
// omitirse, pero al devolver `null` no ocupa espacio.
function ScrollCalendarNullHeader() {
  return null;
}

function ScrollWeekdayRow({ testID }: { testID: string }) {
  const themedStyles = useThemedStyles(createThemedStyles);

  return (
    <View style={themedStyles.scrollWeekdayRow} testID={`${testID}.dayNames`}>
      {scrollWeekdayLabels.map((label) => (
        <View key={label} style={styles.scrollWeekdayColumn}>
          <Text
            align="center"
            style={styles.scrollWeekdayLabel}
            testID={`${testID}.dayName_${label}`}
            tone="secondary"
            variant="footnote"
          >
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export const AppCalendar = memo(
  forwardRef<AppCalendarHandle, AppCalendarProps>(function AppCalendar(
    {
      currentDate,
      footer,
      markedDates = {},
      maxDate,
      minDate,
      mode = 'month',
      onFocusedMonthChange,
      onPressHeader,
      onSelectDate,
      rangeEndDate,
      selectedDate,
      selectedColor,
      testID,
    },
    ref,
  ) {
    const { colors } = useTheme();
    const themedStyles = useThemedStyles(createThemedStyles);
    const calendarTheme = useMemo(() => createCalendarTheme(colors), [colors]);
    const [scrollAnchorDate] = useState(currentDate);
    /** Mes visible en modo mes, `YYYY-MM`, para apagar flechas en los límites. */
    const [shownMonth, setShownMonth] = useState(currentDate.slice(0, 7));
    const futureScrollRange = getCalendarFutureMonthRange(
      scrollAnchorDate,
      rangeEndDate ?? scrollAnchorDate,
      rangeEndDate ? 0 : calendarFutureRange,
    );
    const pastScrollRange = getCalendarPastMonthRange(scrollAnchorDate);
    const scrollMonths = useMemo(
      () =>
        Array.from(
          { length: pastScrollRange + futureScrollRange + 1 },
          (_, index) =>
            getMonthStartAtOffset(scrollAnchorDate, index - pastScrollRange),
        ),
      [futureScrollRange, pastScrollRange, scrollAnchorDate],
    );
    const calendarListRef = useRef<FlatList<string>>(null);
    const onFocusedMonthChangeRef = useRef(onFocusedMonthChange);
    useEffect(() => {
      onFocusedMonthChangeRef.current = onFocusedMonthChange;
    });
    const lastReportedScrollMonthRef = useRef<string | null>(null);
    const dates = useMemo(
      () =>
        selectedDate
          ? {
              ...markedDates,
              [selectedDate]: {
                ...markedDates[selectedDate],
                selected: true,
                selectedColor: selectedColor ?? colors.cta,
                selectedTextColor: colors.onBrand,
              },
            }
          : markedDates,
      [colors, markedDates, selectedColor, selectedDate],
    );

    useImperativeHandle(
      ref,
      () => ({
        scrollToDate: (date) => {
          const index =
            pastScrollRange +
            getMonthDistance(scrollAnchorDate.slice(0, 7), date.slice(0, 7));
          if (index < 0 || index >= scrollMonths.length) return;
          calendarListRef.current?.scrollToIndex({
            animated: false,
            index,
            viewPosition: 0,
          });
        },
      }),
      [pastScrollRange, scrollAnchorDate, scrollMonths.length],
    );

    const handleDayPress = useCallback(
      ({ dateString }: { dateString: string }) => onSelectDate(dateString),
      [onSelectDate],
    );
    const commonProps = useMemo(
      () => ({
        current: mode === 'scroll' ? scrollAnchorDate : currentDate,
        firstDay: 1,
        hideExtraDays: mode !== 'scroll',
        markedDates: dates,
        markingType: 'multi-dot' as const,
        maxDate,
        minDate: minDate ?? minimumCalendarDate,
        monthFormat: 'MMMM yyyy',
        onDayPress: handleDayPress,
        testID,
        theme: calendarTheme,
      }),
      [
        calendarTheme,
        currentDate,
        dates,
        handleDayPress,
        maxDate,
        minDate,
        mode,
        scrollAnchorDate,
        testID,
      ],
    );
    const handleScroll = useCallback(
      ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
        const dominantIndex = getDominantScrollMonthIndex(
          nativeEvent.contentOffset.y,
          nativeEvent.layoutMeasurement.height,
          scrollMonths.length,
        );
        const visibleMonth = scrollMonths[dominantIndex];
        if (!visibleMonth) return;

        const month = visibleMonth.slice(0, 7);
        if (lastReportedScrollMonthRef.current === month) return;
        lastReportedScrollMonthRef.current = month;
        onFocusedMonthChangeRef.current?.(month, visibleMonth);
      },
      [scrollMonths],
    );
    const renderScrollMonth = useCallback(
      ({ item: monthStart }: { item: string }) => (
        <View style={styles.calendarListMonth}>
          <Calendar
            {...commonProps}
            current={monthStart}
            customHeader={ScrollCalendarNullHeader}
            dayComponent={(props) => (
              <ScrollCalendarDay
                {...props}
                displayMonth={monthStart.slice(0, 7)}
              />
            )}
            disableMonthChange
            hideArrows
            showSixWeeks
            style={styles.calendarListMonthGrid}
            testID={`${testID}.item_${monthStart.slice(0, 7)}`}
          />
        </View>
      ),
      [commonProps, testID],
    );
    if (mode === 'scroll') {
      return (
        <View style={themedStyles.scrollContainer}>
          <ScrollWeekdayRow testID={testID} />
          <FlatList
            contentContainerStyle={styles.calendarListContent}
            data={scrollMonths}
            getItemLayout={(_, index) => ({
              index,
              length: calendarMonthHeight,
              offset: calendarMonthHeight * index,
            })}
            initialNumToRender={5}
            initialScrollIndex={pastScrollRange}
            keyExtractor={(monthStart) => monthStart}
            ListFooterComponent={footer ?? undefined}
            maxToRenderPerBatch={scrollCalendarRenderWindow}
            onScroll={handleScroll}
            ref={calendarListRef}
            removeClippedSubviews={false}
            renderItem={renderScrollMonth}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            style={styles.calendarList}
            testID={`${testID}.list`}
            updateCellsBatchingPeriod={16}
            windowSize={scrollCalendarRenderWindow}
          />
        </View>
      );
    }

    // Con límites, ni las flechas ni el deslizamiento salen del rango: la
    // librería solo apaga los días, no la navegación.
    const isAtMinMonth = Boolean(minDate && shownMonth <= minDate.slice(0, 7));
    const isAtMaxMonth = Boolean(maxDate && shownMonth >= maxDate.slice(0, 7));
    return (
      <Calendar
        {...commonProps}
        enableSwipeMonths
        onPressArrowLeft={(subtractMonth) => !isAtMinMonth && subtractMonth()}
        onPressArrowRight={(addMonth) => !isAtMaxMonth && addMonth()}
        renderArrow={(direction) => (
          <MonthNavigatorArrow
            direction={direction}
            disabled={direction === 'left' ? isAtMinMonth : isAtMaxMonth}
          />
        )}
        onMonthChange={({ dateString }) => {
          setShownMonth(dateString.slice(0, 7));
          onFocusedMonthChangeRef.current?.(dateString.slice(0, 7));
        }}
        renderHeader={(month) => {
          const label = month?.toString('MMMM yyyy') ?? '';
          return onPressHeader ? (
            <MonthNavigatorLabelButton
              label={label}
              onPress={onPressHeader}
              style={styles.headerButton}
              testID={`${testID}.monthButton`}
            />
          ) : (
            <MonthNavigatorLabel label={label} />
          );
        }}
        style={styles.calendar}
      />
    );
  }),
);

const styles = StyleSheet.create({
  headerButton: { flex: 1 },
  calendar: {
    borderRadius: radii.md,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  calendarList: {
    flex: 1,
  },
  calendarListContent: {
    paddingBottom: layout.floatingActionClearance,
  },
  calendarListMonth: {
    height: calendarMonthHeight,
    minHeight: calendarMonthHeight,
  },
  calendarListMonthGrid: {
    height: calendarMonthGridHeight,
    minHeight: calendarMonthGridHeight,
    paddingHorizontal: spacing.none,
  },
  scrollWeekdayColumn: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.xxs,
  },
  scrollWeekdayLabel: {
    marginBottom: spacing.lg,
  },
  scrollDay: {
    alignSelf: 'stretch',
    height: scrollCalendarDayHeight,
    alignItems: 'center',
    paddingHorizontal: spacing.xxs,
  },
  scrollDayPressed: { opacity: 0.62 },
  scrollDayNumber: {
    width: scrollCalendarNumberSize,
    height: scrollCalendarNumberSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  calendarDots: {
    height: calendarDotSize,
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  calendarDot: {
    width: calendarDotSize,
    height: calendarDotSize,
    borderRadius: calendarDotSize / 2,
  },
});

function createThemedStyles(colors: ColorTokens) {
  return StyleSheet.create({
    scrollContainer: {
      flex: 1,
      borderTopLeftRadius: radii.md,
      borderTopRightRadius: radii.md,
      overflow: 'hidden',
      backgroundColor: colors.surface,
    },
    scrollWeekdayRow: {
      flexDirection: 'row',
      paddingTop: spacing.md,
      backgroundColor: colors.surface,
    },
    scrollDayToday: {
      borderColor: colors.cta,
      borderWidth: 1,
    },
    scrollDaySelected: { backgroundColor: colors.cta },
  });
}
