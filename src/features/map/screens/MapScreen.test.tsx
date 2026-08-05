import { act, fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Category } from '@/features/categories/types';
import { MapScreen } from '@/features/map/screens/MapScreen';
import type { SessionTransaction } from '@/features/transactions/types';
import { createProjectedTransactionId } from '@/features/transactions/utils/transactionRecurrence';
import { colors } from '@/theme/colors';
import { layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';

const mockScrollToDate = jest.fn();
const mockWeeklyScrollToDate = jest.fn();
const mockMonthlyMount = jest.fn();
const mockWeeklyMount = jest.fn();

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  return {
    ...Reanimated,
    runOnJS: (callback: (...args: never[]) => unknown) => callback,
    withTiming: (
      value: number,
      _config?: object,
      callback?: (finished: boolean) => void,
    ) => {
      callback?.(true);
      return value;
    },
  };
});

jest.mock('@/components/ui/AppCalendar/AppCalendar', () => {
  const React = jest.requireActual('react');
  const { Pressable, Text, View } = jest.requireActual('react-native');

  const AppCalendar = React.forwardRef(
    (
      {
        markedDates,
        mode,
        onFocusedMonthChange,
        onSelectDate,
        rangeEndDate,
        testID,
      }: {
        markedDates: object;
        mode: string;
        onFocusedMonthChange?: (month: string, date?: string) => void;
        onSelectDate: (date: string) => void;
        rangeEndDate?: string;
        testID: string;
      },
      ref: React.ForwardedRef<{ scrollToDate: (date: string) => void }>,
    ) => {
      React.useEffect(() => {
        mockMonthlyMount();
      }, []);
      React.useImperativeHandle(ref, () => ({
        scrollToDate: (date: string) => {
          mockScrollToDate(date);
          onFocusedMonthChange?.(date.slice(0, 7), date);
        },
      }));

      return (
        <View testID={`${testID}-${mode}`}>
          <Text testID="map-marked-dates">{JSON.stringify(markedDates)}</Text>
          <Text testID="map-calendar-range-end">{rangeEndDate}</Text>
          {['2026-01-31', '2026-02-10', '2026-02-28'].map((date) => (
            <Pressable
              key={date}
              onPress={() => onSelectDate(date)}
              testID={date}
            />
          ))}
          <Pressable
            onPress={() => onFocusedMonthChange?.('2026-08', '2026-08-01')}
            testID="focus-future-month"
          />
          <Pressable
            onPress={() => onFocusedMonthChange?.('2025-08', '2025-08-01')}
            testID="focus-past-month"
          />
          <Pressable
            onPress={() => onFocusedMonthChange?.('2024-01', '2024-01-01')}
            testID="focus-minimum-month"
          />
          <Pressable
            onPress={() => onFocusedMonthChange?.('2026-02', '2026-02-01')}
            testID="focus-current-month"
          />
        </View>
      );
    },
  );
  AppCalendar.displayName = 'AppCalendarMock';

  return {
    AppCalendar,
  };
});

jest.mock('@/features/map/components/WeeklyMovementCalendar', () => {
  const React = jest.requireActual('react');
  const { Pressable, Text, View } = jest.requireActual('react-native');
  const WeeklyMovementCalendar = React.forwardRef(
    (
      {
        onFocusedMonthChange,
        testID,
        transactions,
      }: {
        onFocusedMonthChange?: (month: string, date?: string) => void;
        testID: string;
        transactions: SessionTransaction[];
      },
      ref: React.ForwardedRef<{
        scrollToDate: (date: string) => void;
        scrollToToday: () => void;
      }>,
    ) => {
      React.useEffect(() => {
        mockWeeklyMount();
      }, []);
      React.useImperativeHandle(ref, () => ({
        scrollToDate: (date: string) => {
          mockWeeklyScrollToDate(date);
          onFocusedMonthChange?.(date.slice(0, 7), date);
        },
        scrollToToday: jest.fn(),
      }));
      return (
        <View testID={testID}>
          <Text testID="map-weekly-transactions">
            {JSON.stringify(
              transactions.map((transaction) => transaction.occurredOn),
            )}
          </Text>
          <Pressable
            onPress={() => onFocusedMonthChange?.('2026-04', '2026-04-30')}
            testID="focus-transition-week"
          />
          <Pressable
            onPress={() => onFocusedMonthChange?.('2024-01', '2024-01-04')}
            testID="focus-weekly-minimum-month"
          />
          <Pressable
            onPress={() => onFocusedMonthChange?.('2026-02', '2026-02-05')}
            testID="focus-weekly-current-month"
          />
        </View>
      );
    },
  );
  WeeklyMovementCalendar.displayName = 'WeeklyMovementCalendarMock';
  return {
    WeeklyMovementCalendar,
  };
});

jest.mock('@/components/overlays/AppModal/AppModal', () => ({
  AppModal: ({
    children,
    visible,
  }: {
    children: React.ReactNode;
    visible: boolean;
  }) => (visible ? children : null),
  useAppModalBottomInset: () => 24,
}));

const category: Category = {
  id: 'subscriptions',
  spaceId: 'personal',
  name: 'Suscripciones',
  icon: 'receipt',
  colorToken: 'violet',
  isDefault: false,
  isArchived: false,
};

const transaction: SessionTransaction = {
  id: 'expense-1',
  spaceId: 'personal',
  type: 'expense',
  amountMinor: 1299,
  currency: 'EUR',
  title: 'Música',
  categoryId: category.id,
  occurredOn: '2026-01-31',
  recurrence: 'monthly',
  nextOccurrenceOn: '2026-02-28',
  recurrenceSeriesId: 'music-series',
  recurrenceStartsOn: '2026-01-31',
  updatedAt: '2026-01-31T12:00:00.000Z',
};

const incomeTransaction: SessionTransaction = {
  ...transaction,
  id: 'income-1',
  type: 'income',
  amountMinor: 240000,
  title: 'Nómina',
  recurrence: 'once',
  nextOccurrenceOn: undefined,
  recurrenceSeriesId: undefined,
  recurrenceStartsOn: undefined,
};

function renderMap(
  onAddTransaction = jest.fn(),
  onOpenTransactionDetail = jest.fn(),
) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, right: 0, bottom: 34, left: 0 },
      }}
    >
      <MapScreen
        categories={[category]}
        onAddTransaction={onAddTransaction}
        onOpenTransactionDetail={onOpenTransactionDetail}
        today="2026-02-02"
        transactions={[transaction, incomeTransaction]}
      />
    </SafeAreaProvider>,
  );
}

describe('MapScreen', () => {
  beforeEach(() => {
    mockScrollToDate.mockClear();
    mockWeeklyScrollToDate.mockClear();
    mockMonthlyMount.mockClear();
    mockWeeklyMount.mockClear();
  });

  it('usa el calendario vertical y distingue gastos de ingresos', async () => {
    const onAddTransaction = jest.fn();
    const screen = await renderMap(onAddTransaction);

    expect(screen.getByTestId('map-weekly-calendar')).toBeTruthy();
    expect(
      screen.getByTestId('map-calendar-view-monthly', {
        includeHiddenElements: true,
      }),
    ).toBeTruthy();
    expect(
      StyleSheet.flatten(screen.getByTestId('map-header').props.style),
    ).toMatchObject({ paddingTop: spacing.huge });
    const markedDates = screen.getByTestId('map-marked-dates', {
      includeHiddenElements: true,
    }).props.children;
    expect(markedDates).toContain('2026-01-31');
    expect(markedDates).toContain('income');
    expect(markedDates).toContain('expense');
    expect(markedDates).toContain('2026-02-28');
    expect(
      screen.getByTestId('map-weekly-transactions', {
        includeHiddenElements: true,
      }).props.children,
    ).toContain('2026-02-28');
    expect(
      StyleSheet.flatten(screen.getByTestId('map-month-tab').props.style),
    ).toMatchObject({
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.md,
      borderTopRightRadius: radii.md,
    });
    expect(screen.getByText('Febrero 2026')).toBeTruthy();
    expect(screen.queryByTestId('map-expense-legend-badge')).toBeNull();
    expect(screen.queryByTestId('map-income-legend-badge')).toBeNull();
    expect(screen.getByLabelText('Vista Semanal')).toBeTruthy();
    expect(
      screen.getByTestId('map-calendar-range-end', {
        includeHiddenElements: true,
      }).props.children,
    ).toBe('2080-12-31');

    await fireEvent.press(screen.getByLabelText('Vista Semanal'));
    await fireEvent.press(screen.getByTestId('2026-01-31'));
    expect(screen.getAllByText('Gastos')).toHaveLength(1);
    expect(screen.getAllByText('Ingresos')).toHaveLength(1);
    expect(screen.getByText('Música')).toBeTruthy();
    expect(screen.getByText('Nómina')).toBeTruthy();
    expect(
      StyleSheet.flatten(
        screen.getByTestId('map-day-scroll').props.contentContainerStyle,
      ).paddingBottom,
    ).toBeGreaterThan(64);
    const addButton = screen.getByTestId('map-add-transaction-button');
    expect(StyleSheet.flatten(addButton.props.style)).toMatchObject({
      position: 'absolute',
      left: spacing.none,
      right: spacing.none,
    });
    expect(StyleSheet.flatten(addButton.props.style).bottom).toBeGreaterThan(0);
    await fireEvent.press(addButton);
    expect(onAddTransaction).toHaveBeenCalledWith('2026-01-31');
  });

  it('alterna el mapa entre la vista mensual y semanal', async () => {
    const screen = await renderMap();

    expect(screen.getByTestId('map-weekly-calendar')).toBeTruthy();
    const toggle = screen.getByLabelText('Vista Semanal');
    expect(StyleSheet.flatten(toggle.props.style)).toMatchObject({
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.md,
      borderTopRightRadius: radii.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    });

    await fireEvent.press(toggle);
    expect(await screen.findByTestId('map-calendar-scroll')).toBeTruthy();
    expect(await screen.findByTestId('map-calendar-view-monthly')).toBeTruthy();
    expect(screen.getByLabelText('Vista Mensual')).toBeTruthy();
    expect(
      screen.getByText(
        'Mira tus movimientos de forma mensual o semanal, toca un día para ver los detalles.',
      ),
    ).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Vista Mensual'));
    expect(screen.getByTestId('map-weekly-calendar')).toBeTruthy();
    expect(
      screen.getByTestId('map-weekly-calendar', {
        includeHiddenElements: true,
      }),
    ).toBeTruthy();
    expect(
      StyleSheet.flatten(
        screen.getByTestId('map-calendar-view-weekly').props.style,
      ),
    ).toMatchObject({ zIndex: 1 });
    expect(
      StyleSheet.flatten(
        screen.getByTestId('map-calendar-view-monthly', {
          includeHiddenElements: true,
        }).props.style,
      ),
    ).toMatchObject({ zIndex: 0 });
    expect(screen.getByLabelText('Vista Semanal')).toBeTruthy();
    expect(mockWeeklyScrollToDate).not.toHaveBeenCalled();
    expect(mockScrollToDate).not.toHaveBeenCalled();
  });

  it('mantiene el periodo activo al cambiar en ambos sentidos', async () => {
    const screen = await renderMap();

    await fireEvent.press(screen.getByTestId('focus-transition-week'));
    await fireEvent.press(screen.getByLabelText('Vista Semanal'));
    expect(mockScrollToDate).toHaveBeenCalledWith('2026-04-30');

    await fireEvent.press(screen.getByTestId('focus-future-month'));
    await fireEvent.press(screen.getByLabelText('Vista Mensual'));
    expect(mockWeeklyScrollToDate).toHaveBeenCalledWith('2026-08-01');
  });

  it('adelanta la vista inactiva mientras se desplaza la vista activa', async () => {
    const screen = await renderMap();

    await fireEvent.press(screen.getByTestId('focus-transition-week'));
    await act(() => new Promise((resolve) => setTimeout(resolve, 120)));
    expect(mockScrollToDate).toHaveBeenCalledTimes(1);
    expect(mockScrollToDate).toHaveBeenLastCalledWith('2026-04-30');

    await fireEvent.press(screen.getByLabelText('Vista Semanal'));
    expect(mockScrollToDate).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('focus-future-month'));
    await act(() => new Promise((resolve) => setTimeout(resolve, 120)));
    expect(mockWeeklyScrollToDate).toHaveBeenLastCalledWith('2026-08-01');
  });

  it('muestra un estado vacío al elegir un día sin gastos', async () => {
    const screen = await renderMap();

    await fireEvent.press(screen.getByLabelText('Vista Semanal'));
    await fireEvent.press(screen.getByTestId('2026-02-10'));
    expect(screen.getByText('No hay movimientos este día')).toBeTruthy();
  });

  it('muestra una ocurrencia recurrente proyectada en un mes futuro', async () => {
    const onOpenTransactionDetail = jest.fn();
    const screen = await renderMap(jest.fn(), onOpenTransactionDetail);

    await fireEvent.press(screen.getByLabelText('Vista Semanal'));
    await fireEvent.press(screen.getByTestId('2026-02-28'));
    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Gasto: Música, 12,99 €, 28/02/2026',
      }),
    );
    expect(onOpenTransactionDetail).toHaveBeenCalledWith(
      createProjectedTransactionId('music-series', '2026-02-28'),
    );
  });

  it('permite volver a hoy al alejarse seis meses del mes actual', async () => {
    const screen = await renderMap();

    expect(screen.queryByLabelText('Volver a hoy')).toBeNull();

    await fireEvent.press(screen.getByLabelText('Vista Semanal'));
    await fireEvent.press(screen.getByTestId('focus-future-month'));
    expect(screen.getByTestId('map-return-direction-up')).toBeTruthy();
    expect(screen.queryByTestId('map-return-direction-down')).toBeNull();
    expect(
      StyleSheet.flatten(
        screen.getByTestId('map-return-today-container').props.style,
      ),
    ).toMatchObject({
      bottom: 34 + layout.floatingActionTabOffset - spacing.xxl,
      right: spacing.xl + layout.floatingActionSize + spacing.md,
      height: layout.floatingActionSize,
    });
    expect(
      StyleSheet.flatten(
        screen.getByTestId('map-return-today-button').props.style,
      ),
    ).toMatchObject({ borderColor: colors.border, borderWidth: 1 });

    const monthlyMounts = mockMonthlyMount.mock.calls.length;
    const weeklyMounts = mockWeeklyMount.mock.calls.length;
    await fireEvent.press(screen.getByLabelText('Volver a hoy'));
    await fireEvent.press(screen.getByTestId('focus-minimum-month'));
    await fireEvent.press(
      screen.getByTestId('focus-weekly-minimum-month', {
        includeHiddenElements: true,
      }),
    );
    expect(screen.getByText('Febrero 2026')).toBeTruthy();
    expect(screen.queryByLabelText('Volver a hoy')).toBeNull();
    await fireEvent.press(screen.getByTestId('focus-current-month'));
    await fireEvent.press(
      screen.getByTestId('focus-weekly-current-month', {
        includeHiddenElements: true,
      }),
    );
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    expect(mockMonthlyMount).toHaveBeenCalledTimes(monthlyMounts + 1);
    expect(mockWeeklyMount).toHaveBeenCalledTimes(weeklyMounts + 1);
    expect(mockScrollToDate).not.toHaveBeenCalledWith('2026-02-02');
    expect(mockWeeklyScrollToDate).not.toHaveBeenCalledWith('2026-02-02');
    expect(screen.queryByLabelText('Volver a hoy')).toBeNull();
    expect(screen.queryByText(/Volviendo al/)).toBeNull();

    await act(() => new Promise((resolve) => setTimeout(resolve, 1000)));
    await fireEvent.press(screen.getByTestId('focus-past-month'));
    expect(screen.getByTestId('map-return-direction-down')).toBeTruthy();
    expect(screen.queryByTestId('map-return-direction-up')).toBeNull();
  });
});
