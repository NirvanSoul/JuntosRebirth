import { fireEvent, render, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createPreviewBadgeLayout } from '@/components/ui/CreatePreviewBadge/CreatePreviewBadge';
import { moneyAccountCardLayout } from '@/features/accounts/components/MoneyAccountCard/MoneyAccountCard';
import { HomeScreen } from '@/features/dashboard/screens/HomeScreen';
import type { Category } from '@/features/categories/types';
import {
  formatTransactionPeriod,
  shiftTransactionPeriod,
} from '@/features/dashboard/utils/transactionPeriod';
import type { SessionTransaction } from '@/features/transactions/types';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { categoryColors } from '@/theme/categoryColors';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/fonts';
import { iconSize } from '@/theme/layout';
import { previewCardLayout } from '@/theme/previewCard';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual<typeof import('@react-navigation/native')>(
    '@react-navigation/native',
  ),
  useScrollToTop: jest.fn(),
}));

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
    createdBy: 'install-test',
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
    createdBy: 'install-test',
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
        <ThemeProvider initialAppearance="light">
          <HomeScreen />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    expect(screen.queryByText('Tu dinero, claro.')).toBeNull();
    expect(screen.queryByTestId('home-income-expense-arc')).toBeNull();
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
    expect(screen.getByText('Aún no hay cuentas')).toBeTruthy();
    expect(
      StyleSheet.flatten(
        screen.getByTestId('home-empty-accounts-icon').props.style,
      ).backgroundColor,
    ).toBe(colors.cta);
    expect(screen.getByText('Movimientos Recientes')).toBeTruthy();
    // Categorías, Cuentas y Movimientos Recientes.
    expect(screen.getAllByText('Ver más')).toHaveLength(3);
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
        <ThemeProvider initialAppearance="light">
          <HomeScreen categories={categories} transactions={transactions} />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId('home-balance').props.children).toContain(
      '2.000',
    );
    expect(screen.getByLabelText(/Balance disponible:.*2\.000/)).toBeTruthy();
    expect(screen.getByTestId('home-income-expense-arc')).toBeTruthy();
    expect(
      screen.getAllByTestId('home-income-expense-arc-segment-income', {
        includeHiddenElements: true,
      }),
    ).toHaveLength(1);
    expect(
      screen.getAllByTestId('home-income-expense-arc-segment-expense', {
        includeHiddenElements: true,
      }),
    ).toHaveLength(1);
    expect(
      screen.getByLabelText('Ingresos 83%, gastos 17% de este mes'),
    ).toBeTruthy();
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
    expect(categoryCardStyle.backgroundColor).toBe(colors.surface);
    expect(categoryCardStyle).toMatchObject(shadows.subtle);
    expect(categoryCardStyle.overflow).toBe('visible');
    expect(screen.queryByTestId('gradient-card-background')).toBeNull();
    expect(
      StyleSheet.flatten(
        screen.getByTestId('home-category-scroller').props.style,
      ),
    ).toMatchObject({ marginHorizontal: -24, overflow: 'visible' });
    expect(
      StyleSheet.flatten(
        screen.getByTestId('home-category-scroller').props
          .contentContainerStyle,
      ),
    ).toMatchObject({ overflow: 'visible', paddingVertical: spacing.md });
    expect(screen.getAllByTestId('category-budget-ring')).toHaveLength(2);
    expect(screen.getAllByTestId('category-budget-track')).toHaveLength(2);
    expect(
      screen.getAllByTestId('category-budget-track')[0]!.props.opacity,
    ).toBe(0.25);
    expect(
      screen.getAllByTestId('category-budget-track')[0]!.props.strokeWidth,
    ).toBeCloseTo(4.14);
    expect(screen.getByTestId('category-budget-value')).toBeTruthy();
    expect(
      StyleSheet.flatten(
        screen.getAllByTestId('category-tile-icon')[0]!.props.style,
      ).backgroundColor,
    ).toBe(categoryColors.yellow);
    expect(
      StyleSheet.flatten(
        screen.getAllByTestId('category-tile-icon')[0]!.props.style,
      ).borderRadius,
    ).toBe(999);
    expect(
      StyleSheet.flatten(
        screen.getAllByTestId('category-tile-icon')[0]!.props.style,
      ).width,
    ).toBeCloseTo(54);
    expect(
      StyleSheet.flatten(screen.getByText('Salario').props.style).color,
    ).toBe(colors.textPrimary);
    expect(
      within(screen.getAllByTestId('category-preview-card')[0]!).getByTestId(
        'phosphor-react-native-money-fill',
      ).props.color,
    ).toBe(colors.onBrand);
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
        <ThemeProvider initialAppearance="light">
          <HomeScreen
            categories={categories}
            transactions={recentTransactions}
          />
        </ThemeProvider>
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
        <ThemeProvider initialAppearance="light">
          <HomeScreen categories={categories} transactions={transactions} />
        </ThemeProvider>
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
        <ThemeProvider initialAppearance="light">
          <HomeScreen
            categories={categories}
            onViewMovements={onViewMovements}
            transactions={recentTransactions}
          />
        </ThemeProvider>
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
        <ThemeProvider initialAppearance="light">
          <HomeScreen
            categories={categories}
            transactions={[newerByDateButUntouched, oldButJustEdited]}
          />
        </ThemeProvider>
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
        <ThemeProvider initialAppearance="light">
          <HomeScreen
            categories={categories}
            transactions={[plannedCurrentMonthIncome, nextMonthIncome]}
          />
        </ThemeProvider>
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
        <ThemeProvider initialAppearance="light">
          <HomeScreen
            categories={categories}
            transactions={[futureOccurrence, currentOccurrence]}
          />
        </ThemeProvider>
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
        <ThemeProvider initialAppearance="light">
          <HomeScreen
            categories={categories}
            onCreateExpense={onCreateExpense}
            onCreateIncome={onCreateIncome}
            onCreateMovement={onCreateMovement}
            transactions={transactions}
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    await fireEvent.press(
      screen.getByRole('button', { name: /Ingresos de este mes/ }),
    );
    const incomeModal = await screen.findByTestId('income-period-modal');
    const monthlyFilter = screen.getByRole('radio', {
      name: 'Periodo: Mensual',
    });
    expect(monthlyFilter.props.accessibilityState).toMatchObject({
      checked: true,
    });
    expect(StyleSheet.flatten(monthlyFilter.props.style)).toMatchObject({
      backgroundColor: colors.surface,
      borderColor: colors.border,
      elevation: 0,
      shadowOpacity: 0,
    });
    expect(StyleSheet.flatten(monthlyFilter.props.style)).not.toHaveProperty(
      'minWidth',
    );
    expect(
      StyleSheet.flatten(
        screen.getByTestId('income-period-selector-options-scroll').props.style,
      ).overflow,
    ).toBe('visible');
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
    expect(nextPeriodButton.props.accessibilityState).toMatchObject({
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
    ).toMatchObject({ checked: true });
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
        <ThemeProvider initialAppearance="light">
          <HomeScreen
            onCreateCategory={onCreateCategory}
            onCreateExpense={onCreateExpense}
            onViewCategories={onViewCategories}
            onViewMovements={onViewMovements}
          />
        </ThemeProvider>
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
        <ThemeProvider initialAppearance="light">
          <HomeScreen categories={categories.slice(0, 1)} />
        </ThemeProvider>
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
        <ThemeProvider initialAppearance="light">
          <HomeScreen
            categories={categories.slice(0, 1)}
            onOpenCategoryDetail={onOpenCategoryDetail}
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    await fireEvent.press(
      screen.getByRole('button', { name: /Salario, gastado/ }),
    );

    expect(onOpenCategoryDetail).toHaveBeenCalledWith('salary');
  });

  it('ofrece crear una categoría al final de sus previews', async () => {
    const onCreateCategory = jest.fn();
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <HomeScreen
            categories={categories.slice(0, 1)}
            onCreateCategory={onCreateCategory}
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    const badge = screen.getByTestId('home-category-create-badge');
    expect(StyleSheet.flatten(badge.props.style)).toMatchObject({
      ...createPreviewBadgeLayout,
      backgroundColor: colors.surface,
    });
    expect(screen.getByText('Crear categoría')).toBeTruthy();

    await fireEvent.press(badge);

    expect(onCreateCategory).toHaveBeenCalledTimes(1);
  });

  it('aísla los resúmenes de categoría por la moneda activa del encabezado (no mezcla EUR y VES)', async () => {
    const multiCurrencyTransactions: SessionTransaction[] = [
      {
        id: 'tx-eur',
        createdBy: 'install-test',
        spaceId: 'personal',
        type: 'expense',
        amountMinor: 1000,
        currency: 'EUR',
        title: 'Supermercado EUR',
        categoryId: 'housing',
        occurredOn: dateInCurrentMonth(1),
        recurrence: 'once',
        updatedAt: '2026-07-01T12:00:00.000Z',
      },
      {
        id: 'tx-ves',
        createdBy: 'install-test',
        spaceId: 'personal',
        type: 'expense',
        amountMinor: 4000,
        currency: 'VES',
        title: 'Supermercado VES',
        categoryId: 'housing',
        occurredOn: dateInCurrentMonth(2),
        recurrence: 'once',
        updatedAt: '2026-07-02T12:00:00.000Z',
      },
    ];

    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <HomeScreen
            categories={categories.filter((c) => c.id === 'housing')}
            currency="EUR"
            transactions={multiCurrencyTransactions}
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    expect(
      screen.getByRole('button', {
        name: /Vivienda, gastado 10/,
      }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', {
        name: /50/,
      }),
    ).toBeNull();
  });

  it('calcula el presupuesto con spaceCurrency (VES) mientras muestra el gasto en displayCurrency (EUR)', async () => {
    const multiCurrencyTransactions: SessionTransaction[] = [
      {
        id: 'tx-eur',
        createdBy: 'install-test',
        spaceId: 'personal',
        type: 'expense',
        amountMinor: 1000, // 10 EUR
        currency: 'EUR',
        title: 'Café EUR',
        categoryId: 'housing',
        occurredOn: dateInCurrentMonth(1),
        recurrence: 'once',
        updatedAt: '2026-07-01T12:00:00.000Z',
      },
      {
        id: 'tx-ves',
        createdBy: 'install-test',
        spaceId: 'personal',
        type: 'expense',
        amountMinor: 4000, // 40 VES
        currency: 'VES',
        title: 'Mercado VES',
        categoryId: 'housing',
        occurredOn: dateInCurrentMonth(2),
        recurrence: 'once',
        updatedAt: '2026-07-02T12:00:00.000Z',
      },
    ];

    const categoryWithBudget: Category = {
      id: 'housing',
      spaceId: 'personal',
      name: 'Vivienda',
      icon: 'house',
      colorToken: 'blue',
      budgetMinor: 10000, // 100 VES de presupuesto
      isDefault: true,
      isArchived: false,
    };

    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <HomeScreen
            categories={[categoryWithBudget]}
            currency="EUR"
            spaceCurrency="VES"
            transactions={multiCurrencyTransactions}
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    // Gasto visible en EUR: 10 € en la tarjeta
    expect(
      screen.getByRole('button', {
        name: /Vivienda, gastado 10/,
      }),
    ).toBeTruthy();

    // Anillo de progreso de presupuesto calculado en VES (40 VES / 100 VES = 40%)
    expect(screen.getByLabelText('Presupuesto utilizado 40%')).toBeTruthy();
  });
  describe('sección de cuentas', () => {
    const account = {
      id: 'account-1',
      spaceId: 'personal',
      name: 'Cuenta nómina',
      kind: 'bank' as const,
      icon: 'bank' as const,
      colorToken: 'blue' as const,
      balances: [{ currency: 'EUR' as const, openingBalanceMinor: 100000 }],
      isArchived: false,
    };

    const renderHome = (props = {}) =>
      render(
        <SafeAreaProvider
          initialMetrics={{
            frame: { x: 0, y: 0, width: 390, height: 844 },
            insets: { top: 47, right: 0, bottom: 34, left: 0 },
          }}
        >
          <ThemeProvider initialAppearance="light">
            <HomeScreen
              categories={categories}
              transactions={transactions}
              {...props}
            />
          </ThemeProvider>
        </SafeAreaProvider>,
      );

    it('muestra solo las tarjetas, sin la lista de Actividad', async () => {
      const screen = await renderHome({ moneyAccounts: [account] });

      expect(screen.getByTestId('home-account-scroller')).toBeTruthy();
      const card = screen.getByTestId('money-account-card-account-1');
      expect(card).toBeTruthy();
      expect(StyleSheet.flatten(card.props.style)).toMatchObject({
        ...shadows.subtle,
        backgroundColor: colors.surface,
        overflow: 'visible',
        ...moneyAccountCardLayout,
      });
      expect(StyleSheet.flatten(card.props.style)).not.toHaveProperty(
        'borderWidth',
      );
      expect(
        screen.getByTestId('money-account-card-account-1-currencies').props
          .children,
      ).toBe('EUR');
      expect(
        StyleSheet.flatten(
          screen.getByTestId('money-account-card-account-1-currencies').props
            .style,
        ).color,
      ).toBe(categoryColors.blue);
      expect(
        StyleSheet.flatten(
          screen.getByTestId('money-account-card-account-1-title').props.style,
        ).fontFamily,
      ).toBe(fontFamily.bold);
      expect(
        StyleSheet.flatten(screen.getByText('Cuenta bancaria').props.style)
          .fontFamily,
      ).toBe(fontFamily.light);
      expect(
        StyleSheet.flatten(screen.getByText('Cuenta bancaria').props.style)
          .fontSize,
      ).toBe(15);
      expect(
        StyleSheet.flatten(
          screen.getByTestId('money-account-card-account-1-balance').props
            .style,
        ).fontFamily,
      ).toBe(fontFamily.medium);
      expect(
        screen.queryByTestId('money-account-card-account-1-comparison'),
      ).toBeNull();
      expect(
        StyleSheet.flatten(
          screen.getByTestId('home-account-scroller').props.style,
        ).overflow,
      ).toBe('visible');
      expect(
        StyleSheet.flatten(
          screen.getByTestId('home-account-scroller').props
            .contentContainerStyle,
        ),
      ).toMatchObject({ overflow: 'visible', paddingVertical: spacing.md });
      expect(screen.queryByTestId('money-account-row-account-1')).toBeNull();
    });

    it('muestra la comparación solo después de actividad de esa cuenta el mes anterior', async () => {
      const previousMonth = new Date();
      previousMonth.setMonth(previousMonth.getMonth() - 1, 1);
      const previousMonthTransaction = {
        ...transactions[0]!,
        id: 'account-previous-month',
        moneyAccountId: account.id,
        occurredOn: `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}-01`,
      };
      const currentMonthTransaction = {
        ...transactions[1]!,
        id: 'account-current-month',
        moneyAccountId: account.id,
      };
      const screen = await renderHome({
        moneyAccounts: [account],
        transactions: [previousMonthTransaction, currentMonthTransaction],
      });

      expect(
        screen.getByTestId('money-account-card-account-1-comparison'),
      ).toBeTruthy();
    });

    it('lleva a Actividad desde «Ver más»', async () => {
      const onViewAccounts = jest.fn();
      const screen = await renderHome({
        moneyAccounts: [account],
        onViewAccounts,
      });

      await fireEvent.press(screen.getByLabelText('Ver más de Cuentas'));

      expect(onViewAccounts).toHaveBeenCalled();
    });

    it('abre el detalle al tocar una tarjeta', async () => {
      const onOpenMoneyAccountDetail = jest.fn();
      const screen = await renderHome({
        moneyAccounts: [account],
        onOpenMoneyAccountDetail,
      });

      await fireEvent.press(screen.getByTestId('money-account-card-account-1'));

      expect(onOpenMoneyAccountDetail).toHaveBeenCalledWith('account-1');
    });

    it('ofrece crear otra cuenta desde la última tarjeta', async () => {
      const onCreateMoneyAccount = jest.fn();
      const screen = await renderHome({
        moneyAccounts: [account],
        onCreateMoneyAccount,
      });

      const createCard = screen.getByTestId('money-account-create-card');
      expect(createCard).toBeTruthy();
      expect(StyleSheet.flatten(createCard.props.style)).toMatchObject({
        ...createPreviewBadgeLayout,
        backgroundColor: colors.surface,
      });
      expect(
        StyleSheet.flatten(
          screen.getByTestId('money-account-create-card-icon-background').props
            .style,
        ).backgroundColor,
      ).toBe(colors.cta);
      expect(screen.getByText('Crear cuenta')).toBeTruthy();

      await fireEvent.press(createCard);

      expect(onCreateMoneyAccount).toHaveBeenCalledTimes(1);
    });
  });
});
