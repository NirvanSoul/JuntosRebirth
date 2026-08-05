import { act, fireEvent, render, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HomeScreen } from '@/features/dashboard/screens/HomeScreen';
import type { Category } from '@/features/categories/types';
import {
  formatTransactionPeriod,
  shiftTransactionPeriod,
} from '@/features/dashboard/utils/transactionPeriod';
import type { SessionTransaction } from '@/features/transactions/types';
import { colors } from '@/theme/colors';
import { iconSize } from '@/theme/layout';
import { previewCardLayout } from '@/theme/previewCard';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';

function dateInCurrentMonth(day: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  return `${year}-${month}-${String(day).padStart(2, '0')}`;
}

function dateInNextMonth(day: number): string {
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1, day);

  return `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-${String(nextMonth.getDate()).padStart(2, '0')}`;
}

const transactions: SessionTransaction[] = [
  {
    id: 'income-current-month',
    spaceId: 'personal',
    type: 'income',
    amountMinor: 250_000,
    currency: 'EUR',
    title: 'Nómina',
    categoryId: 'salary',
    occurredOn: dateInCurrentMonth(1),
    recurrence: 'monthly',
    nextOccurrenceOn: dateInNextMonth(1),
    recurrenceSeriesId: 'salary-series',
    recurrenceStartsOn: dateInCurrentMonth(1),
    updatedAt: '2026-07-01T12:00:00.000Z',
  },
  {
    id: 'expense-current-month',
    spaceId: 'personal',
    type: 'expense',
    amountMinor: 50_000,
    currency: 'EUR',
    title: 'Alquiler',
    categoryId: 'housing',
    occurredOn: dateInCurrentMonth(2),
    recurrence: 'once',
    updatedAt: '2026-07-02T12:00:00.000Z',
  },
];

const categories: Category[] = [
  {
    id: 'salary',
    spaceId: 'personal',
    name: 'Salario',
    icon: 'money',
    colorToken: 'yellow',
    isDefault: true,
    isArchived: false,
  },
  {
    id: 'housing',
    spaceId: 'personal',
    name: 'Vivienda',
    icon: 'house',
    colorToken: 'blue',
    budgetMinor: 100_000,
    isDefault: true,
    isArchived: false,
  },
];

describe('HomeScreen', () => {
  it('presenta el estado financiero inicial sin datos ficticios', async () => {
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <HomeScreen />
      </SafeAreaProvider>,
    );

    expect(screen.queryByText('Tu dinero, claro.')).toBeNull();
    expect(screen.getByText('Balance disponible')).toBeTruthy();
    expect(screen.getByTestId('home-balance').props.children).not.toContain(
      ',00',
    );
    expect(
      StyleSheet.flatten(screen.getByTestId('home-balance-hero').props.style)
        .marginTop,
    ).toBe(spacing.none);
    expect(screen.getAllByText(/^0\s*€$/)).toHaveLength(3);
    expect(screen.getByText('Aún no hay categorías')).toBeTruthy();
    expect(screen.getByText('Aún no hay movimientos')).toBeTruthy();
    expect(screen.getByText('Movimientos Recientes')).toBeTruthy();
    expect(screen.getAllByText('Ver más')).toHaveLength(2);
    const movementsLink = screen.getByLabelText(
      'Ver más de Movimientos Recientes',
    );
    expect(
      StyleSheet.flatten(within(movementsLink).getByText('Ver más').props.style)
        .fontSize,
    ).toBe(13);
    expect(
      StyleSheet.flatten(
        screen.getByTestId('home-empty-categories-icon').props.style,
      ).backgroundColor,
    ).toBe(colors.categoryAction);
    expect(
      StyleSheet.flatten(
        screen.getByTestId('home-empty-categories-icon').props.style,
      ),
    ).toMatchObject({ height: 56, width: 56 });
    expect(
      StyleSheet.flatten(
        screen.getByTestId('home-empty-categories-glyph').props.style,
      ).color,
    ).toBe(colors.onBrand);
    expect(
      StyleSheet.flatten(
        screen.getByTestId('home-empty-categories-glyph').props.style,
      ).fontSize,
    ).toBe(iconSize.lg);
    expect(
      StyleSheet.flatten(
        screen.getByTestId('home-empty-categories').props.style,
      ),
    ).toMatchObject(shadows.subtle);
    expect(
      StyleSheet.flatten(
        screen.getByTestId('home-empty-categories').props.style,
      ),
    ).toMatchObject({ borderWidth: 1, borderColor: colors.border });
    expect(
      StyleSheet.flatten(
        screen.getByText('Crea una categoría para organizar tus movimientos.')
          .props.style,
      ).marginTop,
    ).toBe(spacing.xxs);
  });

  it('muestra el balance, los totales del mes y la actividad recibida', async () => {
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <HomeScreen categories={categories} transactions={transactions} />
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId('home-balance').props.children).toContain(
      '2.000',
    );
    expect(screen.getByLabelText(/Balance disponible:.*2\.000/)).toBeTruthy();
    expect(
      StyleSheet.flatten(
        screen.getByTestId('home-transaction-preview-list').props.style,
      ).gap,
    ).toBe(previewCardLayout.listGap);
    expect(screen.getByLabelText(/Ingresos de este mes:.*2\.500/)).toBeTruthy();
    expect(screen.getByLabelText(/Gastos de este mes:.*500/)).toBeTruthy();
    expect(
      StyleSheet.flatten(screen.getByTestId('home-summary').props.style)
        .marginTop,
    ).toBe(spacing.lg);
    expect(
      StyleSheet.flatten(screen.getByTestId('home-income-badge').props.style)
        .backgroundColor,
    ).toBe(colors.surface);
    expect(
      StyleSheet.flatten(screen.getByTestId('home-expense-badge').props.style)
        .backgroundColor,
    ).toBe(colors.surface);
    expect(
      StyleSheet.flatten(screen.getByTestId('home-income-badge').props.style)
        .borderRadius,
    ).toBe(previewCardLayout.borderRadius);
    expect(
      StyleSheet.flatten(
        screen.getByTestId('home-income-icon-background').props.style,
      ).borderRadius,
    ).toBe(previewCardLayout.directionIconRadius);
    expect(
      StyleSheet.flatten(screen.getByTestId('home-income-badge').props.style),
    ).toMatchObject(shadows.subtle);
    expect(
      StyleSheet.flatten(screen.getByTestId('home-expense-badge').props.style),
    ).toMatchObject(shadows.subtle);
    expect(
      StyleSheet.flatten(screen.getByTestId('home-income-icon').props.style)
        .transform,
    ).toEqual([{ rotate: '45deg' }]);
    expect(
      StyleSheet.flatten(screen.getByTestId('home-expense-icon').props.style)
        .transform,
    ).toEqual([{ rotate: '45deg' }]);
    expect(screen.getByTestId('home-income-amount').props.children).toContain(
      '2.500',
    );
    expect(screen.getByTestId('home-expense-amount').props.children).toContain(
      '500',
    );
    expect(
      StyleSheet.flatten(screen.getByTestId('home-income-label').props.style)
        .fontSize,
    ).toBe(13);
    expect(
      StyleSheet.flatten(screen.getByTestId('home-income-amount').props.style)
        .fontSize,
    ).toBe(17);
    expect(screen.getAllByTestId('transaction-preview-card')).toHaveLength(2);
    expect(screen.getByText('Nómina')).toBeTruthy();
    expect(screen.getByText('Alquiler')).toBeTruthy();
    expect(screen.getAllByTestId('category-preview-card')).toHaveLength(2);
    const categoryCardStyle = StyleSheet.flatten(
      screen.getAllByTestId('category-preview-card')[0]!.props.style,
    );
    expect(categoryCardStyle.minHeight).toBeCloseTo(147.6);
    expect(categoryCardStyle.width).toBeCloseTo(118.8);
    await act(() => {
      screen.getAllByTestId('category-tile-gradient')[0]!.props.onLayout({
        nativeEvent: {
          layout: { height: 147.6, width: 118.8, x: 0, y: 0 },
        },
      });
    });
    expect(
      screen.getAllByTestId('gradient-card-background', {
        includeHiddenElements: true,
      }),
    ).toHaveLength(2);
    const gradientFill = screen.getAllByTestId('gradient-card-fill', {
      includeHiddenElements: true,
    })[0]!;
    expect(gradientFill.props).toMatchObject({
      height: 147.6,
      width: 118.8,
      x: '0',
      y: '0',
    });
    expect(
      StyleSheet.flatten(
        screen.getByTestId('home-category-scroller').props.style,
      ).marginHorizontal,
    ).toBe(-24);
    expect(screen.getAllByTestId('category-budget-ring')).toHaveLength(2);
    expect(screen.getAllByTestId('category-budget-track')).toHaveLength(2);
    expect(
      screen.getAllByTestId('category-budget-track')[0]!.props.opacity,
    ).toBe(0.25);
    expect(screen.getByTestId('category-budget-value')).toBeTruthy();
    expect(
      StyleSheet.flatten(
        screen.getAllByTestId('category-tile-icon')[0]!.props.style,
      ),
    ).not.toHaveProperty('backgroundColor');
    expect(
      StyleSheet.flatten(screen.getByText('Salario').props.style).color,
    ).toBe(colors.textPrimary);
    expect(
      within(screen.getAllByTestId('category-preview-card')[0]!).getByTestId(
        'phosphor-react-native-money-fill',
      ).props.color,
    ).toBe(colors.textPrimary);
    expect(screen.getByLabelText(/Vivienda, gastado 500/)).toBeTruthy();
  });

  it('muestra los ocho movimientos creados o modificados más recientemente, con enlace para ver el resto', async () => {
    // Fechas económicas deliberadamente desordenadas respecto a `updatedAt`:
    // el orden esperado sigue únicamente cuándo se creó o editó cada uno.
    const recentTransactions = Array.from({ length: 9 }, (_, index) => ({
      ...transactions[1]!,
      id: `recent-transaction-${index + 1}`,
      title: `Movimiento reciente ${index + 1}`,
      occurredOn: dateInCurrentMonth(((index * 3) % 6) + 1),
      updatedAt: `2026-07-${String(29 - index).padStart(2, '0')}T12:00:00.000Z`,
    }));
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <HomeScreen categories={categories} transactions={recentTransactions} />
      </SafeAreaProvider>,
    );

    expect(screen.getAllByTestId('transaction-preview-card')).toHaveLength(8);
    expect(screen.getByText('Movimiento reciente 1')).toBeTruthy();
    expect(screen.getByText('Movimiento reciente 8')).toBeTruthy();
    expect(screen.queryByText('Movimiento reciente 9')).toBeNull();
    expect(screen.getByTestId('home-transactions-view-more')).toBeTruthy();
  });

  it('no muestra el enlace inferior de ver más cuando caben todos los movimientos', async () => {
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <HomeScreen categories={categories} transactions={transactions} />
      </SafeAreaProvider>,
    );

    expect(screen.queryByTestId('home-transactions-view-more')).toBeNull();
  });

  it('el enlace inferior de ver más lleva a Actividad, sección de movimientos', async () => {
    const onViewMovements = jest.fn();
    const recentTransactions = Array.from({ length: 9 }, (_, index) => ({
      ...transactions[1]!,
      id: `recent-transaction-${index + 1}`,
      title: `Movimiento reciente ${index + 1}`,
      occurredOn: dateInCurrentMonth(1),
      updatedAt: `2026-07-${String(29 - index).padStart(2, '0')}T12:00:00.000Z`,
    }));
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <HomeScreen
          categories={categories}
          onViewMovements={onViewMovements}
          transactions={recentTransactions}
        />
      </SafeAreaProvider>,
    );

    await fireEvent.press(screen.getByTestId('home-transactions-view-more'));
    expect(onViewMovements).toHaveBeenCalledTimes(1);
  });

  it('sube un movimiento editado al principio de los recientes aunque su fecha sea antigua', async () => {
    const oldButJustEdited: SessionTransaction = {
      ...transactions[1]!,
      id: 'edited-old-transaction',
      title: 'Gasto antiguo recién editado',
      occurredOn: dateInCurrentMonth(1),
      updatedAt: '2026-07-29T09:00:00.000Z',
    };
    const newerByDateButUntouched: SessionTransaction = {
      ...transactions[0]!,
      id: 'untouched-newer-date',
      title: 'Ingreso sin tocar',
      occurredOn: dateInCurrentMonth(15),
      updatedAt: '2026-07-01T09:00:00.000Z',
    };
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <HomeScreen
          categories={categories}
          transactions={[newerByDateButUntouched, oldButJustEdited]}
        />
      </SafeAreaProvider>,
    );

    const cards = screen.getAllByTestId('transaction-preview-card');
    expect(
      within(cards[0]!).getByText('Gasto antiguo recién editado'),
    ).toBeTruthy();
    expect(within(cards[1]!).getByText('Ingreso sin tocar')).toBeTruthy();
  });

  it('incluye el mes actual completo y excluye los meses posteriores', async () => {
    const plannedCurrentMonthIncome: SessionTransaction = {
      ...transactions[0]!,
      id: 'planned-current-month-income',
      amountMinor: 50_000,
      title: 'Ingreso de fin de mes',
      occurredOn: dateInCurrentMonth(
        new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          0,
        ).getDate(),
      ),
    };
    const nextMonthIncome: SessionTransaction = {
      ...transactions[0]!,
      id: 'next-month-income',
      amountMinor: 90_000,
      title: 'Ingreso del mes siguiente',
      occurredOn: dateInNextMonth(1),
    };
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <HomeScreen
          categories={categories}
          transactions={[plannedCurrentMonthIncome, nextMonthIncome]}
        />
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId('home-balance').props.children).toContain('500');
    expect(screen.getByTestId('home-income-amount').props.children).toContain(
      '500',
    );
    expect(screen.getByText('Ingreso de fin de mes')).toBeTruthy();
    expect(screen.queryByText('Ingreso del mes siguiente')).toBeNull();
  });

  it('mantiene la carpeta personalizada aunque otra fecha sea de un mes posterior', async () => {
    const currentOccurrence: SessionTransaction = {
      ...transactions[1]!,
      id: 'custom-current-month',
      title: 'Pago personalizado',
      occurredOn: dateInCurrentMonth(2),
      recurrence: 'custom',
      recurrenceGroupId: 'custom-payment-group',
    };
    const futureOccurrence: SessionTransaction = {
      ...currentOccurrence,
      id: 'custom-next-month',
      occurredOn: dateInNextMonth(2),
    };
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <HomeScreen
          categories={categories}
          transactions={[futureOccurrence, currentOccurrence]}
        />
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId('transaction-preview-group')).toBeTruthy();
    expect(screen.getAllByTestId('transaction-preview-card')).toHaveLength(1);
    expect(screen.getByTestId('transaction-stack-layer-back')).toBeTruthy();
    expect(screen.getByTestId('transaction-stack-layer-middle')).toBeTruthy();
    expect(screen.queryByTestId('transaction-group-toggle')).toBeNull();
  });

  it('abre los modales de ingresos, gastos y balance con sus totales y altas', async () => {
    const onCreateIncome = jest.fn();
    const onCreateExpense = jest.fn();
    const onCreateMovement = jest.fn();
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <HomeScreen
          categories={categories}
          onCreateExpense={onCreateExpense}
          onCreateIncome={onCreateIncome}
          onCreateMovement={onCreateMovement}
          transactions={transactions}
        />
      </SafeAreaProvider>,
    );

    await fireEvent.press(
      screen.getByRole('button', { name: /Ingresos de este mes/ }),
    );
    const incomeModal = await screen.findByTestId('income-period-modal');
    const monthlyFilter = screen.getByRole('radio', {
      name: 'Periodo: Mensual',
    });
    expect(monthlyFilter.props.accessibilityState).toEqual({ checked: true });
    expect(StyleSheet.flatten(monthlyFilter.props.style)).toMatchObject({
      ...shadows.subtle,
      backgroundColor: colors.surface,
      borderColor: colors.cta,
    });
    expect(
      StyleSheet.flatten(
        screen.getByTestId('income-period-selector-month-indicator').props
          .style,
      ).color,
    ).toBe(colors.cta);
    expect(
      screen.getByText(formatTransactionPeriod('month', new Date())),
    ).toBeTruthy();
    expect(screen.getByTestId('income-period-total').props.children).toContain(
      '2.500',
    );
    const nextPeriodButton = screen.getByRole('button', {
      name: 'Ver periodo siguiente',
    });
    expect(nextPeriodButton.props.accessibilityState).toEqual({
      disabled: false,
    });
    await fireEvent.press(nextPeriodButton);
    expect(
      screen.getByText(
        formatTransactionPeriod(
          'month',
          shiftTransactionPeriod('month', new Date(), 1),
        ),
      ),
    ).toBeTruthy();
    expect(screen.getByTestId('income-period-total').props.children).toContain(
      '2.500',
    );
    expect(within(incomeModal).getByText('Nómina')).toBeTruthy();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Ver periodo anterior' }),
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Ver periodo anterior' }),
    );
    expect(
      screen.getByText(
        formatTransactionPeriod(
          'month',
          shiftTransactionPeriod('month', new Date(), -1),
        ),
      ),
    ).toBeTruthy();
    expect(
      StyleSheet.flatten(
        screen.getByTestId('income-period-add-gradient').props.style,
      ).backgroundColor,
    ).toBe(colors.income);
    await fireEvent.press(
      screen.getByRole('button', { name: 'Añadir ingreso' }),
    );
    expect(onCreateIncome).toHaveBeenCalledTimes(1);

    await fireEvent.press(
      screen.getByRole('button', { name: /Gastos de este mes/ }),
    );
    expect(await screen.findByTestId('expense-period-modal')).toBeTruthy();
    expect(screen.getByTestId('expense-period-total').props.children).toContain(
      '500',
    );
    await fireEvent.press(
      screen.getByRole('radio', { name: 'Periodo: Quincenal' }),
    );
    expect(
      screen.getByText(formatTransactionPeriod('fortnight', new Date())),
    ).toBeTruthy();
    await fireEvent.press(
      screen.getByRole('radio', { name: 'Periodo: Anual' }),
    );
    expect(
      screen.getByRole('radio', { name: 'Periodo: Anual' }).props
        .accessibilityState,
    ).toEqual({ checked: true });
    expect(screen.getByText(String(new Date().getFullYear()))).toBeTruthy();
    expect(
      StyleSheet.flatten(
        screen.getByTestId('expense-period-add-gradient').props.style,
      ).backgroundColor,
    ).toBe(colors.expense);
    await fireEvent.press(screen.getByRole('button', { name: 'Añadir gasto' }));
    expect(onCreateExpense).toHaveBeenCalledTimes(1);

    await fireEvent.press(
      screen.getByRole('button', { name: /Balance disponible:.*2\.000/ }),
    );
    const balanceModal = await screen.findByTestId('balance-period-modal');
    expect(
      within(balanceModal).getByTestId('balance-period-total').props.children,
    ).toContain('2.000');
    expect(
      within(balanceModal).getAllByTestId('transaction-preview-card'),
    ).toHaveLength(2);
    await fireEvent.press(
      within(balanceModal).getByRole('button', {
        name: 'Añadir movimiento',
      }),
    );
    expect(onCreateMovement).toHaveBeenCalledTimes(1);
  });

  it('abre los flujos de creación desde los estados vacíos', async () => {
    const onCreateCategory = jest.fn();
    const onCreateExpense = jest.fn();
    const onViewCategories = jest.fn();
    const onViewMovements = jest.fn();
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <HomeScreen
          onCreateCategory={onCreateCategory}
          onCreateExpense={onCreateExpense}
          onViewCategories={onViewCategories}
          onViewMovements={onViewMovements}
        />
      </SafeAreaProvider>,
    );

    await fireEvent.press(screen.getByLabelText('Crear primera categoría'));
    await fireEvent.press(screen.getByLabelText('Crear primer gasto'));
    await fireEvent.press(screen.getByLabelText('Ver más de Categorías'));
    await fireEvent.press(
      screen.getByLabelText('Ver más de Movimientos Recientes'),
    );

    expect(onCreateCategory).toHaveBeenCalledTimes(1);
    expect(onCreateExpense).toHaveBeenCalledTimes(1);
    expect(onViewCategories).toHaveBeenCalledTimes(1);
    expect(onViewMovements).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('home-empty-categories-arrow')).toBeTruthy();
    expect(screen.getByTestId('home-empty-activity-arrow')).toBeTruthy();
  });

  it('muestra las categorías creadas aunque todavía no tengan movimientos', async () => {
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <HomeScreen categories={categories.slice(0, 1)} />
      </SafeAreaProvider>,
    );

    expect(screen.getByText('Salario')).toBeTruthy();
    expect(screen.queryByText('0 movimientos')).toBeNull();
    expect(screen.getByTestId('category-budget-ring')).toBeTruthy();
    expect(screen.queryByTestId('category-budget-value')).toBeNull();
    expect(screen.getByTestId('category-preview-card')).toBeTruthy();
  });

  it('abre el detalle solicitado al tocar una preview de categoría', async () => {
    const onOpenCategoryDetail = jest.fn();
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <HomeScreen
          categories={categories.slice(0, 1)}
          onOpenCategoryDetail={onOpenCategoryDetail}
        />
      </SafeAreaProvider>,
    );

    await fireEvent.press(
      screen.getByRole('button', { name: /Salario, gastado/ }),
    );

    expect(onOpenCategoryDetail).toHaveBeenCalledWith('salary');
  });
});
