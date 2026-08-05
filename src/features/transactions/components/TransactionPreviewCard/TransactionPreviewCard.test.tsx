import { render, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import type { Category } from '@/features/categories/types';
import { TransactionPreviewCard } from '@/features/transactions/components/TransactionPreviewCard/TransactionPreviewCard';
import type { SessionTransaction } from '@/features/transactions/types';
import { colors } from '@/theme/colors';

const category: Category = {
  id: 'groceries',
  spaceId: 'personal',
  name: 'Supermercado',
  icon: 'shopping-cart',
  colorToken: 'orange',
  isDefault: true,
  isArchived: false,
};

const transaction: SessionTransaction = {
  id: 'transaction-1',
  spaceId: 'personal',
  type: 'expense',
  amountMinor: 100_000,
  currency: 'EUR',
  title: '',
  categoryId: category.id,
  occurredOn: '2026-06-11',
  recurrence: 'once',
  updatedAt: '2026-06-11T12:00:00.000Z',
};

describe('TransactionPreviewCard', () => {
  it('usa la categoría como título cuando el movimiento no tiene uno', async () => {
    const screen = await render(
      <TransactionPreviewCard category={category} transaction={transaction} />,
    );
    const card = within(screen.getByTestId('transaction-preview-card'));

    expect(card.getByText('Supermercado')).toBeTruthy();
    expect(card.getByText('11/06/2026')).toBeTruthy();
    expect(card.getByText(/^1\.000\s*€$/)).toBeTruthy();
    expect(
      StyleSheet.flatten(
        screen.getByTestId('transaction-preview-card').props.style,
      ).minHeight,
    ).toBeCloseTo(61.6);
    const directionIconStyle = StyleSheet.flatten(
      screen.getByTestId('transaction-direction-icon').props.style,
    );
    expect(directionIconStyle).not.toHaveProperty('backgroundColor');
    expect(directionIconStyle).not.toHaveProperty('borderRadius');
    expect(directionIconStyle).not.toHaveProperty('height');
    expect(directionIconStyle).not.toHaveProperty('width');
    expect(
      StyleSheet.flatten(
        screen.getByTestId('transaction-direction-glyph').props.style,
      ).color,
    ).toBe(colors.expense);
    const trailingChildren = screen.getByTestId('transaction-trailing-content')
      .props.children;
    expect(trailingChildren[0].props.testID).toBe('transaction-amount');
    expect(trailingChildren[1].props.testID).toBe('transaction-direction-icon');
    expect(
      StyleSheet.flatten(
        screen.getByTestId('transaction-direction-arrow').props.style,
      ).transform,
    ).toEqual([{ rotate: '45deg' }]);
  });

  it('prioriza el título escrito por el usuario', async () => {
    const screen = await render(
      <TransactionPreviewCard
        category={category}
        transaction={{ ...transaction, title: 'Compra semanal' }}
      />,
    );

    expect(screen.getByText('Compra semanal')).toBeTruthy();
  });

  it('muestra la flecha verde sin fondo para un ingreso', async () => {
    const screen = await render(
      <TransactionPreviewCard
        category={category}
        transaction={{ ...transaction, type: 'income' }}
      />,
    );

    expect(
      StyleSheet.flatten(
        screen.getByTestId('transaction-direction-glyph').props.style,
      ).color,
    ).toBe(colors.income);
    expect(
      StyleSheet.flatten(
        screen.getByTestId('transaction-direction-icon').props.style,
      ),
    ).not.toHaveProperty('backgroundColor');
  });
});
