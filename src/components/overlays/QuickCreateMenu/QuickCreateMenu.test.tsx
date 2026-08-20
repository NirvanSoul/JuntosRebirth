import Ionicons from '@expo/vector-icons/Ionicons';
import { fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { QuickCreateMenu } from '@/components/overlays/QuickCreateMenu/QuickCreateMenu';
import { renderWithTheme } from '@/test/renderWithTheme';
import { colors } from '@/theme/colors';
import { shadows } from '@/theme/shadows';

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
  it('expone las tres acciones de creación sin subtítulos y devuelve la seleccionada', async () => {
    const onSelect = jest.fn();
    const screen = await renderWithTheme(
      <QuickCreateMenu onClose={jest.fn()} onSelect={onSelect} visible />,
    );

    expect(await screen.findByLabelText('Crear ingreso')).toBeTruthy();
    expect(await screen.findByLabelText('Crear gasto')).toBeTruthy();
    expect(await screen.findByLabelText('Crear categoría')).toBeTruthy();
    expect(screen.getByText('Crear ingreso')).toBeTruthy();
    expect(screen.getByText('Crear gasto')).toBeTruthy();
    expect(screen.getByText('Crear categoría')).toBeTruthy();
    expect(screen.queryByText('Dinero que entra')).toBeNull();
    expect(screen.queryByText('Dinero que sale')).toBeNull();
    expect(screen.queryByText('Organiza tus movimientos')).toBeNull();
    expect(screen.queryByLabelText('Importar movimientos (beta)')).toBeNull();
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
    expect(
      StyleSheet.flatten(screen.getByLabelText('Crear ingreso').props.style),
    ).toMatchObject({
      ...shadows.subtle,
      backgroundColor: colors.surface,
    });
    expect(screen.getByTestId('quick-create-close-button')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Crear gasto'));

    expect(onSelect).toHaveBeenCalledWith('expense');
  });

  it('puede mostrar acciones deshabilitadas sin ocultarlas', async () => {
    const onSelect = jest.fn();
    const screen = await renderWithTheme(
      <QuickCreateMenu
        disabledActionTypes={['expense', 'category']}
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
