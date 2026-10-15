import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { Keyboard } from 'react-native';

import { CountryScreen } from '@/features/onboarding/screens/CountryScreen';
import { JuntosScreen } from '@/features/onboarding/screens/JuntosScreen';
import { NameScreen } from '@/features/onboarding/screens/NameScreen';
import { NotificationsPermissionScreen } from '@/features/onboarding/screens/NotificationsPermissionScreen';
import { OnboardingLoginScreen } from '@/features/onboarding/screens/OnboardingLoginScreen';
import { updateProfileCountry } from '@/features/profile/services/updateProfileCountry';
import { triggerHaptic } from '@/lib/haptics/haptics';
import { requestNotificationPermission } from '@/lib/notifications/localNotifications';
import { renderWithTheme } from '@/test/renderWithTheme';

jest.mock('@/features/profile/repositories/localProfileRepository', () => ({
  saveLocalProfileDisplayName: jest.fn(),
}));

jest.mock('@/features/profile/services/updateProfileCountry', () => ({
  updateProfileCountry: jest.fn(),
}));
jest.mock('@/features/access/screens/AccessScreen', () => ({
  AccessScreen: () => null,
}));
jest.mock('@/lib/notifications/localNotifications', () => ({
  requestNotificationPermission: jest.fn(),
}));
jest.mock('@/lib/haptics/haptics', () => ({
  triggerHaptic: jest.fn(),
}));

const mockUpdateProfileCountry = updateProfileCountry as jest.Mock;
const mockRequestNotificationPermission =
  requestNotificationPermission as jest.Mock;

const mockNavigation = { goBack: jest.fn(), navigate: jest.fn() };
const navigation = mockNavigation as never;
const route = {} as never;
const completeOnboarding = jest.fn(async (): Promise<void> => undefined);

describe('pantallas de onboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateProfileCountry.mockResolvedValue(undefined);
    mockRequestNotificationPermission.mockResolvedValue(true);
  });

  it('responde con un háptico al continuar, pero no al volver', async () => {
    const screen = await renderWithTheme(
      <JuntosScreen navigation={navigation} route={route} />,
    );

    expect(screen.queryByTestId('onboarding-juntos-skip')).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByTestId('onboarding-juntos-back'));
    });
    expect(triggerHaptic).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.press(screen.getByTestId('onboarding-juntos-action'));
    });
    expect(triggerHaptic).toHaveBeenCalledWith('onboardingContinue');
    expect(mockNavigation.navigate).toHaveBeenLastCalledWith(
      'NotificationsPermission',
    );
  });

  it('no muestra el botón de omitir en la lámina compartida', async () => {
    const screen = await renderWithTheme(
      <JuntosScreen navigation={navigation} route={route} />,
    );

    expect(screen.queryByTestId('onboarding-juntos-skip')).toBeNull();
  });

  it('solicita el permiso en la nueva lámina y continúa aunque el sistema lo deniegue', async () => {
    mockRequestNotificationPermission.mockResolvedValue(false);
    const screen = await renderWithTheme(
      <NotificationsPermissionScreen navigation={navigation} route={route} />,
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('onboarding-notifications-action'));
    });

    await waitFor(() => {
      expect(mockRequestNotificationPermission).toHaveBeenCalledTimes(1);
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        'CreateFirstCategory',
      );
    });
  });

  it('permite continuar sin solicitar notificaciones', async () => {
    const screen = await renderWithTheme(
      <NotificationsPermissionScreen navigation={navigation} route={route} />,
    );

    fireEvent.press(screen.getByTestId('onboarding-notifications-not-now'));

    expect(mockRequestNotificationPermission).not.toHaveBeenCalled();
    expect(triggerHaptic).toHaveBeenCalledWith('onboardingContinue');
    expect(mockNavigation.navigate).toHaveBeenCalledWith('CreateFirstCategory');
  });

  it('guarda el checkpoint al llegar al acceso, antes de autenticarse', async () => {
    await renderWithTheme(
      <OnboardingLoginScreen
        navigation={navigation}
        onComplete={completeOnboarding}
        route={route}
      />,
    );

    await waitFor(() => expect(completeOnboarding).toHaveBeenCalledTimes(1));
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

  it('muestra el primer paso con la ilustración y los nueve segmentos', async () => {
    const screen = await renderWithTheme(
      <NameScreen navigation={navigation} route={route} />,
    );

    expect(screen.getByTestId('onboarding-name-illustration')).toBeTruthy();
    expect(screen.getByTestId('onboarding-progress-segment-9')).toBeTruthy();
    expect(screen.queryByTestId('onboarding-progress-segment-10')).toBeNull();
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

    await act(async () => {
      fireEvent.press(screen.getByTestId('onboarding-country-action'));
    });

    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Juntos');
    });
    expect(mockUpdateProfileCountry).toHaveBeenCalledWith('VE', {
      sync: 'deferred',
    });
    await waitFor(() => {
      expect(screen.getByText('Continuar')).toBeTruthy();
    });
  });
});
