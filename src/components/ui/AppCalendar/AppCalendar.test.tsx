import { fireEvent, render, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  AppCalendar,
  getDominantScrollMonthIndex,
} from '@/components/ui/AppCalendar/AppCalendar';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

describe('AppCalendar vertical', () => {
  const renderCalendar = (calendar: React.ReactElement) =>
    render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        {calendar}
      </SafeAreaProvider>,
    );

  it('reserva espacio entre el número seleccionado y marcas más grandes', async () => {
    const date = '2026-08-15';
    const screen = await renderCalendar(
      <AppCalendar
        currentDate={date}
        markedDates={{
          [date]: {
            dots: [
              { key: 'expense', color: colors.expense },
              { key: 'income', color: colors.income },
            ],
          },
        }}
        mode="scroll"
        onSelectDate={jest.fn()}
        selectedDate={date}
        testID="calendar"
      />,
    );

    const dayTestID = `calendar.item_2026-08.day_${date}`;
    const day = screen.getByTestId(dayTestID);
    const dots = screen.getByTestId(`${dayTestID}.dots`);
    const expenseDot = screen.getByTestId(`${dayTestID}.dot.expense`);

    expect(StyleSheet.flatten(day.props.style)).toMatchObject({
      alignSelf: 'stretch',
      height: 52,
    });
    expect(StyleSheet.flatten(dots.props.style)).toMatchObject({
      height: 7,
      marginTop: spacing.xs,
    });
    expect(StyleSheet.flatten(expenseDot.props.style)).toMatchObject({
      width: 7,
      height: 7,
      backgroundColor: colors.expense,
    });
  });

  it('mantiene visible el domingo y el mismo contraste entre meses', async () => {
    const screen = await renderCalendar(
      <AppCalendar
        currentDate="2026-08-15"
        mode="scroll"
        onSelectDate={jest.fn()}
        testID="calendar"
      />,
    );

    const augustSunday = screen.getByTestId(
      'calendar.item_2026-08.day_2026-08-02',
    );
    const septemberDay = screen.getByTestId(
      'calendar.item_2026-09.day_2026-09-15',
    );
    expect(augustSunday).toBeTruthy();
    expect(
      StyleSheet.flatten(
        screen.getByTestId('calendar.dayName_Lun', {
          includeHiddenElements: true,
        }).props.style,
      ),
    ).toMatchObject({
      fontFamily: typography.footnote.fontFamily,
      fontSize: typography.footnote.fontSize,
      lineHeight: typography.footnote.lineHeight,
    });
    expect(
      StyleSheet.flatten(within(augustSunday).getByText('2').props.style),
    ).toMatchObject({
      fontFamily: typography.body.fontFamily,
      fontSize: typography.body.fontSize,
    });
    expect(within(augustSunday).getByText('2')).toBeTruthy();
    expect(within(septemberDay).getByText('15')).toBeTruthy();
  });

  it('virtualiza meses de altura fija desde enero de 2024', async () => {
    const screen = await renderCalendar(
      <AppCalendar
        currentDate="2026-08-15"
        mode="scroll"
        onSelectDate={jest.fn()}
        rangeEndDate="2080-12-31"
        testID="calendar"
      />,
    );

    const list = screen.getByTestId('calendar.list');
    const months = list.props.data as string[];

    expect(months[0]).toBe('2024-01-01');
    expect(months.at(-1)).toBe('2080-12-01');
    expect(list.props.initialNumToRender).toBe(5);
    expect(list.props.maxToRenderPerBatch).toBe(9);
    expect(list.props.updateCellsBatchingPeriod).toBe(16);
    expect(list.props.windowSize).toBe(9);
    expect(list.props.removeClippedSubviews).toBe(false);
    expect(list.props.scrollEventThrottle).toBe(16);
    expect(list.props.getItemLayout(null, 0)).toMatchObject({
      length: 408,
      offset: 0,
    });
    expect(list.props.getItemLayout(null, 31)).toMatchObject({
      length: 408,
      offset: 31 * 408,
    });
    expect(
      StyleSheet.flatten(
        screen.getByTestId('calendar.item_2026-08').props.style,
      ),
    ).toMatchObject({ minHeight: 408, height: 408 });
  });

  it('resuelve el mes dominante desde el centro visible sin alternar por items parcialmente visibles', () => {
    expect(getDominantScrollMonthIndex(0, 408, 24)).toBe(0);
    expect(getDominantScrollMonthIndex(203, 408, 24)).toBe(0);
    expect(getDominantScrollMonthIndex(204, 408, 24)).toBe(1);
    expect(getDominantScrollMonthIndex(408, 408, 24)).toBe(1);
    expect(getDominantScrollMonthIndex(999_999, 408, 24)).toBe(23);
  });

  it('notifica una sola vez cada mes dominante durante el scroll', async () => {
    const onFocusedMonthChange = jest.fn();
    const screen = await renderCalendar(
      <AppCalendar
        currentDate="2026-08-15"
        mode="scroll"
        onFocusedMonthChange={onFocusedMonthChange}
        onSelectDate={jest.fn()}
        rangeEndDate="2080-12-31"
        testID="calendar"
      />,
    );
    const list = screen.getByTestId('calendar.list');
    const augustOffset = 31 * 408;

    await fireEvent.scroll(list, {
      nativeEvent: {
        contentOffset: { y: augustOffset },
        layoutMeasurement: { height: 408 },
      },
    });
    await fireEvent.scroll(list, {
      nativeEvent: {
        contentOffset: { y: augustOffset + 203 },
        layoutMeasurement: { height: 408 },
      },
    });
    await fireEvent.scroll(list, {
      nativeEvent: {
        contentOffset: { y: augustOffset + 204 },
        layoutMeasurement: { height: 408 },
      },
    });

    expect(onFocusedMonthChange.mock.calls).toEqual([
      ['2026-08', '2026-08-01'],
      ['2026-09', '2026-09-01'],
    ]);
  });
});
