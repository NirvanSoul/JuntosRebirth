import { fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { FloatingCreateButton } from '@/components/navigation/FloatingCreateButton/FloatingCreateButton';
import { renderWithTheme } from '@/test/renderWithTheme';
import { colors } from '@/theme/colors';
import { darkShadows } from '@/theme/shadows';

describe('FloatingCreateButton', () => {
  it('mantiene una acción morada sin pulso decorativo y con un símbolo más grueso', async () => {
    const onPress = jest.fn();
    const screen = await renderWithTheme(
      <FloatingCreateButton bottom={24} onPress={onPress} />,
    );

    expect(
      StyleSheet.flatten(
        screen.getByTestId('floating-create-button').props.style,
      ).backgroundColor,
    ).toBe(colors.cta);
    expect(
      screen.getByTestId('floating-create-button-icon-horizontal').props
        .strokeWidth,
    ).toBe(3.5);
    expect(
      screen.getByTestId('floating-create-button-icon-vertical').props
        .strokeWidth,
    ).toBe(3.5);
    expect(screen.queryByTestId('floating-create-button-ring')).toBeNull();

    fireEvent.press(screen.getByTestId('floating-create-button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('usa la sombra oscura del tema en modo oscuro', async () => {
    const screen = await renderWithTheme(
      <FloatingCreateButton bottom={24} onPress={jest.fn()} />,
      { appearance: 'dark' },
    );

    expect(
      StyleSheet.flatten(
        screen.getByTestId('floating-create-button').props.style,
      ),
    ).toMatchObject(darkShadows.floatingAction);
  });

  it('puede participar en una fila sin posicionarse sobre el contenido', async () => {
    const screen = await renderWithTheme(
      <FloatingCreateButton onPress={jest.fn()} placement="inline" />,
    );

    expect(
      StyleSheet.flatten(
        screen.getByTestId('floating-create-button-container').props.style,
      ).position,
    ).toBeUndefined();
  });
});
