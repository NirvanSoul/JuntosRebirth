import { fireEvent, render, within } from '@testing-library/react-native';
import { Dimensions, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CategoryDetailModal } from '@/features/categories/components/CategoryDetailModal/CategoryDetailModal';
import type { Category } from '@/features/categories/types';
import { SpaceMembershipProvider } from '@/features/profile/state/SpaceMembershipContext';
import type { Space } from '@/features/spaces/types';
import type { SessionTransaction } from '@/features/transactions/types';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { categoryColors } from '@/theme/categoryColors';
import { colors } from '@/theme/colors';
import { iconSize, layout } from '@/theme/layout';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';

jest.mock('@/features/legal/services/authenticatedUser', () => ({
  getAuthenticatedUserId: jest.fn(async () => 'uuid-ana'),
}));

jest.mock(
  '@/features/profile/repositories/localSpaceMemberProfileRepository',
  () => ({
    listSpaceMemberProfiles: jest.fn(async () => [
      { userId: 'uuid-ana', displayName: 'Ana' },
      { userId: 'uuid-beto', displayName: 'Beto' },
    ]),
  }),
);

jest.mock('@/features/profile/services/syncOwnAvatar', () => ({
  syncOwnAvatar: jest.fn(async () => false),
}));

jest.mock('@/features/profile/services/syncSpaceMemberProfiles', () => ({
  syncSpaceMemberProfiles: jest.fn(async () => true),
}));

jest.mock('@/lib/storage/localDatabase', () => ({
  getLocalDatabase: jest.fn(async () => ({})),
}));

jest.mock('@/lib/storage/localIdentity', () => ({
  getOrCreateInstallationId: jest.fn(async () => 'install-ana'),
}));

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
  amountMinor: 1890,
  currency: 'EUR',
  title: 'Almuerzo',
  categoryId: 'food',
  occurredOn: '2026-07-30',
  recurrence: 'once',
  updatedAt: '2026-07-30T12:00:00.000Z',
};

const coupleSpace: Space = {
  id: 'couple',
  name: 'Juntos',
  type: 'couple',
  currency: 'EUR',
};

describe('CategoryDetailModal', () => {
  it('filtra los movimientos de un espacio juntos por autor', async () => {
    const ownTransaction = {
      ...transaction,
      createdBy: 'uuid-ana',
      title: 'Almuerzo propio',
    };
    const partnerTransaction = {
      ...transaction,
      id: 'dinner',
      createdBy: 'uuid-beto',
      type: 'income' as const,
      title: 'Cena de Beto',
    };
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <SpaceMembershipProvider space={coupleSpace}>
            <CategoryDetailModal
              category={category}
              displayCurrency="EUR"
              onAddTransaction={jest.fn()}
              onClose={jest.fn()}
              onDelete={jest.fn()}
              onEdit={jest.fn()}
              onOpenTransactionDetail={jest.fn()}
              onSaveBudget={jest.fn()}
              onSaveNote={jest.fn()}
              onShare={jest.fn(() => true)}
              shareTargets={[]}
              spaceCurrency="EUR"
              transactions={[ownTransaction, partnerTransaction]}
              visible
            />
          </SpaceMembershipProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    const detail = screen.getByTestId('category-detail-modal');
    await screen.findByLabelText('Autor: Ambos');
    expect(within(detail).getByTestId('category-expense-metric')).toBeTruthy();
    expect(within(detail).getByTestId('category-income-metric')).toBeTruthy();
    await fireEvent.press(
      within(detail).getByTestId('category-detail-author-filter'),
    );
    const picker = screen.getByTestId('category-author-filter-modal');
    await fireEvent.press(within(picker).getByRole('radio', { name: 'Beto' }));

    expect(within(detail).queryByText('Almuerzo propio')).toBeNull();
    expect(within(detail).getByText('Cena de Beto')).toBeTruthy();
    expect(within(detail).getByLabelText('Autor: Beto')).toBeTruthy();
  });

  it('expone presupuesto, compartir, edición y eliminación desde el detalle', async () => {
    const onSaveBudget = jest.fn();
    const onSaveNote = jest.fn();
    const onOpenTransactionDetail = jest.fn();
    const onShare = jest.fn(() => true);
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <CategoryDetailModal
            category={category}
            displayCurrency="EUR"
            onAddTransaction={jest.fn()}
            onClose={jest.fn()}
            onDelete={onDelete}
            onEdit={onEdit}
            onOpenTransactionDetail={onOpenTransactionDetail}
            onSaveBudget={onSaveBudget}
            onSaveNote={onSaveNote}
            onShare={onShare}
            shareTargets={[{ id: 'couple', name: 'Pareja' }]}
            spaceCurrency="EUR"
            transactions={[transaction]}
            visible
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    const detail = screen.getByTestId('category-detail-modal');
    const modalContent = screen.getByTestId('category-detail-modal-content');
    const scrollView = screen.getByTestId('category-detail-scroll-view');

    expect(StyleSheet.flatten(detail.props.style).height).toBeCloseTo(
      (Dimensions.get('window').height - 47) * 0.94,
    );
    expect(StyleSheet.flatten(modalContent.props.style).paddingBottom).toBe(0);
    expect(
      StyleSheet.flatten(scrollView.props.contentContainerStyle).paddingBottom,
    ).toBe(34 + layout.modalBottomInset.regular + spacing.md);
    expect(
      StyleSheet.flatten(scrollView.props.contentContainerStyle).paddingTop,
    ).toBe(spacing.xl + layout.minTouchTarget);
    expect(StyleSheet.flatten(scrollView.props.style).flex).toBe(1);
    expect(scrollView.props.nestedScrollEnabled).toBeUndefined();

    expect(
      within(detail).getByTestId('category-detail-context').props.children,
    ).toBe('Categoría');
    expect(
      within(detail).getByTestId('category-detail-title').props.children,
    ).toBe('Comida');
    await fireEvent.press(
      within(detail).getByLabelText('Editar nombre de categoría'),
    );
    await fireEvent.press(
      within(detail).getByLabelText('Editar apariencia de categoría'),
    );
    expect(onEdit).toHaveBeenCalledWith('food', 'name');
    expect(onEdit).toHaveBeenCalledWith('food', 'appearance');
    expect(within(detail).queryByText('1 movimiento')).toBeNull();
    expect(within(detail).getByText('Almuerzo')).toBeTruthy();
    await fireEvent.press(
      within(detail).getByTestId('transaction-preview-card'),
    );
    expect(onOpenTransactionDetail).toHaveBeenCalledWith('lunch');
    expect(within(detail).getByTestId('category-expense-metric')).toBeTruthy();
    expect(within(detail).queryByTestId('category-income-metric')).toBeNull();
    expect(
      within(detail).queryByTestId('category-currency-selector'),
    ).toBeNull();
    expect(within(detail).queryByTestId('category-budget-summary')).toBeNull();
    const topBar = screen.getByTestId('category-detail-top-bar');
    expect(StyleSheet.flatten(topBar.props.style).paddingTop).toBe(spacing.xl);
    expect(StyleSheet.flatten(topBar.props.style).position).toBe('absolute');
    expect(
      within(topBar).getAllByRole('button')[0]?.props.accessibilityLabel,
    ).toBe('Eliminar categoría');
    expect(
      within(topBar).getAllByRole('button')[1]?.props.accessibilityLabel,
    ).toBe('Editar categoría');
    expect(
      within(topBar).getAllByRole('button')[2]?.props.accessibilityLabel,
    ).toBe('Cerrar');
    expect(
      StyleSheet.flatten(
        within(detail).getByTestId('category-action-icon-copy-outline').props
          .style,
      ).color,
    ).toBe(colors.textMuted);
    expect(within(detail).getByTestId('category-action-icon-add')).toBeTruthy();
    const actionButtons = within(
      screen.getByTestId('category-detail-actions'),
    ).getAllByRole('button');
    expect(
      actionButtons.map((button) => button.props.accessibilityLabel),
    ).toEqual([
      'Añadir movimiento',
      'Añadir presupuesto',
      'Copiar en otro espacio',
    ]);
    expect(StyleSheet.flatten(actionButtons[0]?.props.style)).toMatchObject({
      ...shadows.subtle,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
    });

    await fireEvent.press(
      within(detail).getByRole('button', { name: 'Añadir presupuesto' }),
    );
    const budgetModal = screen.getByTestId('category-budget-modal');
    expect(
      within(budgetModal).getByTestId('category-budget-keypad'),
    ).toBeTruthy();
    expect(within(budgetModal).getByRole('button', { name: ',' })).toBeTruthy();
    expect(
      within(budgetModal).getByRole('button', { name: 'Borrar' }),
    ).toBeTruthy();
    await fireEvent.press(
      within(budgetModal).getByRole('button', { name: '3' }),
    );
    await fireEvent.press(
      within(budgetModal).getByRole('button', { name: '0' }),
    );
    expect(
      StyleSheet.flatten(
        within(budgetModal).getByTestId('category-budget-save-gradient').props
          .style,
      ).backgroundColor,
    ).toBe(categoryColors.orange);
    await fireEvent.press(
      within(budgetModal).getByRole('button', { name: '0' }),
    );
    await fireEvent.press(
      within(budgetModal).getByRole('button', { name: 'Guardar presupuesto' }),
    );
    expect(onSaveBudget).toHaveBeenCalledWith('food', 30_000);

    await fireEvent.press(
      within(detail).getByRole('button', { name: 'Copiar en otro espacio' }),
    );
    const spacePicker = screen.getByTestId('category-space-picker-modal');
    await fireEvent.press(
      within(spacePicker).getByRole('button', { name: 'Copiar a Pareja' }),
    );
    expect(onShare).toHaveBeenCalledWith('food', 'couple');

    const detailActions = within(detail).getByTestId(
      'category-detail-edit-delete-actions',
    );
    expect(
      within(detailActions)
        .getAllByRole('button')
        .map((button) => button.props.accessibilityLabel),
    ).toEqual(['Eliminar categoría', 'Editar categoría']);
    expect(StyleSheet.flatten(detailActions.props.style).gap).toBe(spacing.md);
    expect(within(detail).getByTestId('category-menu-edit-item')).toBeTruthy();
    expect(
      within(detail).getByTestId('category-menu-delete-item'),
    ).toBeTruthy();
    expect(
      within(detail).getByTestId('category-menu-edit-item-icon'),
    ).toBeTruthy();
    expect(
      within(detail).getByTestId('category-menu-delete-item-icon'),
    ).toBeTruthy();
    expect(
      within(detail).getByTestId('category-menu-delete-item-icon').props.width,
    ).toBe(iconSize.md);
    expect(
      within(detail).getByTestId('category-menu-edit-item-icon').props.width,
    ).toBe(iconSize.sm);
    await fireEvent.press(
      within(detail).getByRole('button', { name: 'Editar categoría' }),
    );
    expect(onEdit).toHaveBeenCalledWith('food');

    await fireEvent.press(
      within(detail).getByRole('button', { name: 'Eliminar categoría' }),
    );
    const deletePanel = within(detail).getByTestId('category-delete-panel');
    const metrics = within(detail).getByTestId(
      'category-expense-metric',
    ).parent;
    expect(deletePanel.parent).toBe(metrics?.parent);
    expect(deletePanel.parent?.children.indexOf(deletePanel)).toBeLessThan(
      deletePanel.parent?.children.indexOf(metrics!) ?? 0,
    );
    await fireEvent.press(
      within(detail).getByRole('button', { name: 'Eliminar' }),
    );
    expect(onDelete).toHaveBeenCalledWith('food');
  });

  it('muestra el presupuesto existente como progreso y saldo disponible', async () => {
    const onSaveBudget = jest.fn();
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <CategoryDetailModal
            category={{ ...category, budgetMinor: 5000 }}
            displayCurrency="EUR"
            onAddTransaction={jest.fn()}
            onClose={jest.fn()}
            onDelete={jest.fn()}
            onEdit={jest.fn()}
            onOpenTransactionDetail={jest.fn()}
            onSaveBudget={onSaveBudget}
            onSaveNote={jest.fn()}
            onShare={jest.fn(() => true)}
            shareTargets={[]}
            spaceCurrency="EUR"
            transactions={[transaction]}
            visible
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId('category-budget-summary')).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Copiar en otro espacio' }),
    ).toBeNull();
    expect(screen.getByText(/31,10/)).toBeTruthy();
    expect(screen.getByText(/^50\s*€$/)).toBeTruthy();
    expect(screen.getByRole('progressbar').props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 38,
      text: expect.stringContaining('31,10'),
    });
    expect(screen.getByTestId('category-budget-progress').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: '37.8%' })]),
    );

    await fireEvent.press(
      screen.getByRole('button', { name: 'Abrir presupuesto' }),
    );
    const budgetModal = screen.getByTestId('category-budget-modal');
    const removeButton = within(budgetModal).getByRole('button', {
      name: 'Quitar Presupuesto',
    });
    const removeButtonStyle = StyleSheet.flatten(removeButton.props.style);
    const removeLabelStyle = StyleSheet.flatten(
      within(removeButton).getByTestId('category-budget-remove-label').props
        .style,
    );

    expect(removeButtonStyle).toMatchObject({ flexBasis: '40%' });
    expect(removeButtonStyle.minHeight).toBeGreaterThanOrEqual(
      layout.actionHeight.compact,
    );
    expect(removeLabelStyle.color).toBe(colors.textPrimary);
    expect(within(removeButton).getByText('Quitar Presupuesto')).toBeTruthy();

    await fireEvent.press(removeButton);
    expect(onSaveBudget).toHaveBeenCalledWith('food', undefined);
  });

  it('multidivisa: separa totales en displayCurrency (USD) y presupuesto en spaceCurrency (VES)', async () => {
    const mixedTransactions: SessionTransaction[] = [
      {
        id: 'tx-eur',
        createdBy: 'install-test',
        spaceId: 'personal',
        type: 'expense',
        amountMinor: 1000,
        currency: 'EUR',
        title: 'Almuerzo EUR',
        categoryId: 'food',
        occurredOn: '2026-07-30',
        recurrence: 'once',
        updatedAt: '2026-07-30T12:00:00.000Z',
      },
      {
        id: 'tx-usd',
        createdBy: 'install-test',
        spaceId: 'personal',
        type: 'expense',
        amountMinor: 2000,
        currency: 'USD',
        title: 'Almuerzo USD',
        categoryId: 'food',
        occurredOn: '2026-07-30',
        recurrence: 'once',
        updatedAt: '2026-07-30T12:00:00.000Z',
      },
      {
        id: 'tx-ves',
        createdBy: 'install-test',
        spaceId: 'personal',
        type: 'expense',
        amountMinor: 4000,
        currency: 'VES',
        title: 'Almuerzo VES',
        categoryId: 'food',
        occurredOn: '2026-07-30',
        recurrence: 'once',
        updatedAt: '2026-07-30T12:00:00.000Z',
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
          <CategoryDetailModal
            category={{ ...category, budgetMinor: 10000 }} // 100 VES
            displayCurrency="USD"
            onAddTransaction={jest.fn()}
            onClose={jest.fn()}
            onDelete={jest.fn()}
            onEdit={jest.fn()}
            onOpenTransactionDetail={jest.fn()}
            onSaveBudget={jest.fn()}
            onSaveNote={jest.fn()}
            onShare={jest.fn(() => true)}
            shareTargets={[]}
            spaceCurrency="VES"
            transactions={mixedTransactions}
            visible
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    const detail = screen.getByTestId('category-detail-modal');

    // Movimientos listados solo incluyen el de USD
    expect(within(detail).getByText('Almuerzo USD')).toBeTruthy();
    expect(within(detail).queryByText('Almuerzo EUR')).toBeNull();
    expect(within(detail).queryByText('Almuerzo VES')).toBeNull();

    // Métrica de gasto visible en USD ($ 20)
    const expenseMetric = within(detail).getByTestId('category-expense-metric');
    expect(within(expenseMetric).getByText(/20/)).toBeTruthy();
    expect(within(expenseMetric).getByText(/\$/)).toBeTruthy();

    expect(
      within(detail).getByTestId('category-currency-selector'),
    ).toBeTruthy();
    await fireEvent.press(
      within(detail).getByTestId('category-currency-selector-VES'),
    );
    expect(within(detail).queryByText('Almuerzo USD')).toBeNull();
    expect(within(detail).getByText('Almuerzo VES')).toBeTruthy();
    expect(
      within(within(detail).getByTestId('category-expense-metric')).getByText(
        /40/,
      ),
    ).toBeTruthy();

    // Presupuesto en VES (100 VES total, 40 VES gastado -> 60 VES disponible)
    const budgetSummary = within(detail).getByTestId('category-budget-summary');
    expect(within(budgetSummary).getByText(/60/)).toBeTruthy();
    expect(
      within(budgetSummary).getAllByText(/Bs\./).length,
    ).toBeGreaterThanOrEqual(1);
    expect(within(budgetSummary).getByText(/100/)).toBeTruthy();
  });

  it('abre el editor de nota desde el botón del detalle y guarda al confirmar', async () => {
    const onSaveNote = jest.fn();
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <CategoryDetailModal
            category={{ ...category, note: 'Nota previa' }}
            displayCurrency="EUR"
            onAddTransaction={jest.fn()}
            onClose={jest.fn()}
            onDelete={jest.fn()}
            onEdit={jest.fn()}
            onOpenTransactionDetail={jest.fn()}
            onSaveBudget={jest.fn()}
            onSaveNote={onSaveNote}
            onShare={jest.fn(() => true)}
            shareTargets={[]}
            spaceCurrency="EUR"
            transactions={[transaction]}
            visible
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    const noteButton = screen.getByTestId('category-detail-note');
    expect(within(noteButton).getByText('Nota')).toBeTruthy();
    expect(within(noteButton).getByText('Nota previa')).toBeTruthy();

    await fireEvent.press(noteButton);
    const noteModal = screen.getByTestId('category-note-modal');
    const noteInput = within(noteModal).getByTestId(
      'category-note-modal-input',
    );
    expect(noteInput.props.value).toBe('Nota previa');

    await fireEvent.changeText(noteInput, 'Lista: pan, leche');
    await fireEvent.press(
      within(noteModal).getByRole('button', { name: 'Guardar nota' }),
    );
    expect(onSaveNote).toHaveBeenCalledWith('food', 'Lista: pan, leche');
  });

  it('muestra el marcador de posición cuando la categoría no tiene nota', async () => {
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <CategoryDetailModal
            category={category}
            displayCurrency="EUR"
            onAddTransaction={jest.fn()}
            onClose={jest.fn()}
            onDelete={jest.fn()}
            onEdit={jest.fn()}
            onOpenTransactionDetail={jest.fn()}
            onSaveBudget={jest.fn()}
            onSaveNote={jest.fn()}
            onShare={jest.fn(() => true)}
            shareTargets={[]}
            spaceCurrency="EUR"
            transactions={[transaction]}
            visible
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    const noteButton = screen.getByTestId('category-detail-note');
    expect(within(noteButton).getByText('Escribir Nota')).toBeTruthy();
    expect(within(noteButton).queryByText('Nota')).toBeNull();
  });

  it('omite gastos cuando la categoría solo tiene ingresos', async () => {
    const incomeTransaction: SessionTransaction = {
      ...transaction,
      id: 'refund',
      type: 'income',
      amountMinor: 2400,
      title: 'Reembolso',
    };
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <CategoryDetailModal
            category={category}
            displayCurrency="EUR"
            onAddTransaction={jest.fn()}
            onClose={jest.fn()}
            onDelete={jest.fn()}
            onEdit={jest.fn()}
            onOpenTransactionDetail={jest.fn()}
            onSaveBudget={jest.fn()}
            onSaveNote={jest.fn()}
            onShare={jest.fn(() => true)}
            shareTargets={[]}
            spaceCurrency="EUR"
            transactions={[incomeTransaction]}
            visible
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId('category-income-metric')).toBeTruthy();
    expect(screen.queryByTestId('category-expense-metric')).toBeNull();
  });

  it('separa los movimientos futuros del resto en su propia sección', async () => {
    const futureTransaction: SessionTransaction = {
      ...transaction,
      id: 'future-groceries',
      title: 'Compra programada',
      occurredOn: '2999-01-15',
      updatedAt: '2999-01-15T12:00:00.000Z',
    };
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <CategoryDetailModal
            category={category}
            displayCurrency="EUR"
            onAddTransaction={jest.fn()}
            onClose={jest.fn()}
            onDelete={jest.fn()}
            onEdit={jest.fn()}
            onOpenTransactionDetail={jest.fn()}
            onSaveBudget={jest.fn()}
            onSaveNote={jest.fn()}
            onShare={jest.fn(() => true)}
            shareTargets={[]}
            spaceCurrency="EUR"
            transactions={[transaction, futureTransaction]}
            visible
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    const detail = screen.getByTestId('category-detail-modal');
    const pastList = within(detail).getByTestId(
      'category-detail-transaction-list',
    );
    const upcomingList = within(detail).getByTestId(
      'category-detail-upcoming-transaction-list',
    );

    expect(within(pastList).getByText('Almuerzo')).toBeTruthy();
    expect(within(pastList).queryByText('Compra programada')).toBeNull();
    expect(within(upcomingList).getByText('Compra programada')).toBeTruthy();
    expect(within(upcomingList).queryByText('Almuerzo')).toBeNull();
    expect(within(detail).getByText('Movimientos futuros')).toBeTruthy();
  });
});
