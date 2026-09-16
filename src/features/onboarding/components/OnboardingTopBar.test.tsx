import { act, fireEvent } from '@testing-library/react-native';
import { Dimensions, StyleSheet } from 'react-native';

import { OnboardingScreenLayout } from '@/features/onboarding/components/OnboardingScreenLayout';
import { OnboardingTopBar } from '@/features/onboarding/components/OnboardingTopBar';
import { OnboardingFlowContext } from '@/features/onboarding/context/OnboardingFlowContext';
import { renderWithTheme } from '@/test/renderWithTheme';

function withFlow(ui: React.ReactElement, history: boolean[]) {
  const topBarSkipHistory = { current: history };
  return {
    topBarSkipHistory,
    ui: (
      <OnboardingFlowContext.Provider
        value={{ completeOnboarding: jest.fn(), topBarSkipHistory }}
      >
        {ui}
      </OnboardingFlowContext.Provider>
    ),
  };
}

const hidden = { includeHiddenElements: true };

describe('OnboardingTopBar', () => {
  it('deja un "Omitir" fantasma un fotograma cuando la lámina anterior lo tenía', async () => {
    let nextFrame: FrameRequestCallback | null = null;
    const frameSpy = jest
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        nextFrame = callback;
        return 1;
      });
    const { ui, topBarSkipHistory } = withFlow(
      <OnboardingTopBar canSkip={false} currentStep={6} testID="lamina" />,
      [true],
    );
    const screen = await renderWithTheme(ui);

    // El fantasma es solo visual: está oculto para accesibilidad.
    expect(screen.getByTestId('lamina-skip-ghost', hidden)).toBeTruthy();
    expect(screen.queryByTestId('lamina-skip', hidden)).toBeNull();
    expect(topBarSkipHistory.current).toEqual([true, false]);

    await act(async () => {
      nextFrame?.(0);
    });
    expect(screen.queryByTestId('lamina-skip-ghost', hidden)).toBeNull();

    await screen.unmount();
    expect(topBarSkipHistory.current).toEqual([true]);
    frameSpy.mockRestore();
  });

  it('no muestra el fantasma si la lámina anterior tampoco tenía "Omitir"', async () => {
    const { ui } = withFlow(
      <OnboardingTopBar canSkip={false} currentStep={7} testID="lamina" />,
      [true, false],
    );
    const screen = await renderWithTheme(ui);

    expect(screen.queryByTestId('lamina-skip-ghost', hidden)).toBeNull();
  });

  it('sin historial ni "Omitir" no deja ningún fantasma', async () => {
    const screen = await renderWithTheme(
      <OnboardingTopBar canSkip={false} currentStep={6} testID="lamina" />,
    );

    expect(screen.queryByTestId('lamina-skip-ghost', hidden)).toBeNull();
    expect(screen.getByTestId('onboarding-progress')).toBeTruthy();
  });

  it('mantiene "Omitir" pulsable cuando procede', async () => {
    const onSkip = jest.fn();
    const screen = await renderWithTheme(
      <OnboardingTopBar
        canSkip
        currentStep={3}
        onSkip={onSkip}
        testID="lamina"
      />,
    );

    fireEvent.press(screen.getByTestId('lamina-skip'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});

describe('OnboardingScreenLayout con ilustración a sangre', () => {
  it('ocupa el 100 % del ancho de la ventana sin poder encoger', async () => {
    const screen = await renderWithTheme(
      <OnboardingScreenLayout
        currentStep={5}
        illustrationAspectRatio={2}
        illustrationFullBleed
        illustrationSource={{ uri: 'https://example.com/puzzle.png' }}
        testID="lamina"
        title="Juntos"
      />,
    );

    const { width } = Dimensions.get('window');
    const image = StyleSheet.flatten(
      screen.getByTestId('lamina-illustration').props.style,
    );
    expect(image.width).toBe(Math.round(width));
    expect(image.height).toBe(Math.round(width / 2));
    expect(image.flexShrink).toBe(0);

    const frame = StyleSheet.flatten(
      screen.getByTestId('lamina-illustration-frame').props.style,
    );
    expect(frame.flexShrink).toBe(0);
    expect(frame.marginHorizontal).toBeLessThan(0);
  });
});
