import { fireEvent } from '@testing-library/react-native';

import type { Category } from '@/features/categories/types';
import { TransactionPreviewList } from '@/features/transactions/components/TransactionPreviewList/TransactionPreviewList';
import type { SessionTransaction } from '@/features/transactions/types';
import { renderWithTheme } from '@/test/renderWithTheme';

const category: Category = {
  id: 'groceries',
  spaceId: 'personal',
  name: 'Supermercado',
  icon: 'shopping-cart',
  colorToken: 'orange',
  isDefault: true,
  isArchived: false,
};

function transaction(
  id: string,
  occurredOn: string,
  recurrence: SessionTransaction['recurrence'],
  recurrenceGroupId?: string,
  recurrenceSeriesId?: string,
  nextOccurrenceOn?: string,
): SessionTransaction {
  return {
    id,
    spaceId: 'personal',
    type: 'expense',
    amountMinor: 1000,
    currency: 'EUR',
    title: 'Compra',
    categoryId: category.id,
    occurredOn,
    recurrence,
    recurrenceGroupId,
    recurrenceSeriesId,
    nextOccurrenceOn,
    updatedAt: `${occurredOn}T12:00:00.000Z`,
  };
}

describe('TransactionPreviewList', () => {
  it('agrupa únicamente las ocurrencias de una recurrencia personalizada', async () => {
    const screen = await renderWithTheme(
      <TransactionPreviewList
        categories={[category]}
        transactions={[
          transaction('custom-3', '2026-08-30', 'custom', 'custom-group'),
          transaction('custom-2', '2026-08-20', 'custom', 'custom-group'),
          transaction('custom-1', '2026-08-10', 'custom', 'custom-group'),
          transaction('weekly-2', '2026-08-15', 'weekly'),
          transaction('weekly-1', '2026-08-08', 'weekly'),
        ]}
      />,
    );

    expect(screen.getAllByTestId('transaction-preview-card')).toHaveLength(3);
    expect(screen.getByTestId('transaction-preview-group')).toBeTruthy();
    expect(screen.queryByTestId('transaction-preview-tree')).toBeNull();

    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Desplegar movimientos repetitivos',
      }),
    );

    expect(screen.getByTestId('transaction-preview-tree')).toBeTruthy();
    expect(screen.getAllByTestId('transaction-preview-card')).toHaveLength(5);
    const animatedItems = screen.getAllByTestId(
      'transaction-preview-tree-item',
    );
    expect(animatedItems).toHaveLength(2);
    expect(animatedItems[0]!.props.entering).toBeDefined();
    expect(animatedItems[0]!.props.exiting).toBeDefined();
    expect(animatedItems[0]!.props.layout).toBeDefined();
    expect(
      screen.getByRole('button', {
        name: 'Contraer movimientos repetitivos',
      }),
    ).toBeTruthy();
  });

  it('aplica el límite después de agrupar las ocurrencias', async () => {
    const screen = await renderWithTheme(
      <TransactionPreviewList
        categories={[category]}
        limit={2}
        transactions={[
          transaction('custom-2', '2026-08-20', 'custom', 'custom-group'),
          transaction('custom-1', '2026-08-10', 'custom', 'custom-group'),
          transaction('single-1', '2026-08-09', 'once'),
          transaction('single-2', '2026-08-08', 'once'),
        ]}
      />,
    );

    expect(screen.getAllByTestId('transaction-preview-card')).toHaveLength(2);
  });

  it('conserva la carpeta cuando el periodo solo muestra una ocurrencia', async () => {
    const visibleTransaction = transaction(
      'custom-visible',
      '2026-08-20',
      'custom',
      'custom-group',
    );
    const screen = await renderWithTheme(
      <TransactionPreviewList
        categories={[category]}
        groupingTransactions={[
          visibleTransaction,
          transaction('custom-future', '2026-09-20', 'custom', 'custom-group'),
        ]}
        transactions={[visibleTransaction]}
      />,
    );

    expect(screen.getByTestId('transaction-preview-group')).toBeTruthy();
    expect(screen.getAllByTestId('transaction-preview-card')).toHaveLength(1);
    expect(screen.getByTestId('transaction-stack-layer-back')).toBeTruthy();
    expect(screen.getByTestId('transaction-stack-layer-middle')).toBeTruthy();
    expect(screen.queryByTestId('transaction-group-toggle')).toBeNull();
    expect(screen.queryByText('20/09/2026')).toBeNull();
  });

  it('muestra una preview independiente por ocurrencia automática con su fecha real', async () => {
    const screen = await renderWithTheme(
      <TransactionPreviewList
        categories={[category]}
        transactions={[
          transaction(
            'monthly-2',
            '2026-08-01',
            'monthly',
            undefined,
            'monthly-series',
            '2026-09-01',
          ),
          transaction(
            'monthly-1',
            '2026-07-01',
            'monthly',
            undefined,
            'monthly-series',
            '2026-09-01',
          ),
        ]}
      />,
    );

    expect(screen.getAllByTestId('transaction-preview-card')).toHaveLength(2);
    expect(screen.getByText('01/08/2026')).toBeTruthy();
    expect(screen.getByText('01/07/2026')).toBeTruthy();
    expect(screen.queryByText('01/09/2026')).toBeNull();
    expect(screen.queryByTestId('transaction-group-toggle')).toBeNull();
  });

  it('respeta la fecha proyectada del mes visible en lugar de la próxima fecha de la serie', async () => {
    const screen = await renderWithTheme(
      <TransactionPreviewList
        categories={[category]}
        transactions={[
          transaction(
            'monthly-source',
            '2026-10-01',
            'monthly',
            undefined,
            'monthly-series',
            '2026-09-01',
          ),
        ]}
      />,
    );

    expect(screen.getByText('01/10/2026')).toBeTruthy();
    expect(screen.queryByText('01/09/2026')).toBeNull();
  });
});
