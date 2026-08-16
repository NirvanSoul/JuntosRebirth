import { OnboardingRevealText } from '@/features/onboarding/components/OnboardingRevealText';
import { renderWithTheme } from '@/test/renderWithTheme';

// El mock oficial de Reanimated no cachea `useSharedValue` entre renders
// (pierde estado), lo que ocultaría el bug de la preferencia tardía. Lo
// sobreescribimos con `useRef` para que se comporte como el real: misma
// referencia durante toda la vida del componente.
const mockSharedValues: { value: unknown }[] = [];
const mockAnimationToken = '__ANIMATION__';

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  const React = jest.requireActual('react');
  return {
    ...Reanimated,
    useSharedValue: (init: unknown) => {
      const ref = React.useRef({ value: init });
      mockSharedValues.push(ref.current);
      return ref.current;
    },
    withDelay: () => mockAnimationToken,
    withTiming: () => mockAnimationToken,
  };
});

describe('OnboardingRevealText', () => {
  beforeEach(() => {
    mockSharedValues.length = 0;
  });

  it('muestra el texto al instante si reducir movimiento está activo desde el inicio', async () => {
    await renderWithTheme(
      <OnboardingRevealText reduceMotion text="Hola" variant="heading" />,
    );

    // opacity (índice 0) y translateY (índice 1) quedan en el estado final.
    expect(mockSharedValues[0]!.value).toBe(1);
    expect(mockSharedValues[1]!.value).toBe(0);
  });

  it('anima la entrada cuando reducir movimiento está desactivado', async () => {
    await renderWithTheme(
      <OnboardingRevealText
        reduceMotion={false}
        text="Hola"
        variant="heading"
      />,
    );

    expect(mockSharedValues[0]!.value).toBe(mockAnimationToken);
    expect(mockSharedValues[1]!.value).toBe(mockAnimationToken);
  });

  it('salta al estado final si la preferencia llega tarde como activa', async () => {
    const screen = await renderWithTheme(
      <OnboardingRevealText
        reduceMotion={false}
        text="Hola"
        variant="heading"
      />,
    );

    await screen.rerender(
      <OnboardingRevealText reduceMotion text="Hola" variant="heading" />,
    );

    // Salta a visible sin re-animar: opacidad 1, desplazamiento 0.
    expect(mockSharedValues[0]!.value).toBe(1);
    expect(mockSharedValues[1]!.value).toBe(0);
  });

  it('no re-anima si la preferencia se desactiva después de revelarse', async () => {
    const screen = await renderWithTheme(
      <OnboardingRevealText reduceMotion text="Hola" variant="heading" />,
    );

    await screen.rerender(
      <OnboardingRevealText
        reduceMotion={false}
        text="Hola"
        variant="heading"
      />,
    );

    // Sigue visible (opacity 1), no re-anima.
    expect(mockSharedValues[0]!.value).toBe(1);
  });
});
