import { fireEvent, render, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Category } from '@/features/categories/types';
import {
  formatWeekMonthLabel,
  getWeeksInCalendarRange,
  WeeklyMovementCalendar,
} from '@/features/map/components/WeeklyMovementCalendar';
import {
  addCalendarDays,
  getCalendarWeek,
  getMonthSeparatedWeeksInCalendarRange,
  shouldShowWeekMonthLabel,
} from '@/features/map/model/calendarPeriods';
import { indexMapCalendarDays } from '@/features/map/model/mapCalendarDays';
import type { SessionTransaction } from '@/features/transactions/types';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

const category: Category = {
  id: 'food',
  spaceId: 'personal',
  name: 'Comida',
  icon: 'fork-knife',
  colorToken: 'orange',
  isDefault: false,
  isArchived: false,
};

const transaction: SessionTransaction = {
  id: 'lunch',
  createdBy: 'install-test',
  spaceId: 'personal',
  type: 'expense',
  amountMinor: 1250,
  currency: 'EUR',
  title: 'Almuerzo',
  categoryId: category.id,
  occurredOn: '2026-08-12',
  recurrence: 'once',
  updatedAt: '2026-08-12T12:00:00.000Z',
};

function renderCalendar(
  onSelectDate = jest.fn(),
  onOpenTransactionDetail = jest.fn(),
) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, right: 0, bottom: 34, left: 0 },
      }}
    >
      <ThemeProvider initialAppearance="light">
        <WeeklyMovementCalendar
          categories={[category]}
          currentDate="2026-08-12"
          days={indexMapCalendarDays([transaction])}
          onOpenTransactionDetail={onOpenTransactionDetail}
          onSelectDate={onSelectDate}
          rangeEndDate="2028-08-31"
          testID="weekly-calendar"
        />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('WeeklyMovementCalendar', () => {
  it('muestra los siete días y previews compactas de movimientos sin repetir el mes', async () => {
    const onSelectDate = jest.fn();
    const onOpenTransactionDetail = jest.fn();
    const screen = await renderCalendar(onSelectDate, onOpenTransactionDetail);

    expect(screen.queryByText('Julio - Agosto 2026')).toBeNull();
    expect(screen.getAllByText('Lun')).toHaveLength(1);
    expect(screen.getAllByText('Dom')).toHaveLength(1);
    const selectedDay = screen.getByTestId('weekly-calendar-day-2026-08-12');
    expect(
      StyleSheet.flatten(screen.getByText('Mié').props.style),
    ).toMatchObject({
      fontFamily: typography.footnote.fontFamily,
      fontSize: typography.footnote.fontSize,
    });
    expect(
      StyleSheet.flatten(within(selectedDay).getByText('12').props.style),
    ).toMatchObject({
      fontFamily: typography.body.fontFamily,
      fontSize: typography.body.fontSize,
    });
    const preview = screen.getByTestId('weekly-calendar-movement-lunch');
    expect(StyleSheet.flatten(preview.props.style)).toMatchObject({
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
    });
    expect(within(preview).getAllByText('Almuerzo').length).toBeGreaterThan(0);
    expect(screen.queryByText('12,50 €')).toBeNull();

    await fireEvent.press(preview);
    expect(onOpenTransactionDetail).toHaveBeenCalledWith('lunch');
    await fireEvent.press(selectedDay);
    expect(onSelectDate).toHaveBeenCalledWith('2026-08-12');
  });

  it('separa los meses sin desplazar el día 1 de su columna real', async () => {
    const augustWeeks = getMonthSeparatedWeeksInCalendarRange(
      '2026-08-01',
      '2026-08-31',
    );

    // Agosto de 2026 empieza en sábado; no debe mostrar los días finales de
    // julio bajo el encabezado de agosto.
    expect(augustWeeks[0]).toEqual([
      null,
      null,
      null,
      null,
      null,
      '2026-08-01',
      '2026-08-02',
    ]);

    const screen = await renderCalendar();
    expect(screen.getByTestId('weekly-calendar-day-2026-08-01')).toBeTruthy();
    expect(
      StyleSheet.flatten(
        screen.getByTestId('weekly-calendar-week-2026-08-03').props.style,
      ),
    ).toMatchObject({
      borderBottomColor: colors.categoryPreviewBorder,
      borderBottomWidth: StyleSheet.hairlineWidth,
    });
  });

  it('nombra con ambos meses la semana que cruza su límite', async () => {
    expect(formatWeekMonthLabel(getCalendarWeek('2026-08-02'))).toBe(
      'Julio - Agosto 2026',
    );
  });

  it('no vuelve a anunciar el mes nuevo después de una semana transitoria', () => {
    const weeks = getWeeksInCalendarRange('2026-07-01', '2026-08-31');
    const transitionIndex = weeks.findIndex(
      (week) => week.includes('2026-07-31') && week.includes('2026-08-01'),
    );

    expect(shouldShowWeekMonthLabel(weeks, transitionIndex)).toBe(true);
    expect(formatWeekMonthLabel(weeks[transitionIndex]!)).toBe(
      'Julio - Agosto 2026',
    );
    expect(shouldShowWeekMonthLabel(weeks, transitionIndex + 1)).toBe(false);
  });

  it('genera solo las semanas necesarias hasta enero de 2024', () => {
    const weeks = getWeeksInCalendarRange('2024-01-01', '2026-08-12');

    expect(weeks[0]?.[0]).toBe('2024-01-01');
    expect(weeks.at(-1)).toContain('2026-08-12');
    expect(weeks.flat().some((date) => date < '2024-01-01')).toBe(false);
    expect(weeks).toHaveLength(137);
  });

  it('mantiene el historial y limita el futuro al rango cargado', async () => {
    const screen = await renderCalendar();
    const list = screen.getByTestId('weekly-calendar');
    const weeks = list.props.data as string[][];
    const initialScrollIndex = list.props.initialScrollIndex as number;

    expect(list.props.inverted).toBeFalsy();
    expect(list.props.removeClippedSubviews).toBe(false);
    expect(list.props.maxToRenderPerBatch).toBe(10);
    expect(list.props.updateCellsBatchingPeriod).toBe(16);
    expect(list.props.windowSize).toBe(9);
    expect(weeks[0]?.[0]).toBe('2024-01-01');
    expect(typeof initialScrollIndex).toBe('number');
    expect(weeks[initialScrollIndex]).toContain('2026-08-01');
    expect(weeks[initialScrollIndex + 2]).toContain('2026-08-12');
    expect(weeks.at(-1)).toContain('2028-08-31');
  });

  it('deriva getItemLayout de los movimientos reales, en vez de depender de medir la lista al desplazarse', async () => {
    const screen = await renderCalendar();
    const list = screen.getByTestId('weekly-calendar');
    const weeks = list.props.data as string[][];
    const getItemLayout = list.props.getItemLayout as (
      data: unknown,
      index: number,
    ) => { index: number; length: number; offset: number };

    const busyWeekIndex = weeks.findIndex((week) =>
      week.includes('2026-08-12'),
    );
    const emptyWeekIndex = weeks.findIndex(
      (week) => !week.includes('2026-08-12'),
    );

    const busyLayout = getItemLayout(weeks, busyWeekIndex);
    const emptyLayout = getItemLayout(weeks, emptyWeekIndex);
    const nextLayout = getItemLayout(weeks, busyWeekIndex + 1);

    expect(busyLayout.index).toBe(busyWeekIndex);
    expect(busyLayout.length).toBeGreaterThan(emptyLayout.length);
    expect(nextLayout.offset).toBe(busyLayout.offset + busyLayout.length);
  });

  it('reporta el mes actual desde su primera fila parcial', async () => {
    const onFocusedMonthChange = jest.fn();
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <WeeklyMovementCalendar
            categories={[category]}
            currentDate="2026-08-03"
            days={indexMapCalendarDays([])}
            onFocusedMonthChange={onFocusedMonthChange}
            onSelectDate={jest.fn()}
            rangeEndDate="2028-08-31"
            testID="weekly-calendar"
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    const list = screen.getByTestId('weekly-calendar');
    const initialScrollIndex = list.props.initialScrollIndex as number;
    const currentWeek = (list.props.data as string[][])[initialScrollIndex]!;
    expect(currentWeek).toContain('2026-08-01');

    fireEvent(list, 'viewableItemsChanged', {
      viewableItems: [
        {
          index: initialScrollIndex,
          isViewable: true,
          item: currentWeek,
          key: currentWeek[0]!,
        },
      ],
    });

    expect(onFocusedMonthChange).toHaveBeenCalledWith('2026-08', '2026-08-01');
  });

  it('nunca reemplaza los datos de la lista al desplazarse (historial siempre precargado, sin lotes ni glitches)', async () => {
    const screen = await renderCalendar();
    const list = screen.getByTestId('weekly-calendar');
    const weeksBefore = list.props.data as string[][];

    await fireEvent(list, 'scroll', {
      nativeEvent: {
        contentOffset: { x: 0, y: 0 },
        contentSize: { height: 8000, width: 390 },
        layoutMeasurement: { height: 844, width: 390 },
      },
    });

    expect(list.props.data).toBe(weeksBefore);
  });

  it('comparte un modelo local estable al cruzar meses y cambios horarios', () => {
    expect(getCalendarWeek('2026-08-02')).toEqual([
      '2026-07-27',
      '2026-07-28',
      '2026-07-29',
      '2026-07-30',
      '2026-07-31',
      '2026-08-01',
      '2026-08-02',
    ]);
    expect(addCalendarDays('2026-10-25', 7)).toBe('2026-11-01');
  });
});
