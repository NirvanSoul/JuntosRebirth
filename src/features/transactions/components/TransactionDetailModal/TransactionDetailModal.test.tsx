import { fireEvent, render, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Category } from '@/features/categories/types';
import { TransactionDetailModal } from '@/features/transactions/components/TransactionDetailModal/TransactionDetailModal';
import type { SessionTransaction } from '@/features/transactions/types';
import { colors } from '@/theme/colors';
import { layout } from '@/theme/layout';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';

const category: Category = {
  id: 'food',
  spaceId: 'personal',
  name: 'Comida',
  icon: 'fork-knife',
  colorToken: 'orange',
  budgetMinor: 50_000,
  isDefault: false,
  isArchived: false,
};

const transaction: SessionTransaction = {
  id: 'lunch',
  spaceId: 'personal',
  type: 'expense',
  amountMinor: 1890,
  currency: 'EUR',
  title: 'Almuerzo',
  categoryId: 'food',
  occurredOn: '2026-07-30',
  recurrence: 'monthly',
  nextOccurrenceOn: '2026-08-30',
  recurrenceSeriesId: 'monthly-series',
  recurrenceStartsOn: '2026-07-30',
  updatedAt: '2026-07-30T12:00:00.000Z',
};

describe('TransactionDetailModal', () => {
  it('distribuye los datos del movimiento sin mostrar presupuesto', async () => {
    const onDelete = jest.fn();
    const onEdit = jest.fn();
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <TransactionDetailModal
          category={category}
          onClose={jest.fn()}
          onCopy={jest.fn(() => true)}
          onDelete={onDelete}
          onEdit={onEdit}
          onRemoveReminder={jest.fn(() => true)}
          onSaveReminder={jest.fn(() => true)}
          reminder={null}
          shareTargets={[]}
          transaction={transaction}
          transactions={[transaction]}
          visible
        />
      </SafeAreaProvider>,
    );
    const detail = screen.getByTestId('transaction-detail-modal');
    const scrollView = screen.getByTestId('transaction-detail-scroll-view');

    expect(
      within(detail).getByTestId('transaction-detail-context').props.children,
    ).toBe('Movimiento');
    expect(
      within(detail).getByTestId('transaction-detail-title').props.children,
    ).toBe('Almuerzo');
    expect(within(detail).queryByText('Gasto')).toBeNull();
    expect(within(detail).getByText('Importe gastado')).toBeTruthy();
    expect(within(detail).getByText(/18,90/)).toBeTruthy();
    expect(within(detail).getByText('Comida')).toBeTruthy();
    expect(within(detail).getByText('30 de julio de 2026')).toBeTruthy();
    expect(within(detail).getByText('Mensual')).toBeTruthy();
    expect(within(detail).getByText('30 de agosto de 2026')).toBeTruthy();
    expect(
      within(detail).getAllByTestId('phosphor-react-native-fork-knife-fill'),
    ).toHaveLength(2);
    expect(
      within(detail).getByTestId('transaction-detail-recurrence-icon'),
    ).toBeTruthy();
    expect(
      StyleSheet.flatten(
        within(detail).getByTestId('transaction-detail-direction-icon').props
          .style,
      ).backgroundColor,
    ).toBe(colors.expense);
    expect(within(detail).queryByText(/presupuesto/i)).toBeNull();
    expect(
      within(detail).queryByRole('button', { name: 'Copiar en otro espacio' }),
    ).toBeNull();
    expect(
      StyleSheet.flatten(scrollView.props.contentContainerStyle).paddingBottom,
    ).toBe(34 + layout.modalBottomInset.regular + spacing.md);

    await fireEvent.press(
      within(detail).getByRole('button', {
        name: 'Próxima repetición: 30 de agosto de 2026',
      }),
    );
    const recurrenceList = within(detail).getByTestId(
      'transaction-detail-recurrence-list',
    );
    expect(within(recurrenceList).getAllByText(/de 2026/)).toHaveLength(5);
    expect(
      within(recurrenceList).getByText('30 de diciembre de 2026'),
    ).toBeTruthy();
    expect(within(recurrenceList).getByText('Ver más')).toBeTruthy();

    await fireEvent.press(within(recurrenceList).getByText('Ver más'));
    expect(
      within(recurrenceList).getByText('30 de enero de 2027'),
    ).toBeTruthy();

    expect(
      within(
        within(detail).getByTestId('transaction-detail-edit-delete-actions'),
      )
        .getAllByRole('button')
        .map((button) => button.props.accessibilityLabel),
    ).toEqual(['Eliminar movimiento', 'Editar movimiento']);
    expect(
      within(detail).getByTestId('transaction-menu-edit-item-icon'),
    ).toBeTruthy();
    expect(
      within(detail).getByTestId('transaction-menu-delete-item-icon'),
    ).toBeTruthy();
    await fireEvent.press(
      within(detail).getByRole('button', { name: 'Editar movimiento' }),
    );
    expect(onEdit).toHaveBeenCalledWith('lunch');

    await fireEvent.press(
      within(detail).getByRole('button', { name: 'Eliminar movimiento' }),
    );
    const deletePanel = within(detail).getByTestId('transaction-delete-panel');
    const amount = within(detail).getByTestId('transaction-detail-amount');
    expect(deletePanel.parent).toBe(amount.parent);
    expect(deletePanel.parent?.children.indexOf(deletePanel)).toBeLessThan(
      deletePanel.parent?.children.indexOf(amount) ?? 0,
    );
    await fireEvent.press(
      within(detail).getByRole('button', { name: 'Eliminar' }),
    );
    expect(onDelete).toHaveBeenCalledWith('lunch');
  });

  it('identifica un ingreso junto al importe', async () => {
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <TransactionDetailModal
          category={category}
          onClose={jest.fn()}
          onCopy={jest.fn(() => true)}
          onDelete={jest.fn()}
          onEdit={jest.fn()}
          onRemoveReminder={jest.fn(() => true)}
          onSaveReminder={jest.fn(() => true)}
          reminder={null}
          shareTargets={[]}
          transaction={{ ...transaction, type: 'income' }}
          transactions={[{ ...transaction, type: 'income' }]}
          visible
        />
      </SafeAreaProvider>,
    );
    const detail = screen.getByTestId('transaction-detail-modal');

    expect(within(detail).getByText('Importe ingresado')).toBeTruthy();
    expect(within(detail).queryByText('Ingreso')).toBeNull();
    expect(
      StyleSheet.flatten(
        within(detail).getByTestId('transaction-detail-direction-icon').props
          .style,
      ).backgroundColor,
    ).toBe(colors.income);
  });

  it('usa la categoría como título cuando el movimiento no tiene uno', async () => {
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <TransactionDetailModal
          category={category}
          onClose={jest.fn()}
          onCopy={jest.fn(() => true)}
          onDelete={jest.fn()}
          onEdit={jest.fn()}
          onRemoveReminder={jest.fn(() => true)}
          onSaveReminder={jest.fn(() => true)}
          reminder={null}
          shareTargets={[]}
          transaction={{ ...transaction, title: '   ' }}
          transactions={[{ ...transaction, title: '   ' }]}
          visible
        />
      </SafeAreaProvider>,
    );

    expect(
      screen.getByTestId('transaction-detail-context').props.children,
    ).toBe('Movimiento');
    expect(screen.getByTestId('transaction-detail-title').props.children).toBe(
      'Comida',
    );
  });

  it('copia el movimiento desde el selector de espacios', async () => {
    const onCopy = jest.fn(() => true);
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <TransactionDetailModal
          category={category}
          onClose={jest.fn()}
          onCopy={onCopy}
          onDelete={jest.fn()}
          onEdit={jest.fn()}
          onRemoveReminder={jest.fn(() => true)}
          onSaveReminder={jest.fn(() => true)}
          reminder={null}
          shareTargets={[{ id: 'couple', name: 'Pareja' }]}
          transaction={transaction}
          transactions={[transaction]}
          visible
        />
      </SafeAreaProvider>,
    );

    const copyButton = within(
      screen.getByTestId('transaction-detail-modal'),
    ).getByRole('button', { name: 'Copiar en otro espacio' });
    expect(StyleSheet.flatten(copyButton.props.style)).toMatchObject({
      ...shadows.subtle,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
    });
    await fireEvent.press(copyButton);
    const picker = screen.getByTestId('transaction-space-picker-modal');
    await fireEvent.press(
      within(picker).getByRole('button', { name: 'Copiar a Pareja' }),
    );

    expect(onCopy).toHaveBeenCalledWith('lunch', 'couple');
  });

  it('pagina únicamente las fechas futuras de una recurrencia personalizada', async () => {
    const customTransactions = [
      '2026-07-01',
      '2099-01-05',
      '2099-02-05',
      '2099-03-05',
      '2099-04-05',
      '2099-05-05',
      '2099-06-05',
    ].map((occurredOn, index) => ({
      ...transaction,
      id: `custom-${index}`,
      occurredOn,
      recurrence: 'custom' as const,
      nextOccurrenceOn: undefined,
      recurrenceGroupId: 'custom-group',
      recurrenceSeriesId: undefined,
      recurrenceStartsOn: undefined,
    }));
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <TransactionDetailModal
          category={category}
          onClose={jest.fn()}
          onCopy={jest.fn(() => true)}
          onDelete={jest.fn()}
          onEdit={jest.fn()}
          onRemoveReminder={jest.fn(() => true)}
          onSaveReminder={jest.fn(() => true)}
          reminder={null}
          shareTargets={[]}
          transaction={customTransactions[0]!}
          transactions={customTransactions}
          visible
        />
      </SafeAreaProvider>,
    );
    const detail = screen.getByTestId('transaction-detail-modal');

    await fireEvent.press(
      within(detail).getByRole('button', {
        name: 'Próxima repetición: 5 de enero de 2099',
      }),
    );
    const recurrenceList = within(detail).getByTestId(
      'transaction-detail-recurrence-list',
    );
    expect(within(recurrenceList).getAllByText(/de 2099/)).toHaveLength(5);
    await fireEvent.press(within(recurrenceList).getByText('Ver más'));
    expect(within(recurrenceList).getAllByText(/de 2099/)).toHaveLength(6);
    expect(within(recurrenceList).queryByText('Ver más')).toBeNull();
  });
});
