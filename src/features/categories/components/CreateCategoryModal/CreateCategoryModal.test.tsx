import { act, fireEvent } from '@testing-library/react-native';
import { DeviceEventEmitter, Platform, StyleSheet } from 'react-native';

import { CreateCategoryModal } from '@/features/categories/components/CreateCategoryModal/CreateCategoryModal';
import type { Category } from '@/features/categories/types';
import { renderWithTheme } from '@/test/renderWithTheme';
import { categoryColors } from '@/theme/categoryColors';
import { colors } from '@/theme/colors';
import { layout } from '@/theme/layout';
import { radii } from '@/theme/radii';

jest.mock('@/components/overlays/AppModal/AppModal', () => ({
  AppModal: ({
    children,
    visible,
  }: {
    children: React.ReactNode;
    visible: boolean;
  }) => (visible ? children : null),
}));

describe('CreateCategoryModal', () => {
  it('muestra el CTA de continuar en morado', async () => {
    const screen = await renderWithTheme(
      <CreateCategoryModal
        categories={[]}
        onClose={jest.fn()}
        onSubmit={jest.fn()}
        spaceId="personal"
        spaceName="Personal"
        visible
      />,
    );

    await fireEvent.changeText(
      screen.getByLabelText('Nombre de la categoría'),
      'Hogar',
    );

    expect(
      StyleSheet.flatten(
        screen.getByLabelText('Continuar personalización').props.style,
      ),
    ).toMatchObject({
      minHeight: layout.actionHeight.regular,
      backgroundColor: colors.cta,
      borderRadius: radii.md,
    });
    expect(colors.cta).toBe('#9933FF');
  });

  it('usa volver para regresar al nombre y después cerrar el flujo', async () => {
    const onClose = jest.fn();
    const screen = await renderWithTheme(
      <CreateCategoryModal
        categories={[]}
        onClose={onClose}
        onSubmit={jest.fn()}
        spaceId="personal"
        spaceName="Personal"
        visible
      />,
    );

    await fireEvent.changeText(
      screen.getByLabelText('Nombre de la categoría'),
      'Hogar',
    );
    await fireEvent.press(screen.getByLabelText('Continuar personalización'));
    expect(screen.getByText('Dale tu estilo')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Volver'));

    expect(screen.getByText('Ponle un nombre')).toBeTruthy();
    expect(screen.getByLabelText('Nombre de la categoría').props.value).toBe(
      'Hogar',
    );
    expect(onClose).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByLabelText('Volver'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('acerca la acción al campo mientras el teclado está visible', async () => {
    const screen = await renderWithTheme(
      <CreateCategoryModal
        categories={[]}
        onClose={jest.fn()}
        onSubmit={jest.fn()}
        spaceId="personal"
        spaceName="Personal"
        visible
      />,
    );
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    expect(
      StyleSheet.flatten(screen.getByTestId('category-name-action').props.style)
        .flex,
    ).toBe(1);

    await act(async () => DeviceEventEmitter.emit(showEvent));

    expect(
      StyleSheet.flatten(screen.getByTestId('category-name-action').props.style)
        .flex,
    ).toBe(0);

    await act(async () => DeviceEventEmitter.emit(hideEvent));

    expect(
      StyleSheet.flatten(screen.getByTestId('category-name-action').props.style)
        .flex,
    ).toBe(1);
  });

  it('crea la categoría con el color y el icono seleccionados', async () => {
    const onSubmit = jest.fn();
    const screen = await renderWithTheme(
      <CreateCategoryModal
        categories={[]}
        onClose={jest.fn()}
        onSubmit={onSubmit}
        spaceId="personal"
        spaceName="Personal"
        visible
      />,
    );

    await fireEvent.changeText(
      screen.getByLabelText('Nombre de la categoría'),
      'Hogar',
    );
    await fireEvent.press(screen.getByLabelText('Continuar personalización'));
    await fireEvent.press(screen.getByLabelText('Color red'));
    await fireEvent.press(screen.getByLabelText('Icono house'));

    expect(
      screen.getByLabelText('Color red').props.accessibilityState,
    ).toMatchObject({ checked: true });
    expect(
      screen.getByLabelText('Icono house').props.accessibilityState,
    ).toMatchObject({ checked: true });
    expect(
      StyleSheet.flatten(screen.getByLabelText('Icono house').props.style)
        .backgroundColor,
    ).toBe(categoryColors.red);

    await fireEvent.press(screen.getByLabelText('Crear categoría'));

    expect(onSubmit).toHaveBeenCalledWith({
      spaceId: 'personal',
      name: 'Hogar',
      icon: 'house',
      colorToken: 'red',
    });
  });

  it('ofrece los 18 colores de las plantillas para una categoría personalizada', async () => {
    const screen = await renderWithTheme(
      <CreateCategoryModal
        categories={[]}
        onClose={jest.fn()}
        onSubmit={jest.fn()}
        spaceId="personal"
        spaceName="Personal"
        visible
      />,
    );

    await fireEvent.changeText(
      screen.getByLabelText('Nombre de la categoría'),
      'Jardinería',
    );
    await fireEvent.press(screen.getByLabelText('Continuar personalización'));

    expect(Object.keys(categoryColors)).toHaveLength(18);
    Object.keys(categoryColors).forEach((colorToken) => {
      expect(screen.getByLabelText(`Color ${colorToken}`)).toBeTruthy();
    });
  });

  it('reutiliza el editor para actualizar una categoría existente', async () => {
    const category: Category = {
      id: 'home',
      spaceId: 'personal',
      name: 'Hogar',
      icon: 'house',
      colorToken: 'blue',
      isDefault: false,
      isArchived: false,
    };
    const onSubmit = jest.fn();
    const screen = await renderWithTheme(
      <CreateCategoryModal
        categories={[category]}
        category={category}
        onClose={jest.fn()}
        onSubmit={onSubmit}
        spaceId="personal"
        spaceName="Personal"
        visible
      />,
    );

    expect(screen.getByText('Edita la categoría')).toBeTruthy();
    expect(screen.getByLabelText('Nombre de la categoría').props.value).toBe(
      'Hogar',
    );
    await fireEvent.press(screen.getByLabelText('Continuar personalización'));
    await fireEvent.press(screen.getByLabelText('Color red'));
    await fireEvent.press(
      screen.getByLabelText('Guardar cambios de categoría'),
    );

    expect(onSubmit).toHaveBeenCalledWith({
      spaceId: 'personal',
      name: 'Hogar',
      icon: 'house',
      colorToken: 'red',
    });
  });
});
