import { fireEvent, waitFor } from '@testing-library/react-native';
import { Keyboard } from 'react-native';

import { CountryScreen } from '@/features/onboarding/screens/CountryScreen';
import { NameScreen } from '@/features/onboarding/screens/NameScreen';
import { renderWithTheme } from '@/test/renderWithTheme';

jest.mock('@/features/profile/repositories/localProfileRepository', () => ({
  saveLocalProfileDisplayName: jest.fn(),
}));

jest.mock('@/state/appPreferences/currencyPreferencesRepository', () => ({
  saveCurrencyPreferences: jest.fn(),
}));

const mockNavigation = { goBack: jest.fn(), navigate: jest.fn() };
const navigation = mockNavigation as never;
const route = {} as never;

describe('pantallas de onboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
