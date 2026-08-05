import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { FloatingCreateButton } from '@/components/navigation/FloatingCreateButton/FloatingCreateButton';
import { colors } from '@/theme/colors';

describe('FloatingCreateButton', () => {
  it('mantiene una acción morada sin pulso decorativo y con un símbolo más grueso', async () => {
    const onPress = jest.fn();
    const screen = await render(
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
});
