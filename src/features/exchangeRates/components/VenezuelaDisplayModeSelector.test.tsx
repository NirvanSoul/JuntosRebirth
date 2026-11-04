import { fireEvent } from '@testing-library/react-native';

import { VenezuelaDisplayModeSelector } from '@/features/exchangeRates/components/VenezuelaDisplayModeSelector';
import { renderWithTheme } from '@/test/renderWithTheme';

describe('VenezuelaDisplayModeSelector', () => {
  it('ofrece USDT después de las referencias BCV', async () => {
    const onChange = jest.fn();
    const screen = await renderWithTheme(
      <VenezuelaDisplayModeSelector
        mode="USD"
        onChange={onChange}
        testID="selector"
      />,
    );

    const tabs = screen.getAllByRole('tab').map((tab) => tab.props.testID);
    expect(tabs).toEqual([
      'selector-control-USD',
      'selector-control-VES_BCV',
      'selector-control-EUR',
      'selector-control-VES_USDT',
    ]);

    await fireEvent.press(screen.getByTestId('selector-control-VES_USDT'));
    expect(onChange).toHaveBeenCalledWith('VES_USDT');
  });

  it('mantiene USDT visible pero apagado cuando no hay tasa', async () => {
    const onChange = jest.fn();
    const screen = await renderWithTheme(
      <VenezuelaDisplayModeSelector
        isUsdtAvailable={false}
        mode="USD"
        onChange={onChange}
        testID="selector"
      />,
    );

    const usdt = screen.getByTestId('selector-control-VES_USDT');
    expect(usdt.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(usdt);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('vuelve a USD si la tasa USDT desaparece con USDT elegido', async () => {
    const onChange = jest.fn();
    await renderWithTheme(
      <VenezuelaDisplayModeSelector
        isUsdtAvailable={false}
        mode="VES_USDT"
        onChange={onChange}
      />,
    );

    expect(onChange).toHaveBeenCalledWith('USD');
  });
});
