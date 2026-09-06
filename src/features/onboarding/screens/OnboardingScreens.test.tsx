import { fireEvent, waitFor } from '@testing-library/react-native';
import { Keyboard } from 'react-native';

import { CountryScreen } from '@/features/onboarding/screens/CountryScreen';
import { NameScreen } from '@/features/onboarding/screens/NameScreen';
import { WelcomeScreen } from '@/features/onboarding/screens/WelcomeScreen';
import { ReadyToExploreScreen } from '@/features/onboarding/screens/ReadyToExploreScreen';
import { OnboardingFlowContext } from '@/features/onboarding/context/OnboardingFlowContext';
import { updateProfileCountry } from '@/features/profile/services/updateProfileCountry';
import { renderWithTheme } from '@/test/renderWithTheme';

jest.mock('@/features/profile/repositories/localProfileRepository', () => ({
  saveLocalProfileDisplayName: jest.fn(),
}));

jest.mock('@/features/profile/services/updateProfileCountry', () => ({
  updateProfileCountry: jest.fn(),
}));

const mockUpdateProfileCountry = updateProfileCountry as jest.Mock;

const mockNavigation = { goBack: jest.fn(), navigate: jest.fn() };
const navigation = mockNavigation as never;
const route = {} as never;
const completeOnboarding = jest.fn(async (): Promise<void> => undefined);

describe('pantallas de onboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateProfileCountry.mockResolvedValue(undefined);
  });

  it('permite omitir desde la bienvenida, después de guardar nombre y país', async () => {
    const screen = await renderWithTheme(
      <OnboardingFlowContext.Provider value={{ completeOnboarding }}>
        <WelcomeScreen navigation={navigation} route={route} />
      </OnboardingFlowContext.Provider>,
    );

    fireEvent.press(screen.getByTestId('onboarding-welcome-skip'));

    await waitFor(() => {
      expect(completeOnboarding).toHaveBeenCalledTimes(1);
    });
  });

  it('explica cómo reintentar si no puede omitir', async () => {
    completeOnboarding.mockRejectedValueOnce(new Error('sin espacio'));
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    const screen = await renderWithTheme(
      <OnboardingFlowContext.Provider value={{ completeOnboarding }}>
        <WelcomeScreen navigation={navigation} route={route} />
      </OnboardingFlowContext.Provider>,
    );

    fireEvent.press(screen.getByTestId('onboarding-welcome-skip'));

    await waitFor(() => {
      expect(
        screen.getByText(
          'No pudimos omitir el onboarding. Inténtalo de nuevo.',
        ),
      ).toBeTruthy();
    });
    consoleError.mockRestore();
  });

  it('explica cómo reintentar si no puede completar el flujo', async () => {
    const screen = await renderWithTheme(
      <ReadyToExploreScreen
        navigation={navigation}
        onComplete={async () => {
          throw new Error('sin espacio');
        }}
        route={route}
      />,
    );

    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    fireEvent.press(screen.getByTestId('onboarding-ready-action'));

    await waitFor(() => {
      expect(
        screen.getByText(
          'No pudimos completar el onboarding. Inténtalo de nuevo.',
        ),
      ).toBeTruthy();
    });
    consoleError.mockRestore();
  });

  it('cierra el teclado al tocar fuera del campo de nombre', async () => {
    const dismissKeyboard = jest.spyOn(Keyboard, 'dismiss');
    const screen = await renderWithTheme(
      <NameScreen navigation={navigation} route={route} />,
    );

    fireEvent.press(screen.getByTestId('onboarding-name-dismiss-area'));

    expect(dismissKeyboard).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText('No necesitas crear una cuenta todavía.'),
    ).toBeNull();
    dismissKeyboard.mockRestore();
  });

  it('muestra el primer paso con la ilustración y los cinco segmentos', async () => {
    const screen = await renderWithTheme(
      <NameScreen navigation={navigation} route={route} />,
    );

    expect(screen.getByTestId('onboarding-name-illustration')).toBeTruthy();
    expect(screen.getByTestId('onboarding-progress-segment-5')).toBeTruthy();
    expect(screen.queryByTestId('onboarding-name-back')).toBeNull();
  });

  it('no muestra países hasta escribir y filtra las sugerencias al instante', async () => {
    const screen = await renderWithTheme(
      <CountryScreen navigation={navigation} route={route} />,
    );

    expect(screen.queryByTestId('onboarding-country-ES')).toBeNull();

    fireEvent.changeText(
      screen.getByTestId('onboarding-country-search'),
      'esp',
    );

    await waitFor(() => {
      expect(screen.getByTestId('onboarding-country-ES')).toBeTruthy();
    });
  });

  it('al elegir un país sustituye el buscador por su tarjeta, y la X lo vuelve a mostrar', async () => {
    const screen = await renderWithTheme(
      <CountryScreen navigation={navigation} route={route} />,
    );

    fireEvent.changeText(
      screen.getByTestId('onboarding-country-search'),
      'esp',
    );
    await waitFor(() => {
      expect(screen.getByTestId('onboarding-country-ES')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('onboarding-country-ES'));

    await waitFor(() => {
      expect(screen.getByTestId('onboarding-country-selected')).toBeTruthy();
    });
    expect(screen.queryByTestId('onboarding-country-search')).toBeNull();

    fireEvent.press(screen.getByTestId('onboarding-country-selected-clear'));

    await waitFor(() => {
      expect(screen.getByTestId('onboarding-country-search')).toBeTruthy();
    });
    expect(screen.queryByTestId('onboarding-country-selected')).toBeNull();
  });

  it('al elegir Venezuela activa su contexto monetario con una sola respuesta', async () => {
    const screen = await renderWithTheme(
      <CountryScreen navigation={navigation} route={route} />,
    );

    fireEvent.changeText(
      screen.getByTestId('onboarding-country-search'),
      'venez',
    );
    await waitFor(() => {
      expect(screen.getByTestId('onboarding-country-VE')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('onboarding-country-VE'));

    await waitFor(() => {
      expect(screen.getByTestId('onboarding-country-selected')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('onboarding-country-action'));

    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Welcome');
    });
    expect(mockUpdateProfileCountry).toHaveBeenCalledWith('VE', {
      sync: 'deferred',
    });
    await waitFor(() => {
      expect(screen.getByText('Continuar')).toBeTruthy();
    });
  });
});
