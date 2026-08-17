import {
  fireEvent,
  render,
  waitFor,
  within,
} from '@testing-library/react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ActivityScreen } from '@/features/activity/screens/ActivityScreen';
import type { Category } from '@/features/categories/types';
import type { SessionTransaction } from '@/features/transactions/types';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { categoryColors } from '@/theme/categoryColors';
import { colors } from '@/theme/colors';
import { minTouchTarget } from '@/theme/layout';
import { previewCardLayout } from '@/theme/previewCard';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';

const transactions: SessionTransaction[] = [
  {
    id: 'session-1',
    spaceId: 'personal',
    type: 'expense',
    amountMinor: 1250,
    currency: 'EUR',
    title: 'Compra semanal',
    categoryId: 'general',
    occurredOn: '2026-07-30',
    recurrence: 'once',
    updatedAt: '2026-07-30T12:00:00.000Z',
  },
  {
    id: 'session-2',
    spaceId: 'personal',
    type: 'income',
    amountMinor: 2000,
    currency: 'EUR',
    title: 'Reembolso',
    categoryId: 'general',
    occurredOn: '2026-07-30',
    recurrence: 'once',
    updatedAt: '2026-07-30T12:00:00.000Z',
  },
];

const categories: Category[] = [
  {
    id: 'general',
    spaceId: 'personal',
    name: 'General',
    icon: 'dots-three-circle',
    colorToken: 'slate',
    budgetMinor: 5000,
    isDefault: false,
    isArchived: false,
  },
];

describe('ActivityScreen', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-30T12:00:00'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('muestra previews de movimientos y agrega la categoría', async () => {
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <ActivityScreen categories={categories} transactions={transactions} />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    expect(screen.getAllByTestId('transaction-preview-card')).toHaveLength(2);
    expect(
      StyleSheet.flatten(
        screen.getByTestId('activity-category-preview-list').props.style,
      ),
    ).toMatchObject({
      borderColor: colors.categoryPreviewBorder,
      borderRadius: previewCardLayout.borderRadius,
      borderWidth: 2,
      overflow: 'hidden',
    });
    expect(
      StyleSheet.flatten(
        screen.getByTestId('activity-category-preview-group').props.style,
      ),
    ).toMatchObject({
      borderRadius: previewCardLayout.borderRadius,
      ...shadows.subtle,
    });
    expect(
      StyleSheet.flatten(
        screen.getByTestId('activity-transaction-preview-list').props.style,
      ).gap,
    ).toBe(previewCardLayout.listGap);
    expect(screen.getByText('Compra semanal')).toBeTruthy();
    expect(screen.queryByText('2 movimientos')).toBeNull();
    expect(screen.getByText('General')).toBeTruthy();
    const categoryCard = screen.getByTestId('category-preview-card');
    expect(
      within(categoryCard).getByTestId('category-preview-chevron', {
        includeHiddenElements: true,
      }),
    ).toBeTruthy();
    const budgetSummary = within(categoryCard).getByTestId(
      'category-preview-budget-summary',
    );
    expect(within(budgetSummary).getByText(/12,50/)).toBeTruthy();
    expect(within(budgetSummary).getByText(/37,50/)).toBeTruthy();
    expect(StyleSheet.flatten(budgetSummary.props.style)).toMatchObject({
      flexDirection: 'row',
      alignItems: 'center',
    });
    expect(within(categoryCard).queryByText('gastado')).toBeNull();
    expect(within(categoryCard).queryByText('disponible')).toBeNull();
    expect(
      StyleSheet.flatten(
        within(categoryCard).getByTestId('category-preview-spent-amount').props
          .style,
      ).color,
    ).toBe(categoryColors.slate);
    expect(
      StyleSheet.flatten(
        within(categoryCard).getByTestId('category-preview-available-amount')
          .props.style,
      ).color,
    ).toBe(colors.textSecondary);
    expect(categoryCard.props.accessibilityLabel).toMatch(
      /General, 12,50.*gastado, 37,50.*disponible/,
    );
    expect(
      within(categoryCard).getByRole('progressbar').props.accessibilityValue,
    ).toEqual({
      min: 0,
      max: 100,
      now: 25,
      // Etiqueta en el dominio del presupuesto: sin mezcla con el gasto
      // visible, que puede estar en otra moneda.
      text: '25% del presupuesto utilizado',
    });
    expect(
      StyleSheet.flatten(
        within(categoryCard).getByRole('progressbar').props.style,
      ).height,
    ).toBe(spacing.xs);
    expect(
      within(categoryCard).getByTestId('category-preview-budget-progress').props
        .style,
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: '25%' })]),
    );
    expect(
      within(categoryCard).getByTestId(
        'phosphor-react-native-dots-three-circle-fill',
      ),
    ).toBeTruthy();
    const movementCard = screen.getAllByTestId('transaction-preview-card')[0]!;
    expect(StyleSheet.flatten(categoryCard.props.style)).toMatchObject({
      backgroundColor: StyleSheet.flatten(movementCard.props.style)
        .backgroundColor,
      minHeight: StyleSheet.flatten(movementCard.props.style).minHeight,
    });
    expect(StyleSheet.flatten(categoryCard.props.style)).not.toHaveProperty(
      'borderRadius',
    );
    expect(StyleSheet.flatten(categoryCard.props.style)).not.toHaveProperty(
      'borderWidth',
    );
    expect(StyleSheet.flatten(categoryCard.props.style)).not.toHaveProperty(
      'shadowOffset',
    );
    expect(screen.queryByTestId('activity-category-scroller')).toBeNull();
    expect(
      screen.getByLabelText(/Ingresos de los movimientos mostrados:.*20/),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(/Gastos de los movimientos mostrados:.*12,50/),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(/Balance de los movimientos mostrados:.*7,50/),
    ).toBeTruthy();
    expect(screen.getByTestId('activity-balance-glyph')).toBeTruthy();
    expect(
      StyleSheet.flatten(
        screen.getByTestId('activity-income-badge').props.style,
      ).borderRadius,
    ).toBe(previewCardLayout.borderRadius);
    expect(
      StyleSheet.flatten(
        screen.getByTestId('activity-income-icon-background').props.style,
      ).borderRadius,
    ).toBe(previewCardLayout.directionIconRadius);
    expect(
      StyleSheet.flatten(
        screen.getAllByTestId('transaction-direction-icon')[0]!.props.style,
      ),
    ).not.toHaveProperty('backgroundColor');
    expect(
      StyleSheet.flatten(
        screen.getByTestId('activity-balance-icon-background').props.style,
      ).backgroundColor,
    ).toBe(colors.cta);
    expect(
      StyleSheet.flatten(screen.getByTestId('activity-summary').props.style)
        .marginBottom,
    ).toBe(spacing.lg);
    expect(
      screen.getByTestId('activity-screen-scroll-view').props
        .stickyHeaderIndices,
    ).toEqual([2]);
    const chart = screen.getByTestId('category-donut-chart');
    expect(chart).toBeTruthy();
    expect(
      StyleSheet.flatten(screen.getByTestId('categories-section').props.style),
    ).toMatchObject({
      backgroundColor: colors.surface,
      borderRadius: previewCardLayout.borderRadius,
      marginHorizontal: -spacing.xl,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
    });
    expect(
      StyleSheet.flatten(chart.props.style).backgroundColor,
    ).toBeUndefined();
    expect(StyleSheet.flatten(chart.props.style).padding).toBeUndefined();
    expect(StyleSheet.flatten(chart.props.style).elevation).toBeUndefined();
    expect(StyleSheet.flatten(chart.props.style).borderWidth).toBeUndefined();
    expect(
      StyleSheet.flatten(
        within(chart).getByRole('tab', { name: 'Gastos' }).props.style,
      ).height,
    ).toBe(32);
    expect(
      StyleSheet.flatten(
        within(chart).getByTestId('category-mode-control').props.style,
      ).backgroundColor,
    ).toBe(colors.keypad);
    expect(within(chart).getByText('Julio 2026')).toBeTruthy();
    expect(within(chart).queryByText('Distribución mensual')).toBeNull();
    expect(within(chart).getByText(/12,50/)).toBeTruthy();
    expect(
      within(chart).getByTestId('category-donut-segment-general', {
        includeHiddenElements: true,
      }),
    ).toBeTruthy();
    expect(screen.getByText('Balance')).toBeTruthy();
    expect(
      within(chart).getByRole('button', { name: 'Ver mes anterior' }),
    ).toBeTruthy();
    expect(
      within(chart).getByRole('button', { name: 'Ver mes siguiente' }).props
        .accessibilityState,
    ).toMatchObject({ disabled: true });

    await fireEvent.press(within(chart).getByRole('tab', { name: 'Ingresos' }));

    expect(
      within(screen.getByTestId('category-donut-chart')).getByText(/^20\s*€$/),
    ).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Filtros' }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Tipo de movimiento' }),
    );
    await fireEvent.press(screen.getByLabelText('Tipo: Gastos'));
    expect(screen.getAllByTestId('transaction-preview-card')).toHaveLength(2);
    await fireEvent.press(
      screen.getByRole('button', { name: 'Aplicar filtros' }),
    );

    expect(screen.getAllByTestId('transaction-preview-card')).toHaveLength(1);
    expect(screen.getByText('Compra semanal')).toBeTruthy();
    expect(screen.queryByText('Reembolso')).toBeNull();
    expect(
      screen.getByLabelText(/Ingresos de los movimientos mostrados:.*0\s*€/),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(/Gastos de los movimientos mostrados:.*12,50/),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(/Balance de los movimientos mostrados:.*-12,50/),
    ).toBeTruthy();
  });

  it('abre los reportes de ingresos, gastos y balance desde sus badges', async () => {
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
          <ActivityScreen
            categories={categories}
            onCreateExpense={onCreateExpense}
            onCreateIncome={onCreateIncome}
            onCreateMovement={onCreateMovement}
            transactions={transactions}
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    await fireEvent.press(screen.getByTestId('activity-income-badge'));
    const incomeModal = screen.getByTestId('income-period-modal');
    expect(
      within(incomeModal).getByTestId('income-period-total').props.children,
    ).toContain('20');
    await fireEvent.press(
      within(incomeModal).getByRole('button', { name: 'Añadir ingreso' }),
    );
    expect(onCreateIncome).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('activity-expense-badge'));
    const expenseModal = screen.getByTestId('expense-period-modal');
    expect(
      within(expenseModal).getByTestId('expense-period-total').props.children,
    ).toContain('12,50');
    await fireEvent.press(
      within(expenseModal).getByRole('button', { name: 'Añadir gasto' }),
    );
    expect(onCreateExpense).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('activity-balance-badge'));
    const balanceModal = screen.getByTestId('balance-period-modal');
    expect(
      within(balanceModal).getByTestId('balance-period-total').props.children,
    ).toContain('7,50');
    await fireEvent.press(
      within(balanceModal).getByRole('button', { name: 'Añadir movimiento' }),
    );
    expect(onCreateMovement).toHaveBeenCalledTimes(1);
  });

  it('solicita el detalle al tocar una categoría', async () => {
    const onOpenCategoryDetail = jest.fn();
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <ActivityScreen
            categories={categories}
            onOpenCategoryDetail={onOpenCategoryDetail}
            transactions={transactions}
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    await fireEvent.press(screen.getByRole('button', { name: /^General,/ }));

    expect(onOpenCategoryDetail).toHaveBeenCalledWith('general', 'EUR');
  });

  it('abre el detalle al tocar el badge de una categoría en la gráfica', async () => {
    const onOpenCategoryDetail = jest.fn();
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <ActivityScreen
            categories={categories}
            onOpenCategoryDetail={onOpenCategoryDetail}
            transactions={transactions}
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    const chart = screen.getByTestId('category-donut-chart');

    await fireEvent.press(
      within(chart).getByRole('button', {
        name: 'Abrir detalle de General, 100%',
      }),
    );

    expect(onOpenCategoryDetail).toHaveBeenCalledWith('general', 'EUR');
  });

  it('mantiene el mismo tratamiento superior de Inicio y compensa dentro del sticky', async () => {
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <ActivityScreen categories={categories} transactions={transactions} />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    expect(
      StyleSheet.flatten(
        screen.getByTestId('activity-screen-scroll-view').props
          .contentContainerStyle,
      ).paddingTop,
    ).toBe(47 / 2 + minTouchTarget + spacing.lg);
    expect(screen.getByTestId('activity-screen').props.edges).toMatchObject({
      top: 'off',
      left: 'additive',
      right: 'additive',
    });
    expect(
      StyleSheet.flatten(screen.getByTestId('activity-screen').props.style)
        .backgroundColor,
    ).toBe('transparent');
    expect(
      StyleSheet.flatten(
        screen.getByTestId('activity-summary-anchor').props.style,
      ),
    ).toMatchObject({ marginTop: -47, paddingTop: 47 + spacing.sm });
  });

  it('solicita el detalle al tocar un movimiento', async () => {
    const onOpenTransactionDetail = jest.fn();
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <ActivityScreen
            categories={categories}
            onOpenTransactionDetail={onOpenTransactionDetail}
            transactions={transactions}
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    await fireEvent.press(
      screen.getByRole('button', {
        name: /Gasto: Compra semanal/,
      }),
    );

    expect(onOpenTransactionDetail).toHaveBeenCalledWith('session-1');
  });

  it('navega al mes anterior y actualiza los datos de la gráfica', async () => {
    const previousMonthTransaction: SessionTransaction = {
      ...transactions[0]!,
      id: 'previous-month',
      amountMinor: 4200,
      occurredOn: '2026-06-15',
    };
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <ActivityScreen
            categories={categories}
            transactions={[...transactions, previousMonthTransaction]}
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    const chart = screen.getByTestId('category-donut-chart');

    await fireEvent.press(
      within(chart).getByRole('button', { name: 'Ver mes anterior' }),
    );

    expect(within(chart).getByText('Junio 2026')).toBeTruthy();
    expect(within(chart).getByText(/^42\s*€$/)).toBeTruthy();
    expect(
      within(chart).getByRole('button', { name: 'Ver mes siguiente' }).props
        .accessibilityState,
    ).toMatchObject({ disabled: false });
  });

  it('orienta el estado vacío a asociar un movimiento con una categoría', async () => {
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <ActivityScreen categories={categories} transactions={[]} />
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    const chart = screen.getByTestId('category-donut-chart');

    expect(
      within(chart).getByText(
        'Para ver gastos por categoría, registra un gasto y asócialo a una categoría.',
      ),
    ).toBeTruthy();
    expect(within(chart).queryByText('Total gastado')).toBeNull();
    expect(within(chart).queryByText(/0,00/)).toBeNull();

    await fireEvent.press(within(chart).getByRole('tab', { name: 'Ingresos' }));

    expect(
      within(chart).getByText(
        'Para ver ingresos por categoría, registra un ingreso y asócialo a una categoría.',
      ),
    ).toBeTruthy();
    expect(within(chart).queryByText('Total ingresado')).toBeNull();
    expect(within(chart).queryByText(/0,00/)).toBeNull();
  });

  it('convierte los estados vacíos de categorías y movimientos en botones de acción', async () => {
    const onCreateCategory = jest.fn();
    const onCreateExpense = jest.fn();
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <ActivityScreen
            categories={[]}
            onCreateCategory={onCreateCategory}
            onCreateExpense={onCreateExpense}
            transactions={[]}
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId('activity-empty-categories-arrow')).toBeTruthy();
    expect(screen.getByTestId('activity-empty-movements-arrow')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Crear primera categoría'));
    await fireEvent.press(screen.getByLabelText('Crear primer gasto'));

    expect(onCreateCategory).toHaveBeenCalledTimes(1);
    expect(onCreateExpense).toHaveBeenCalledTimes(1);
  });

  it('no ofrece una acción cuando el filtro de movimientos no tiene resultados', async () => {
    const otherCategory: Category = {
      id: 'other',
      spaceId: 'personal',
      name: 'Otra',
      icon: 'dots-three-circle',
      colorToken: 'slate',
      isDefault: false,
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
          <ActivityScreen
            categories={[...categories, otherCategory]}
            transactions={transactions}
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Filtros' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Categoría' }));
    await fireEvent.press(screen.getByLabelText('Categoría: Otra'));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Aplicar filtros' }),
    );

    expect(screen.getByText('No hay movimientos de este tipo')).toBeTruthy();
    expect(
      screen.queryByTestId('activity-empty-filtered-movements-arrow'),
    ).toBeNull();
  });

  it('muestra una barra vacía cuando la categoría no tiene presupuesto', async () => {
    const categoryWithoutBudget: Category = {
      ...categories[0]!,
      budgetMinor: undefined,
    };
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <ActivityScreen
            categories={[categoryWithoutBudget]}
            transactions={transactions}
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    const categoryCard = screen.getByTestId('category-preview-card');
    const progress = within(categoryCard).getByRole('progressbar');

    expect(progress.props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 0,
      text: 'Sin presupuesto asignado',
    });
    expect(
      within(categoryCard).getByTestId('category-preview-budget-progress').props
        .style,
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: '0%' })]),
    );
    expect(
      within(categoryCard).queryByTestId('category-preview-spent-amount'),
    ).toBeNull();
    expect(
      within(categoryCard).queryByTestId('category-preview-available-amount'),
    ).toBeNull();
  });

  it('combina filtros de categoría y recurrencia y permite limpiarlos', async () => {
    const subscriptionCategory: Category = {
      id: 'subscriptions',
      spaceId: 'personal',
      name: 'Suscripciones',
      icon: 'credit-card',
      colorToken: 'violet',
      isDefault: false,
      isArchived: false,
    };
    const recurringTransaction: SessionTransaction = {
      id: 'session-3',
      spaceId: 'personal',
      type: 'expense',
      amountMinor: 999,
      currency: 'EUR',
      title: 'Música',
      categoryId: 'subscriptions',
      occurredOn: '2026-07-30',
      recurrence: 'monthly',
      updatedAt: '2026-07-30T12:00:00.000Z',
    };
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <ActivityScreen
            categories={[...categories, subscriptionCategory]}
            transactions={[...transactions, recurringTransaction]}
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    const separators = screen.getAllByTestId('activity-category-separator', {
      includeHiddenElements: true,
    });

    expect(separators).toHaveLength(1);
    expect(StyleSheet.flatten(separators[0]!.props.style)).toMatchObject({
      backgroundColor: colors.categoryPreviewBorder,
      height: 1,
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Filtros' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Categoría' }));
    await fireEvent.press(screen.getByLabelText('Categoría: Suscripciones'));
    await fireEvent.press(screen.getByLabelText('Categoría: General'));
    expect(
      screen.getByLabelText('Categoría: Suscripciones').props
        .accessibilityState,
    ).toMatchObject({ checked: true });
    expect(
      screen.getByLabelText('Categoría: General').props.accessibilityState,
    ).toMatchObject({ checked: true });
    expect(screen.getByTestId('category-subscriptions-checkmark')).toBeTruthy();
    expect(screen.getByTestId('category-general-checkmark')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Recurrencia' }));
    expect(screen.getByLabelText('Recurrencia: Único')).toBeTruthy();
    expect(screen.getByLabelText('Recurrencia: Quincenal')).toBeTruthy();
    expect(screen.queryByLabelText('Recurrencia: Diaria')).toBeNull();
    expect(screen.queryByLabelText('Recurrencia: Anual')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Recurrencia: Mensual'));
    expect(screen.getAllByTestId('transaction-preview-card')).toHaveLength(3);
    await fireEvent.press(
      screen.getByRole('button', { name: 'Aplicar filtros' }),
    );

    expect(screen.getAllByTestId('transaction-preview-card')).toHaveLength(1);
    expect(screen.getByText('Música')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Filtros, 2 activos' }),
    ).toBeTruthy();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Filtros, 2 activos' }),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Limpiar' }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Aplicar filtros' }),
    );

    expect(screen.getAllByTestId('transaction-preview-card')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Filtros' })).toBeTruthy();
  });

  it('muestra la gráfica como primer bloque de contenido', async () => {
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <ActivityScreen categories={categories} transactions={transactions} />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    expect(screen.queryByText('Actividad')).toBeNull();
    expect(screen.getByRole('button', { name: 'Categorías' })).toBeTruthy();
  });

  it('pliega la gráfica y el detalle de categorías como una sola sección', async () => {
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <ActivityScreen categories={categories} transactions={transactions} />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    const categoriesToggle = screen.getByRole('button', {
      name: 'Categorías',
    });
    const categoriesSection = screen.getByTestId('categories-section');

    expect(screen.getByText('Detalle por categoría')).toBeTruthy();
    expect(
      within(categoriesSection).getByTestId('disclosure-chevron-up', {
        includeHiddenElements: true,
      }),
    ).toBeTruthy();
    await fireEvent.press(categoriesToggle);
    expect(screen.queryByTestId('category-donut-chart')).toBeNull();
    expect(screen.queryByTestId('category-preview-card')).toBeNull();
    expect(screen.queryByText('Detalle por categoría')).toBeNull();
    expect(categoriesToggle.props.accessibilityState).toMatchObject({
      expanded: false,
    });
    expect(
      within(categoriesSection).getByTestId('disclosure-chevron-down', {
        includeHiddenElements: true,
      }),
    ).toBeTruthy();
  });

  it('abre y cierra el modal de filtros sin aplicar el borrador', async () => {
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <ActivityScreen categories={categories} transactions={transactions} />
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    const filterButton = screen.getByRole('button', { name: 'Filtros' });
    const filterButtonStyle = StyleSheet.flatten(filterButton.props.style);
    const filterLabelStyle = StyleSheet.flatten(
      within(filterButton).getByText('Filtrar').props.style,
    );

    expect(screen.queryByTestId('transaction-filters-modal')).toBeNull();
    expect(filterButtonStyle).toMatchObject({
      minHeight: minTouchTarget,
      justifyContent: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingLeft: spacing.lg,
    });
    expect(filterButtonStyle).not.toHaveProperty('backgroundColor');
    expect(filterButtonStyle).not.toHaveProperty('borderWidth');
    expect(filterLabelStyle).toMatchObject({
      color: colors.textSecondary,
      fontFamily: 'Gilroy-Light',
      fontSize: 13,
    });
    expect(screen.getByTestId('activity-filter-icon').props.children).toContain(
      String.fromCodePoint(Number(Ionicons.glyphMap['filter-circle-outline'])),
    );
    await fireEvent.press(within(filterButton).getByText('Filtrar'));
    expect(screen.getByTestId('transaction-filters-modal')).toBeTruthy();
    expect(screen.getByText('Filtrar movimientos')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Moneda' })).toBeNull();

    const typeToggle = screen.getByRole('button', {
      name: 'Tipo de movimiento',
    });
    const categoryToggle = screen.getByRole('button', { name: 'Categoría' });
    const recurrenceToggle = screen.getByRole('button', {
      name: 'Recurrencia',
    });
    const dateToggle = screen.getByRole('button', { name: 'Fecha' });

    expect(
      screen.getByTestId('date-filter-group-icon').props.children,
    ).toContain(
      String.fromCodePoint(Number(Ionicons.glyphMap['calendar-outline'])),
    );
    expect(
      screen.getByTestId('type-filter-group-icon').props.children,
    ).toContain(
      String.fromCodePoint(Number(Ionicons.glyphMap['swap-vertical-outline'])),
    );
    expect(
      screen.getByTestId('category-filter-group-icon').props.children,
    ).toContain(
      String.fromCodePoint(Number(Ionicons.glyphMap['pie-chart-outline'])),
    );
    expect(
      screen.getByTestId('recurrence-filter-group-icon').props.children,
    ).toContain(
      String.fromCodePoint(Number(Ionicons.glyphMap['sync-outline'])),
    );

    expect(StyleSheet.flatten(dateToggle.parent?.props.style)).toMatchObject({
      borderBottomColor: colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
    });

    expect(typeToggle.props.accessibilityState).toMatchObject({
      expanded: false,
    });
    expect(categoryToggle.props.accessibilityState).toMatchObject({
      expanded: false,
    });
    expect(recurrenceToggle.props.accessibilityState).toMatchObject({
      expanded: false,
    });
    expect(dateToggle.props.accessibilityState).toMatchObject({
      expanded: true,
    });
    expect(
      screen.getByLabelText('Periodo: Todos').props.accessibilityState,
    ).toMatchObject({ checked: true });
    expect(
      StyleSheet.flatten(
        screen.getByTestId('activity-date-period-selector-all').props.style,
      ),
    ).toMatchObject({
      backgroundColor: colors.surface,
      borderColor: colors.cta,
      minHeight: 56,
    });
    expect(
      StyleSheet.flatten(
        screen.getByTestId('activity-date-period-selector-options-scroll').props
          .contentContainerStyle,
      ),
    ).toMatchObject({
      height: 116,
      flexDirection: 'column',
      flexWrap: 'wrap',
    });

    await fireEvent.press(typeToggle);
    const allType = screen.getByTestId('type-filter-all');
    const incomeType = screen.getByTestId('type-filter-income');
    expect(dateToggle.props.accessibilityState).toMatchObject({
      expanded: false,
    });
    expect(typeToggle.props.accessibilityState).toMatchObject({
      expanded: true,
    });
    expect(StyleSheet.flatten(allType.props.style)).toMatchObject({
      ...shadows.subtle,
      minHeight: 56,
      backgroundColor: colors.surface,
      borderColor: colors.cta,
      borderWidth: 1,
    });
    expect(
      StyleSheet.flatten(
        within(allType).getByTestId('type-filter-all-indicator').props.style,
      ).color,
    ).toBe(colors.cta);
    expect(StyleSheet.flatten(incomeType.props.style).borderColor).toBe(
      colors.border,
    );
    expect(
      StyleSheet.flatten(
        within(incomeType).getByTestId('type-filter-income-indicator').props
          .style,
      ).color,
    ).toBe(colors.textMuted);
    await fireEvent.press(categoryToggle);
    expect(typeToggle.props.accessibilityState).toMatchObject({
      expanded: false,
    });
    expect(categoryToggle.props.accessibilityState).toMatchObject({
      expanded: true,
    });
    expect(screen.queryByLabelText('Tipo: Ingresos')).toBeNull();
    expect(
      StyleSheet.flatten(screen.getByTestId('category-filter-all').props.style),
    ).toMatchObject({
      borderWidth: 0,
    });
    expect(screen.getByTestId('category-all-selected-gradient')).toBeTruthy();
    expect(screen.getByTestId('category-all-checkmark')).toBeTruthy();
    expect(
      StyleSheet.flatten(
        screen.getByTestId('category-filter-scroll').props.style,
      ),
    ).toMatchObject({
      width: 750,
      marginLeft: -24,
    });
    expect(
      StyleSheet.flatten(
        screen.getByTestId('category-filter-scroll').props
          .contentContainerStyle,
      ),
    ).toMatchObject({
      height: 216,
      flexDirection: 'column',
      flexWrap: 'wrap',
    });

    await fireEvent.press(recurrenceToggle);
    expect(categoryToggle.props.accessibilityState).toMatchObject({
      expanded: false,
    });
    expect(recurrenceToggle.props.accessibilityState).toMatchObject({
      expanded: true,
    });
    expect(
      StyleSheet.flatten(
        screen.getByTestId('recurrence-filter-all').props.style,
      ),
    ).toMatchObject({
      backgroundColor: colors.surface,
      borderColor: colors.cta,
    });
    expect(
      StyleSheet.flatten(
        screen.getByTestId('recurrence-filter-scroll').props.style,
      ),
    ).toMatchObject({ width: 750, marginLeft: -24 });
    expect(
      StyleSheet.flatten(
        screen.getByTestId('recurrence-filter-scroll').props
          .contentContainerStyle,
      ),
    ).toMatchObject({
      height: 120,
      flexDirection: 'column',
      flexWrap: 'wrap',
    });

    await fireEvent.press(dateToggle);
    expect(recurrenceToggle.props.accessibilityState).toMatchObject({
      expanded: false,
    });
    expect(dateToggle.props.accessibilityState).toMatchObject({
      expanded: true,
    });
    expect(screen.getByLabelText('Periodo: Semanal')).toBeTruthy();
    expect(screen.getByLabelText('Periodo: Quincenal')).toBeTruthy();
    expect(screen.getByLabelText('Periodo: Mensual')).toBeTruthy();
    expect(screen.getByLabelText('Periodo: Anual')).toBeTruthy();
    expect(screen.getByLabelText('Periodo: Personalizada')).toBeTruthy();
    const applyFilters = screen.getByRole('button', {
      name: 'Aplicar filtros',
    });
    expect(StyleSheet.flatten(applyFilters.props.style).backgroundColor).toBe(
      colors.cta,
    );
    expect(
      StyleSheet.flatten(
        within(applyFilters).getByText('Aplicar filtros').props.style,
      ).fontSize,
    ).toBe(17);

    await fireEvent.press(typeToggle);
    expect(dateToggle.props.accessibilityState).toMatchObject({
      expanded: false,
    });
    expect(typeToggle.props.accessibilityState).toMatchObject({
      expanded: true,
    });

    await fireEvent.press(screen.getByLabelText('Tipo: Ingresos'));
    const reopenedIncomeType = screen.getByTestId('type-filter-income');
    expect(StyleSheet.flatten(reopenedIncomeType.props.style)).toMatchObject({
      minHeight: 56,
      backgroundColor: colors.surface,
      borderColor: colors.cta,
    });
    expect(
      StyleSheet.flatten(
        within(reopenedIncomeType).getByTestId('type-filter-income-indicator')
          .props.style,
      ).color,
    ).toBe(colors.cta);
    expect(screen.getAllByTestId('transaction-preview-card')).toHaveLength(2);

    await fireEvent.press(screen.getByLabelText('Tipo: Gastos'));
    const expenseType = screen.getByTestId('type-filter-expense');
    expect(StyleSheet.flatten(expenseType.props.style)).toMatchObject({
      minHeight: 56,
      backgroundColor: colors.surface,
      borderColor: colors.cta,
    });
    expect(
      StyleSheet.flatten(
        within(expenseType).getByTestId('type-filter-expense-indicator').props
          .style,
      ).color,
    ).toBe(colors.cta);

    await fireEvent.press(typeToggle);
    expect(typeToggle.props.accessibilityState).toMatchObject({
      expanded: false,
    });
    expect(screen.queryByLabelText('Tipo: Ingresos')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar' }));
    await waitFor(() =>
      expect(screen.queryByTestId('transaction-filters-modal')).toBeNull(),
    );
    expect(screen.getAllByTestId('transaction-preview-card')).toHaveLength(2);

    await fireEvent.press(filterButton);
    await fireEvent.press(
      screen.getByRole('button', { name: 'Tipo de movimiento' }),
    );
    expect(
      screen.getByLabelText('Tipo: Todos').props.accessibilityState,
    ).toMatchObject({ checked: true });
  });

  it('ofrece moneda en filtros solo si el espacio tiene varias y aplica la selección', async () => {
    const usdTransaction: SessionTransaction = {
      ...transactions[0]!,
      id: 'session-usd',
      amountMinor: 3000,
      currency: 'USD',
      title: 'Compra en dólares',
    };
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <ActivityScreen
            categories={categories}
            currency="EUR"
            transactions={[...transactions, usdTransaction]}
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Filtros' }));
    const currencyToggle = screen.getByRole('button', { name: 'Moneda' });
    expect(
      screen.getByTestId('currency-filter-group-icon').props.children,
    ).toContain(
      String.fromCodePoint(Number(Ionicons.glyphMap['cash-outline'])),
    );
    expect(currencyToggle.props.accessibilityState).toMatchObject({
      expanded: false,
    });

    await fireEvent.press(currencyToggle);
    expect(screen.getByLabelText('Moneda: Euro (EUR)')).toBeTruthy();
    await fireEvent.press(
      screen.getByLabelText('Moneda: Dólar estadounidense (USD)'),
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Aplicar filtros' }),
    );

    expect(screen.getAllByTestId('transaction-preview-card')).toHaveLength(1);
    expect(screen.getByText('Compra en dólares')).toBeTruthy();
    expect(screen.queryByText('Compra semanal')).toBeNull();
  });

  it('navega y filtra los movimientos con el periodo compartido', async () => {
    const olderTransaction: SessionTransaction = {
      ...transactions[0]!,
      id: 'session-older',
      title: 'Compra anterior',
      occurredOn: '2026-07-20',
    };
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <ActivityScreen
            categories={categories}
            transactions={[...transactions, olderTransaction]}
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    expect(screen.getAllByTestId('transaction-preview-card')).toHaveLength(3);
    await fireEvent.press(screen.getByRole('button', { name: 'Filtros' }));
    await fireEvent.press(screen.getByLabelText('Periodo: Semanal'));
    expect(screen.getByText('27 jul – 2 ago 2026')).toBeTruthy();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Ver periodo anterior' }),
    );
    expect(screen.getByText('20 jul – 26 jul 2026')).toBeTruthy();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Aplicar filtros' }),
    );

    expect(screen.getAllByTestId('transaction-preview-card')).toHaveLength(1);
    expect(screen.getByText('Compra anterior')).toBeTruthy();
    expect(screen.queryByText('Compra semanal')).toBeNull();
    expect(screen.getByTestId('activity-income-amount').props.children).toBe(
      '0\u00a0€',
    );
    expect(screen.getByTestId('activity-expense-amount').props.children).toBe(
      '12,50\u00a0€',
    );
    expect(screen.getByTestId('activity-balance-amount').props.children).toBe(
      '-12,50\u00a0€',
    );
    expect(
      screen.getByRole('button', { name: 'Filtros, 1 activos' }),
    ).toBeTruthy();
  });

  it('filtra por un rango de fechas personalizado', async () => {
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <ActivityScreen categories={categories} transactions={transactions} />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Filtros' }));
    await fireEvent.press(screen.getByLabelText('Periodo: Personalizada'));

    expect(screen.getByText('Elige un rango')).toBeTruthy();
    await fireEvent.press(
      screen.getByTestId('transaction-date-range-calendar.day_2026-07-29'),
    );
    await fireEvent.press(
      screen.getByTestId('transaction-date-range-calendar.day_2026-07-30'),
    );
    await fireEvent.press(screen.getByLabelText('Guardar rango de fechas'));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Aplicar filtros' }),
    );

    expect(screen.getAllByTestId('transaction-preview-card')).toHaveLength(2);
    expect(
      screen.getByRole('button', { name: 'Filtros, 1 activos' }),
    ).toBeTruthy();
  });

  it('calcula presupuesto en spaceCurrency (VES) mientras muestra gastos en displayCurrency (EUR) y propaga divisa a onOpenCategoryDetail', async () => {
    const onOpenCategoryDetail = jest.fn();
    const multiTransactions: SessionTransaction[] = [
      {
        id: 'tx-eur',
        spaceId: 'personal',
        type: 'expense',
        amountMinor: 1000, // 10 EUR
        currency: 'EUR',
        title: 'Café EUR',
        categoryId: 'general',
        occurredOn: '2026-07-30',
        recurrence: 'once',
        updatedAt: '2026-07-30T12:00:00.000Z',
      },
      {
        id: 'tx-ves',
        spaceId: 'personal',
        type: 'expense',
        amountMinor: 4000, // 40 VES
        currency: 'VES',
        title: 'Mercado VES',
        categoryId: 'general',
        occurredOn: '2026-07-30',
        recurrence: 'once',
        updatedAt: '2026-07-30T12:00:00.000Z',
      },
    ];

    const categoryWithBudget: Category = {
      id: 'general',
      spaceId: 'personal',
      name: 'General',
      icon: 'dots-three-circle',
      colorToken: 'slate',
      budgetMinor: 10000, // 100 VES
      isDefault: false,
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
          <ActivityScreen
            categories={[categoryWithBudget]}
            currency="EUR"
            onOpenCategoryDetail={onOpenCategoryDetail}
            spaceCurrency="VES"
            transactions={multiTransactions}
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    // Tarjeta muestra gastado 10 € y disponible Bs. 60
    expect(
      screen.getByRole('button', {
        name: /General, 10.*gastado,.*60.*disponible/,
      }),
    ).toBeTruthy();

    await fireEvent.press(
      screen.getByRole('button', {
        name: /General, 10.*gastado,.*60.*disponible/,
      }),
    );

    expect(onOpenCategoryDetail).toHaveBeenCalledWith('general', 'EUR');
  });
});
