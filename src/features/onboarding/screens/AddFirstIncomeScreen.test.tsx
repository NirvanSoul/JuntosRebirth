import { fireEvent, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { AddFirstIncomeScreen } from '@/features/onboarding/screens/AddFirstIncomeScreen';
import { renderWithTheme } from '@/test/renderWithTheme';
import { colors } from '@/theme/colors';

jest.mock('@/components/overlays/AppModal/AppModal', () => ({
  AppModal: ({
    children,
    visible,
  }: {
    children: React.ReactNode;
    visible: boolean;
  }) => (visible ? children : null),
}));

jest.mock('@/features/spaces/hooks/useSpaces', () => ({
  useSpaces: () => ({
    activeSpace: { id: 'personal', name: 'Personal', type: 'personal' },
  }),
}));

const seededCategory = {
  id: 'category-salary',
  spaceId: 'personal',
  name: 'Salario',
  icon: 'money',
  colorToken: 'emerald',
  isDefault: true,
  templateKey: 'salary',
  isArchived: false,
};

const mockListLocalCategories = jest.fn();
jest.mock('@/features/categories/repositories/localCategoryRepository', () => ({
  listLocalCategories: () => mockListLocalCategories(),
  createLocalCategory: jest.fn(),
  createLocalCategories: jest.fn(),
}));

const mockCreateLocalTransaction = jest.fn();
jest.mock(
  '@/features/transactions/repositories/localTransactionRepository',
  () => ({
    createLocalTransaction: (input: Record<string, unknown>) =>
      mockCreateLocalTransaction(input),
  }),
);

const mockNavigation = { goBack: jest.fn(), navigate: jest.fn() };
const navigation = mockNavigation as never;
const route = {} as never;

describe('AddFirstIncomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListLocalCategories.mockResolvedValue([seededCategory]);
    mockCreateLocalTransaction.mockResolvedValue([
      { id: 'transaction-1', spaceId: 'personal', type: 'income' },
    ]);
  });

  it('abre el formulario real de movimiento sin el selector de tipo, y guarda un ingreso', async () => {
    const screen = await renderWithTheme(
      <AddFirstIncomeScreen navigation={navigation} route={route} />,
    );

    expect(screen.getByText(/Ahora añade\s+tu primer ingreso/)).toBeTruthy();

    await fireEvent.press(screen.getByTestId('onboarding-add-income-action'));

    // El toggle interactivo de tipo no debe existir; la insignia fija sí.
    expect(screen.queryByTestId('transaction-type-selector')).toBeNull();
    expect(
      screen.getByTestId('transaction-type-indicator-income'),
    ).toBeTruthy();

    // Ninguna categoría viene preseleccionada: el usuario debe elegirla.
    expect(screen.getByLabelText('Agregar categoría')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('transaction-category-button'));
    await fireEvent.press(screen.getByLabelText('Salario'));
    await waitFor(() => {
      expect(screen.getByLabelText('Categoría Salario')).toBeTruthy();
    });

    await fireEvent.press(screen.getByLabelText('1'));
    await fireEvent.press(screen.getByLabelText(','));
    await fireEvent.press(screen.getByLabelText('5'));

    // El botón de guardar se tiñe de verde (ingreso), no del color de la
    // categoría, exclusivo de este paso de onboarding con tipo fijo.
    expect(
      StyleSheet.flatten(
        screen.getByTestId('transaction-submit-gradient').props.style,
      ).backgroundColor,
    ).toBe(colors.income);

    await fireEvent.press(screen.getByLabelText('Agregar movimiento'));

    await waitFor(() => {
      expect(mockCreateLocalTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          amountMinor: 150,
          categoryId: seededCategory.id,
          spaceId: 'personal',
          type: 'income',
        }),
      );
    });
    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith('AddFirstExpense');
    });
  });
});
