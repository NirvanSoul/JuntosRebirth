import { fireEvent } from '@testing-library/react-native';

import { ImportProgressAction } from '@/features/import/components/ImportProgressAction/ImportProgressAction';
import { renderWithTheme } from '@/test/renderWithTheme';

describe('ImportProgressAction', () => {
  it('muestra la cantidad seleccionada y solo se activa al poder importar', async () => {
    const onPress = jest.fn();
    const screen = await renderWithTheme(
      <ImportProgressAction
        onPress={onPress}
        selectedCount={0}
        totalCount={4}
      />,
    );

    const button = screen.getByTestId('import-confirm');
    expect(screen.getByText('Importar 0')).toBeTruthy();
    expect(button.props.accessibilityState.disabled).toBe(true);

    await screen.rerender(
      <ImportProgressAction
        onPress={onPress}
        selectedCount={2}
        totalCount={4}
      />,
    );

    expect(screen.getByText('Importar 2')).toBeTruthy();
    expect(
      screen.getByTestId('import-confirm').props.accessibilityState.disabled,
    ).toBe(false);
    await fireEvent.press(screen.getByTestId('import-confirm'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
