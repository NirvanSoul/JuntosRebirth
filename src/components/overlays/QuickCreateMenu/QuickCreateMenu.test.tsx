import Ionicons from '@expo/vector-icons/Ionicons';
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { QuickCreateMenu } from '@/components/overlays/QuickCreateMenu/QuickCreateMenu';
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
  it('expone las tres acciones y devuelve la seleccionada', async () => {
    const onSelect = jest.fn();
    const screen = await render(
      <QuickCreateMenu onClose={jest.fn()} onSelect={onSelect} visible />,
    );

    expect(await screen.findByLabelText('Crear ingreso')).toBeTruthy();
    expect(await screen.findByLabelText('Crear gasto')).toBeTruthy();
    expect(await screen.findByLabelText('Crear categoría')).toBeTruthy();
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
});
