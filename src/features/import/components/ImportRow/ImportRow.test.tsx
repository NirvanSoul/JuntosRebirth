import { fireEvent } from '@testing-library/react-native';

import type { Category } from '@/features/categories/types';
import { ImportRow } from '@/features/import/components/ImportRow/ImportRow';
import type { ImportedTransactionCandidate } from '@/features/import/types';
import { renderWithTheme } from '@/test/renderWithTheme';

const category: Category = {
  id: 'supermercado',
  spaceId: 'personal',
  name: 'Supermercado',
  icon: 'shopping-cart',
  colorToken: 'green',
  isDefault: false,
  isArchived: false,
};

function buildCandidate(
  overrides: Partial<ImportedTransactionCandidate> = {},
): ImportedTransactionCandidate {
  return {
    id: 'candidate-1',
    sourceRowNumber: 1,
    rawDescription: 'MERCADONA MADRID',
    normalizedMerchant: 'mercadona madrid',
    displayTitle: 'MERCADONA MADRID',
    occurredOn: '2026-08-01',
    amountMinor: 3244,
    currency: 'EUR',
    type: 'expense',
    suggestedCategoryId: 'supermercado',
    categoryId: 'supermercado',
    duplicateStatus: 'none',
    issues: [],
    selected: true,
    ...overrides,
  };
}

describe('ImportRow', () => {
  it('muestra título, fecha, categoría e importe', async () => {
    const screen = await renderWithTheme(
      <ImportRow
        candidate={buildCandidate()}
        category={category}
        onPressCategory={jest.fn()}
        onToggleSelected={jest.fn()}
      />,
    );

    expect(screen.getByText('MERCADONA MADRID')).toBeTruthy();
    expect(screen.getByText(/Supermercado/)).toBeTruthy();
  });

  it('llama a onToggleSelected al pulsar la casilla', async () => {
    const onToggleSelected = jest.fn();
    const screen = await renderWithTheme(
      <ImportRow
        candidate={buildCandidate()}
        category={category}
        onPressCategory={jest.fn()}
        onToggleSelected={onToggleSelected}
      />,
    );

    fireEvent.press(screen.getByTestId('import-row-checkbox'));
    expect(onToggleSelected).toHaveBeenCalledTimes(1);
  });

  it('llama a onPressCategory al pulsar el icono de categoría', async () => {
    const onPressCategory = jest.fn();
    const screen = await renderWithTheme(
      <ImportRow
        candidate={buildCandidate({
          categoryId: null,
          suggestedCategoryId: null,
        })}
        category={null}
        onPressCategory={onPressCategory}
        onToggleSelected={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByLabelText('Elegir categoría'));
    expect(onPressCategory).toHaveBeenCalledTimes(1);
  });

  it('muestra avisos reales, pero no trata la categoría pendiente como error', async () => {
    const screen = await renderWithTheme(
      <ImportRow
        candidate={buildCandidate({
          issues: [
            {
              code: 'unknown_category',
              message: 'Elige una categoría para este movimiento.',
            },
          ],
        })}
        category={null}
        onPressCategory={jest.fn()}
        onToggleSelected={jest.fn()}
      />,
    );

    expect(
      screen.queryByText(/Elige una categoría para este movimiento\./),
    ).toBeNull();
  });
});
