import { createRef, type RefObject } from 'react';
import {
  act,
  fireEvent,
  render,
  waitFor,
  within,
} from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Category } from '@/features/categories/types';
import { mapReturnToTodayRight } from '@/features/map/components/MapReturnToToday';
import {
  MapScreen,
  type MapScreenHandle,
} from '@/features/map/screens/MapScreen';
import type { SessionTransaction } from '@/features/transactions/types';
import { createProjectedTransactionId } from '@/features/transactions/utils/transactionRecurrence';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { colors } from '@/theme/colors';
import { layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';

const mockScrollToDate = jest.fn();
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

jest.mock('@/features/map/components/WeeklyMovementCalendar', () => {
  const React = jest.requireActual('react');
  const { Pressable, Text, View } = jest.requireActual('react-native');

  const WeeklyMovementCalendar = React.forwardRef(
    (
      {
        days,
        footer,
        onFocusedMonthChange,
        onSelectDate,
        rangeEndDate,
        testID,
      }: {
        days: ReadonlyMap<
          string,
          { transactions: readonly SessionTransaction[] }
        >;
        footer?: React.ReactNode;
        onFocusedMonthChange?: (month: string, date?: string) => void;
        onSelectDate: (date: string) => void;
        rangeEndDate: string;
        testID: string;
      },
      ref: React.ForwardedRef<{ scrollToDate: (date: string) => void }>,
    ) => {
      React.useEffect(() => {
        mockWeeklyMount();
      }, []);
      React.useImperativeHandle(ref, () => ({
        scrollToDate: (date: string) => {
          mockScrollToDate(date);
          onFocusedMonthChange?.(date.slice(0, 7), date);
        },
      }));

      return (
        <View testID={testID}>
          <Text testID="map-weekly-dates">
            {JSON.stringify([...days.keys()])}
          </Text>
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
          {footer}
        </View>
      );
    },
  );
  WeeklyMovementCalendar.displayName = 'WeeklyMovementCalendarMock';

  return {
    WeeklyMovementCalendar,
  };
});

jest.mock('@/components/overlays/AppModal/AppModal', () => {
  const React = jest.requireActual('react');
  return {
    AppModal: ({
      children,
      onDismissed,
      visible,
    }: {
      children: React.ReactNode;
      onDismissed?: () => void;
      visible: boolean;
    }) => {
      const wasVisible = React.useRef(visible);
      React.useEffect(() => {
        if (wasVisible.current && !visible) onDismissed?.();
        wasVisible.current = visible;
      }, [onDismissed, visible]);
      return visible ? children : null;
    },
    useAppModalBottomInset: () => 24,
  };
});

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
  createdBy: 'install-test',
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
  ref?: RefObject<MapScreenHandle | null>,
  transactions: readonly SessionTransaction[] = [
    transaction,
    incomeTransaction,
  ],
  currency: CurrencyCode = 'EUR',
) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, right: 0, bottom: 34, left: 0 },
      }}
    >
      <ThemeProvider initialAppearance="light">
        <MapScreen
          categories={[category]}
          currency={currency}
          onAddTransaction={onAddTransaction}
          onOpenTransactionDetail={onOpenTransactionDetail}
          ref={ref}
          today="2026-02-02"
          transactions={transactions}
        />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('MapScreen', () => {
  beforeEach(() => {
    mockScrollToDate.mockClear();
    mockWeeklyMount.mockClear();
  });

  it('usa siempre el calendario semanal con sus mini previews', async () => {
    const onAddTransaction = jest.fn();
    const screen = await renderMap(onAddTransaction);

    expect(screen.getByTestId('map-weekly-calendar')).toBeTruthy();
    expect(screen.queryByTestId('map-calendar-scroll')).toBeNull();
    expect(
      StyleSheet.flatten(screen.getByTestId('map-header').props.style),
    ).toMatchObject({
      paddingTop: spacing.xxxl,
      paddingBottom: spacing.lg,
    });
    expect(
      StyleSheet.flatten(
        screen.getByTestId('map-calendar-viewport').props.style,
      ),
    ).toMatchObject({
      borderTopLeftRadius: radii.md,
      borderTopRightRadius: radii.md,
      overflow: 'hidden',
    });
    const weeklyDates = screen.getByTestId('map-weekly-dates').props.children;
    expect(weeklyDates).toContain('2026-01-31');
    expect(weeklyDates).toContain('2026-02-28');
    expect(screen.getByTestId('map-month-navigator')).toBeTruthy();
    expect(screen.getByText('Febrero 2026')).toBeTruthy();
    expect(screen.queryByTestId('map-expense-legend-badge')).toBeNull();
    expect(screen.queryByTestId('map-income-legend-badge')).toBeNull();
    expect(screen.queryByRole('header', { name: 'Mapa' })).toBeNull();
    expect(screen.queryByText('Mensual')).toBeNull();
    expect(screen.queryByText('Semanal')).toBeNull();
    expect(
      screen.getByTestId('map-calendar-range-end', {
        includeHiddenElements: true,
      }).props.children,
    ).toBe('2028-02-29');

    await fireEvent.press(screen.getByTestId('2026-01-31'));
    const dayScroll = within(screen.getByTestId('map-day-scroll'));
    expect(dayScroll.getByText('Gastos')).toBeTruthy();
    expect(dayScroll.getByText('Ingresos')).toBeTruthy();
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
    await waitFor(() =>
      expect(onAddTransaction).toHaveBeenCalledWith('2026-01-31'),
    );
  });

  it('reemplaza el título y los controles por un navegador de meses', async () => {
    const screen = await renderMap();

    expect(screen.getByTestId('map-weekly-calendar')).toBeTruthy();
    expect(screen.queryByTestId('map-calendar-scroll')).toBeNull();
    expect(screen.queryByRole('header', { name: 'Mapa' })).toBeNull();
    expect(screen.queryByTestId('map-calendar-view-toggle')).toBeNull();

    await fireEvent.press(screen.getByLabelText('Ver mes siguiente'));
    expect(mockScrollToDate).toHaveBeenLastCalledWith('2026-03-01');
    expect(screen.getByText('Marzo 2026')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Ver mes anterior'));
    expect(mockScrollToDate).toHaveBeenLastCalledWith('2026-02-01');
    expect(screen.getByText('Febrero 2026')).toBeTruthy();
  });

  it('mantiene visibles los badges y actualiza sus importes con el mes', async () => {
    const ref = createRef<MapScreenHandle>();
    const februaryIncome: SessionTransaction = {
      ...incomeTransaction,
      id: 'february-income',
      amountMinor: 50000,
      occurredOn: '2026-02-02',
    };
    const otherCurrencyIncome: SessionTransaction = {
      ...februaryIncome,
      id: 'february-usd-income',
      amountMinor: 100000,
      currency: 'USD',
    };
    const screen = await renderMap(jest.fn(), jest.fn(), ref, [
      transaction,
      incomeTransaction,
      februaryIncome,
      otherCurrencyIncome,
    ]);

    expect(ref.current).toEqual(
      expect.objectContaining({
        resetToToday: expect.any(Function),
      }),
    );
    expect(screen.getByTestId('map-month-summary-panel')).toBeTruthy();
    expect(screen.getByTestId('map-month-income-badge')).toBeTruthy();
    expect(screen.getByTestId('map-month-expense-badge')).toBeTruthy();
    expect(screen.getByTestId('map-month-balance-badge')).toBeTruthy();
    expect(screen.getByTestId('map-month-income-amount').props.children).toBe(
      '500 €',
    );
    expect(
      screen.getByTestId('map-month-expense-amount').props.children,
    ).toContain('12,99');
    expect(
      screen.getByTestId('map-month-balance-amount').props.children,
    ).toContain('487,01');
    expect(
      StyleSheet.flatten(screen.getByTestId('map-month-summary').props.style),
    ).toMatchObject({ minHeight: layout.minTouchTarget });

    await fireEvent.press(screen.getByLabelText('Ver mes siguiente'));
    expect(screen.getByTestId('map-month-income-amount').props.children).toBe(
      '0 €',
    );
    expect(
      screen.getByTestId('map-month-expense-amount').props.children,
    ).toContain('12,99');
    expect(
      screen.getByTestId('map-month-balance-amount').props.children,
    ).toContain('-12,99');

    expect(screen.getByTestId('map-month-summary-panel')).toBeTruthy();
  });

  it('abre desde cada badge el detalle del mes enfocado', async () => {
    const onAddTransaction = jest.fn();
    const februaryIncome: SessionTransaction = {
      ...incomeTransaction,
      id: 'february-income',
      amountMinor: 50000,
      occurredOn: '2026-02-02',
    };
    const screen = await renderMap(onAddTransaction, jest.fn(), undefined, [
      transaction,
      incomeTransaction,
      februaryIncome,
    ]);

    await fireEvent.press(screen.getByTestId('map-month-income-badge'));
    expect(
      within(screen.getByTestId('income-period-selector')).getByText(
        'Febrero 2026',
      ),
    ).toBeTruthy();
    expect(screen.getByTestId('income-period-total').props.children).toContain(
      '500',
    );
    expect(screen.getByTestId('income-period-transaction-list')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Cerrar'));

    await fireEvent.press(screen.getByTestId('map-month-expense-badge'));
    expect(screen.getByTestId('expense-period-total').props.children).toContain(
      '12,99',
    );
    expect(screen.getByTestId('expense-period-transaction-list')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Añadir gasto' }));
    expect(onAddTransaction).toHaveBeenCalledWith('2026-02-01', 'expense');

    await fireEvent.press(screen.getByTestId('map-month-balance-badge'));
    expect(screen.getByTestId('balance-period-total').props.children).toContain(
      '487,01',
    );
    expect(screen.getByTestId('balance-period-transaction-list')).toBeTruthy();
  });

  it('formatea los badges con la moneda seleccionada por el usuario', async () => {
    const usdIncome: SessionTransaction = {
      ...incomeTransaction,
      id: 'usd-income',
      amountMinor: 125000,
      currency: 'USD',
      occurredOn: '2026-02-02',
    };
    const screen = await renderMap(
      jest.fn(),
      jest.fn(),
      undefined,
      [transaction, usdIncome],
      'USD',
    );

    expect(
      screen.getByTestId('map-month-income-amount').props.children,
    ).toContain('$');
    expect(
      screen.getByTestId('map-month-income-amount').props.children,
    ).not.toContain('€');

    await fireEvent.press(screen.getByTestId('map-month-income-badge'));
    expect(
      within(screen.getByTestId('income-period-selector')).getByText(
        'Febrero 2026',
      ),
    ).toBeTruthy();
    expect(screen.getByTestId('income-period-total').props.children).toContain(
      '$',
    );
    expect(
      screen.getByTestId('income-period-total').props.children,
    ).not.toContain('€');
  });

  it('amplía el futuro bajo demanda en bloques de dos años', async () => {
    const screen = await renderMap();

    await fireEvent.press(screen.getByLabelText('Ver más'));
    expect(
      screen.getByTestId('map-calendar-range-end', {
        includeHiddenElements: true,
      }).props.children,
    ).toBe('2030-02-28');
  });

  it('muestra un estado vacío al elegir un día sin gastos', async () => {
    const screen = await renderMap();

    await fireEvent.press(screen.getByTestId('2026-02-10'));
    expect(screen.getByText('No hay movimientos este día')).toBeTruthy();
  });

  it('muestra una ocurrencia recurrente proyectada en un mes futuro', async () => {
    const onOpenTransactionDetail = jest.fn();
    const screen = await renderMap(jest.fn(), onOpenTransactionDetail);

    await fireEvent.press(screen.getByTestId('2026-02-28'));
    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Gasto: Música, 12,99 €, 28/02/2026',
      }),
    );
    await waitFor(() =>
      expect(onOpenTransactionDetail).toHaveBeenCalledWith(
        createProjectedTransactionId('music-series', '2026-02-28'),
      ),
    );
  });

  it('permite volver a hoy al alejarse seis meses del mes actual', async () => {
    const screen = await renderMap();

    expect(screen.queryByLabelText('Volver a hoy')).toBeNull();

    for (let index = 0; index < 6; index += 1) {
      await fireEvent.press(screen.getByLabelText('Ver mes siguiente'));
    }
    expect(screen.getByTestId('map-return-direction-up')).toBeTruthy();
    expect(screen.queryByTestId('map-return-direction-down')).toBeNull();
    expect(
      StyleSheet.flatten(
        screen.getByTestId('map-return-today-container').props.style,
      ),
    ).toMatchObject({
      bottom: 34 + layout.floatingActionSize + spacing.md,
      right: mapReturnToTodayRight,
      height: layout.floatingActionSize,
    });
    expect(
      StyleSheet.flatten(
        screen.getByTestId('map-return-today-button').props.style,
      ),
    ).toMatchObject({ borderColor: colors.border, borderWidth: 1 });

    await fireEvent.press(screen.getByLabelText('Volver a hoy'));
    expect(screen.getByText('Febrero 2026')).toBeTruthy();
    expect(screen.queryByLabelText('Volver a hoy')).toBeNull();
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    expect(mockWeeklyMount).toHaveBeenCalledTimes(1);
    expect(mockScrollToDate).toHaveBeenCalledWith('2026-02-02');
    expect(screen.queryByLabelText('Volver a hoy')).toBeNull();
    expect(screen.queryByText(/Volviendo al/)).toBeNull();

    await act(() => new Promise((resolve) => setTimeout(resolve, 1000)));
    for (let index = 0; index < 6; index += 1) {
      await fireEvent.press(screen.getByLabelText('Ver mes anterior'));
    }
    expect(screen.getByTestId('map-return-direction-down')).toBeTruthy();
    expect(screen.queryByTestId('map-return-direction-up')).toBeNull();
  });
});
