import {
  type ComponentProps,
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import {
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import type { DayProps } from 'react-native-calendars/src/calendar/day';
import type { DateData, MarkedDates } from 'react-native-calendars/src/types';
import {
  MonthNavigatorArrow,
  MonthNavigatorLabel,
} from '@/components/ui/MonthNavigator/MonthNavigator';
import { Text } from '@/components/ui/Text/Text';
import {
  getCalendarFutureMonthRange,
  getCalendarPastMonthRange,
  getMonthDistance,
  minimumCalendarDate,
} from '@/lib/date/monthDistance';
import { layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { typography } from '@/theme/typography';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type AppCalendarProps = {
  currentDate: string;
  markedDates?: MarkedDates;
  mode?: 'month' | 'scroll';
  onFocusedMonthChange?: (month: string, date?: string) => void;
  onSelectDate: (date: string) => void;
  rangeEndDate?: string;
  selectedDate?: string;
  testID: string;
};

export type AppCalendarHandle = {
  scrollToDate: (date: string) => void;
};

type CalendarTheme = NonNullable<ComponentProps<typeof Calendar>['theme']> & {
  'stylesheet.calendar.header': Record<string, object>;
  'stylesheet.calendar-list.main': Record<string, object>;
  'stylesheet.calendar.main': Record<string, object>;
  'stylesheet.day.basic': Record<string, object>;
};

const calendarDaySize = 40;
const calendarFutureRange = 12;
const scrollCalendarDayHeight = 52;
const scrollCalendarNumberSize = 32;
const calendarDotSize = 7;
const scrollCalendarRenderWindow = 9;
// showSixWeeks fuerza una grilla de 6 filas por mes en modo scroll, así que
// la altura de cada item es siempre la misma grilla sin cabecera propia (el
// nombre del mes y la fila Lun-Dom viven fuera de la lista, ver
// `ScrollWeekdayRow`). Cada fila suma el alto fijo del día más el margen
// vertical que ya declara `stylesheet.calendar.main.week`.
const calendarGridRows = 6;
const calendarWeekRowVerticalMargin = spacing.sm;
const calendarMonthHeight =
  calendarGridRows *
  (scrollCalendarDayHeight + calendarWeekRowVerticalMargin * 2);

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

function getMonthStartAtOffset(anchorDate: string, offset: number): string {
  const anchorYear = Number(anchorDate.slice(0, 4));
  const anchorMonthIndex = Number(anchorDate.slice(5, 7)) - 1;
  const absoluteMonth = anchorYear * 12 + anchorMonthIndex + offset;
  const year = Math.floor(absoluteMonth / 12);
  const month = (absoluteMonth % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

type ScrollCalendarDayProps = Omit<DayProps, 'date'> & {
  date?: DateData;
};

function ScrollCalendarDay({
  accessibilityLabel,
  children,
  date,
  marking,
  onPress,
  state,
  testID,
}: ScrollCalendarDayProps) {
  const themedStyles = useThemedStyles(createThemedStyles);
  const isSelected = Boolean(marking?.selected) || state === 'selected';
  const isDisabled = Boolean(marking?.disabled) || state === 'disabled';
  const isToday = state === 'today';
  if (state === 'disabled') {
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

LocaleConfig.locales.es = {
  monthNames: [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ],
  monthNamesShort: [
    'Ene.',
    'Feb.',
    'Mar.',
    'Abr.',
    'Jun.',
    'Jul.',
    'Ago.',
    'Sept.',
    'Oct.',
    'Nov.',
    'Dic.',
  ],
  dayNames: [
    'Domingo',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
  ],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  today: 'Hoy',
};
LocaleConfig.defaultLocale = 'es';

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

function createCalendarTheme(colors: ColorTokens): CalendarTheme {
  return {
    arrowColor: colors.textPrimary,
    calendarBackground: colors.surface,
    dayTextColor: colors.textPrimary,
    monthTextColor: colors.textPrimary,
    selectedDayBackgroundColor: colors.cta,
    selectedDayTextColor: colors.onBrand,
    textDayFontFamily: typography.body.fontFamily,
    textDayFontSize: typography.body.fontSize,
    textDayHeaderFontFamily: typography.footnote.fontFamily,
    textDayHeaderFontSize: typography.footnote.fontSize,
    textDisabledColor: colors.textMuted,
    textMonthFontFamily: typography.bodyStrong.fontFamily,
    textMonthFontSize: typography.bodyStrong.fontSize,
    textSectionTitleColor: colors.textSecondary,
    todayTextColor: colors.cta,
    'stylesheet.calendar.header': {
      header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.none,
        paddingHorizontal: spacing.none,
      },
      monthText: {
        color: colors.textPrimary,
        fontFamily: typography.bodyStrong.fontFamily,
        fontSize: typography.bodyStrong.fontSize,
        marginVertical: spacing.xs,
      },
      week: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: spacing.xl,
      },
      dayHeader: {
        width: spacing.xxl,
        color: colors.textSecondary,
        fontFamily: typography.footnote.fontFamily,
        fontSize: typography.footnote.fontSize,
        includeFontPadding: false,
        letterSpacing: typography.footnote.letterSpacing,
        lineHeight: typography.footnote.lineHeight,
        marginBottom: spacing.lg,
        textAlign: 'center',
      },
    },
    'stylesheet.calendar.main': {
      container: {
        paddingLeft: spacing.none,
        paddingRight: spacing.none,
        backgroundColor: colors.surface,
      },
      week: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginVertical: spacing.sm,
      },
    },
    'stylesheet.calendar-list.main': {
      flatListContainer: { flex: 1 },
    },
    'stylesheet.day.basic': {
      base: {
        width: calendarDaySize,
        height: calendarDaySize,
        alignItems: 'center',
        justifyContent: 'center',
      },
      today: {
        borderColor: colors.cta,
        borderRadius: radii.sm,
        borderWidth: 1,
      },
      selected: {
        backgroundColor: colors.cta,
        borderRadius: radii.sm,
      },
      text: {
        color: colors.textPrimary,
        fontFamily: typography.body.fontFamily,
        fontSize: typography.body.fontSize,
        includeFontPadding: false,
        lineHeight: calendarDaySize,
        marginTop: spacing.none,
        textAlign: 'center',
        textAlignVertical: 'center',
      },
      todayText: { color: colors.cta },
      selectedText: { color: colors.onBrand },
      disabledText: { color: colors.textMuted },
    },
  };
}

export const AppCalendar = memo(
  forwardRef<AppCalendarHandle, AppCalendarProps>(function AppCalendar(
    {
      currentDate,
      markedDates = {},
      mode = 'month',
      onFocusedMonthChange,
      onSelectDate,
      rangeEndDate,
      selectedDate,
      testID,
    },
    ref,
  ) {
    const { colors } = useTheme();
    const themedStyles = useThemedStyles(createThemedStyles);
    const calendarTheme = useMemo(() => createCalendarTheme(colors), [colors]);
    const scrollAnchorDate = useRef(currentDate).current;
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
    onFocusedMonthChangeRef.current = onFocusedMonthChange;
    const lastReportedScrollMonthRef = useRef<string | null>(null);
    const dates = useMemo(
      () =>
        selectedDate
          ? {
              ...markedDates,
              [selectedDate]: {
                ...markedDates[selectedDate],
                selected: true,
                selectedColor: colors.cta,
                selectedTextColor: colors.onBrand,
              },
            }
          : markedDates,
      [colors, markedDates, selectedDate],
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
        minDate: minimumCalendarDate,
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
        <Calendar
          {...commonProps}
          current={monthStart}
          customHeader={ScrollCalendarNullHeader}
          dayComponent={ScrollCalendarDay}
          disableMonthChange
          hideArrows
          showSixWeeks
          style={styles.calendarListMonth}
          testID={`${testID}.item_${monthStart.slice(0, 7)}`}
        />
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

    return (
      <Calendar
        {...commonProps}
        enableSwipeMonths
        renderArrow={(direction) => (
          <MonthNavigatorArrow direction={direction} />
        )}
        renderHeader={(month) => (
          <MonthNavigatorLabel label={month?.toString('MMMM yyyy') ?? ''} />
        )}
        style={styles.calendar}
      />
    );
  }),
);

const styles = StyleSheet.create({
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
      borderRadius: radii.md,
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
