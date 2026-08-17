import Ionicons from '@expo/vector-icons/Ionicons';
import { fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { QuickCreateMenu } from '@/components/overlays/QuickCreateMenu/QuickCreateMenu';
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

describe('QuickCreateMenu', () => {
  it('expone las cuatro acciones y devuelve la seleccionada', async () => {
    const onSelect = jest.fn();
    const screen = await renderWithTheme(
      <QuickCreateMenu onClose={jest.fn()} onSelect={onSelect} visible />,
    );

    expect(await screen.findByLabelText('Crear ingreso')).toBeTruthy();
    expect(await screen.findByLabelText('Crear gasto')).toBeTruthy();
    expect(await screen.findByLabelText('Crear categoría')).toBeTruthy();
    expect(
      await screen.findByLabelText('Importar movimientos (beta)'),
    ).toBeTruthy();
    expect(screen.getByTestId('quick-create-import-badge')).toBeTruthy();
    expect(screen.getByText('BETA')).toBeTruthy();
    expect(
      screen.getByTestId('quick-create-category-icon').props.children,
    ).toContain(
      String.fromCodePoint(Number(Ionicons.glyphMap['pie-chart-outline'])),
    );
    expect(
      StyleSheet.flatten(
        screen.getByTestId('quick-create-category-icon-background').props.style,
      ).backgroundColor,
    ).toBe(colors.categoryAction);
    expect(
      StyleSheet.flatten(
        screen.getByTestId('quick-create-category-icon').props.style,
      ).color,
    ).toBe(colors.onBrand);

    fireEvent.press(screen.getByLabelText('Crear gasto'));

    expect(onSelect).toHaveBeenCalledWith('expense');
  });

  it('puede mostrar acciones deshabilitadas sin ocultarlas', async () => {
    const onSelect = jest.fn();
    const screen = await renderWithTheme(
      <QuickCreateMenu
        disabledActionTypes={['expense', 'category', 'import']}
        onClose={jest.fn()}
        onSelect={onSelect}
        visible
      />,
    );

    const expense = screen.getByLabelText('Crear gasto');
    const category = screen.getByLabelText('Crear categoría');

    expect(expense.props.accessibilityState).toMatchObject({ disabled: true });
    expect(category.props.accessibilityState).toMatchObject({ disabled: true });
    expect(
      screen.getByLabelText('Crear ingreso').props.accessibilityState,
    ).toMatchObject({
      disabled: false,
    });

    fireEvent.press(expense);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
