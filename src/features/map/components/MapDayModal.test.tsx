import { act, fireEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { Category } from '@/features/categories/types';
import { MapDayModal } from '@/features/map/components/MapDayModal';
import type { SessionTransaction } from '@/features/transactions/types';
import { renderWithTheme } from '@/test/renderWithTheme';

let mockFinishDismissal: (() => void) | undefined;

jest.mock('@/components/overlays/AppModal/AppModal', () => {
  const { View } = jest.requireActual('react-native');
  return {
    AppModal: ({
      children,
      onDismissed,
      visible,
    }: {
      children: ReactNode;
      onDismissed?: () => void;
      visible: boolean;
    }) => {
      mockFinishDismissal = onDismissed;
      return visible ? <View>{children}</View> : null;
    },
    useAppModalBottomInset: () => 34,
  };
});

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
  amountMinor: 1_250,
  currency: 'EUR',
  title: 'Almuerzo',
  categoryId: category.id,
  occurredOn: '2026-08-12',
  recurrence: 'once',
  updatedAt: '2026-08-12T12:00:00.000Z',
};

describe('MapDayModal', () => {
  beforeEach(() => {
    mockFinishDismissal = undefined;
  });

  it('espera al cierre real antes de abrir el detalle de un movimiento', async () => {
    const onClose = jest.fn();
    const onOpenTransactionDetail = jest.fn();
    const screen = await renderWithTheme(
      <MapDayModal
        categories={[category]}
        date="2026-08-12"
        onAddTransaction={jest.fn()}
        onClose={onClose}
        onOpenTransactionDetail={onOpenTransactionDetail}
        transactions={[transaction]}
        visible
      />,
    );

    await fireEvent.press(screen.getByTestId('transaction-preview-card'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onOpenTransactionDetail).not.toHaveBeenCalled();

    await act(async () => mockFinishDismissal?.());

    expect(onOpenTransactionDetail).toHaveBeenCalledWith('lunch');
  });

  it('espera al cierre real antes de abrir la creación del movimiento', async () => {
    const onAddTransaction = jest.fn();
    const onClose = jest.fn();
    const screen = await renderWithTheme(
      <MapDayModal
        categories={[category]}
        date="2026-08-12"
        onAddTransaction={onAddTransaction}
        onClose={onClose}
        transactions={[]}
        visible
      />,
    );

    await fireEvent.press(screen.getByTestId('map-add-transaction-button'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onAddTransaction).not.toHaveBeenCalled();

    await act(async () => mockFinishDismissal?.());

    expect(onAddTransaction).toHaveBeenCalledWith('2026-08-12');
  });
});
