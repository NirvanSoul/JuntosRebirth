import { fireEvent } from '@testing-library/react-native';

import { ImportMerchantGroup } from '@/features/import/components/ImportMerchantGroup/ImportMerchantGroup';
import type { Category } from '@/features/categories/types';
import type { ImportCandidateGroup } from '@/features/import/utils/groupImportCandidates';
import { renderWithTheme } from '@/test/renderWithTheme';

const category: Category = {
  id: 'transfers',
  spaceId: 'personal',
  name: 'Transferencias',
  icon: 'credit-card',
  colorToken: 'blue',
  isDefault: false,
  isArchived: false,
};

const group: ImportCandidateGroup = {
  id: 'bizum recibido',
  normalizedMerchant: 'bizum recibido',
  title: 'BIZUM RECIBIDO',
  candidates: [
    {
      id: 'income',
      sourceRowNumber: 1,
      rawDescription: 'BIZUM RECIBIDO',
      normalizedMerchant: 'bizum recibido',
      displayTitle: 'BIZUM RECIBIDO',
      occurredOn: '2026-08-07',
      amountMinor: 6000,
      currency: 'EUR',
      type: 'income',
      suggestedCategoryId: null,
      categoryId: 'transfers',
      duplicateStatus: 'none',
      issues: [],
      selected: true,
    },
    {
      id: 'expense',
      sourceRowNumber: 2,
      rawDescription: 'BIZUM RECIBIDO',
      normalizedMerchant: 'bizum recibido',
      displayTitle: 'BIZUM RECIBIDO',
      occurredOn: '2026-08-06',
      amountMinor: 900,
      currency: 'EUR',
      type: 'expense',
      suggestedCategoryId: null,
      categoryId: 'transfers',
      duplicateStatus: 'none',
      issues: [],
      selected: true,
    },
  ],
};

describe('ImportMerchantGroup', () => {
  it('permite seleccionar el grupo y cambiar una sola categoría para sus filas', async () => {
    const onPressCategory = jest.fn();
    const onToggleSelected = jest.fn();
    const screen = await renderWithTheme(
      <ImportMerchantGroup
        category={category}
        group={group}
        onPressCategory={onPressCategory}
        onToggleCandidate={jest.fn()}
        onToggleSelected={onToggleSelected}
      />,
    );

    expect(screen.getByText('2 movimientos')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('import-merchant-group-checkbox'));
    await fireEvent.press(
      screen.getByLabelText(
        'Cambiar categoría de BIZUM RECIBIDO: Transferencias',
      ),
    );

    expect(onToggleSelected).toHaveBeenCalledTimes(1);
    expect(onPressCategory).toHaveBeenCalledTimes(1);
  });

  it('mantiene colapsadas las filas repetidas hasta que se solicitan', async () => {
    const screen = await renderWithTheme(
      <ImportMerchantGroup
        category={category}
        group={group}
        onPressCategory={jest.fn()}
        onToggleCandidate={jest.fn()}
        onToggleSelected={jest.fn()}
      />,
    );

    expect(screen.queryAllByTestId('import-row')).toHaveLength(0);
    await fireEvent.press(screen.getByTestId('import-merchant-group-expand'));
    expect(screen.getAllByTestId('import-row')).toHaveLength(2);
  });

  it('abre el selector de categoría desde el check cuando el grupo no tiene una', async () => {
    const onPressCategory = jest.fn();
    const onToggleSelected = jest.fn();
    const screen = await renderWithTheme(
      <ImportMerchantGroup
        category={null}
        group={group}
        onPressCategory={onPressCategory}
        onToggleCandidate={jest.fn()}
        onToggleSelected={onToggleSelected}
      />,
    );

    await fireEvent.press(screen.getByTestId('import-merchant-group-checkbox'));

    expect(onPressCategory).toHaveBeenCalledTimes(1);
    expect(onToggleSelected).not.toHaveBeenCalled();
  });
});
