import { act, fireEvent, waitFor } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { getLocalProfile } from '@/features/profile/repositories/localProfileRepository';
import {
  removeProfileAvatar,
  updateProfileAvatar,
} from '@/features/profile/services/updateProfileAvatar';
import { SettingsScreen } from '@/features/settings/screens/SettingsScreen';
import { ApiError } from '@/services/api/client';
import { renderWithTheme } from '@/test/renderWithTheme';
import type { CurrencyPreferences } from '@/state/appPreferences/currencyPreferences';
import { categoryColors } from '@/theme/categoryColors';
import { colors } from '@/theme/colors';
import type { AppearancePreference } from '@/theme/types';

const mockRestartOnboarding = jest.fn();
const mockMarkAuthenticated = jest.fn();

jest.mock('@/state/onboarding/useOnboardingStatus', () => ({
  useOnboardingStatus: () => ({
    markAuthenticated: mockMarkAuthenticated,
    restartOnboarding: mockRestartOnboarding,
  }),
}));

const emptyProfile = {
  avatarUri: null,
  avatarPath: null,
  avatarUpdatedAt: null,
  displayName: null,
};

jest.mock('@/features/profile/repositories/localProfileRepository', () => ({
  getLocalProfile: jest.fn(async () => ({
    avatarUri: null,
    avatarPath: null,
    avatarUpdatedAt: null,
    displayName: null,
  })),
}));

jest.mock('@/features/profile/services/updateProfileAvatar', () => ({
  updateProfileAvatar: jest.fn(),
  removeProfileAvatar: jest.fn(),
}));

const mockGetLocalProfile = jest.mocked(getLocalProfile);
const mockUpdateProfileAvatar = jest.mocked(updateProfileAvatar);
const mockRemoveProfileAvatar = jest.mocked(removeProfileAvatar);

describe('SettingsScreen', () => {
  beforeEach(() => {
    mockGetLocalProfile.mockClear().mockResolvedValue(emptyProfile);
    mockUpdateProfileAvatar.mockClear();
    mockRemoveProfileAvatar.mockClear();
    mockRestartOnboarding.mockReset().mockResolvedValue(undefined);
    mockMarkAuthenticated.mockReset().mockResolvedValue(undefined);
  });

  const renderScreen = async (
    currencyPreferences: CurrencyPreferences = { currencies: ['EUR'] },
    showHomeComparisonIndicators = true,
    overrides: Partial<ComponentProps<typeof SettingsScreen>> = {},
    appearance: AppearancePreference = 'light',
  ) => {
    const props = {
      activeSpaceId: 'space-1',
      activeSpaceType: 'personal' as const,
      currencyPreferences,
      notificationRules: [],
      onBack: jest.fn(),
      onLeaveCoupleSpace: jest.fn().mockResolvedValue(undefined),
      onSaveCurrencyPreferences: jest.fn(),
      onSaveNotificationRule: jest.fn().mockResolvedValue(true),
      onToggleHomeComparisonIndicators: jest.fn(),
      showHomeComparisonIndicators,
      ...overrides,
    };

    return {
      props,
      screen: await renderWithTheme(<SettingsScreen {...props} />, {
        appearance,
      }),
    };
  };

  it('muestra iconos en todas las secciones y marca las funciones pendientes', async () => {
    const { screen } = await renderScreen();

    for (const title of [
      'Cuenta',
      'Preferencias',
      'Notificaciones',
      'Datos y privacidad',
      'Ayuda',
    ]) {
      expect(screen.getByTestId(`section-icon-${title}`)).toBeTruthy();
    }

    expect(screen.getByTestId('pending-Idioma')).toBeTruthy();
    expect(screen.queryByText('Gestionar espacios')).toBeNull();
    expect(screen.queryByText('Borrar mis datos')).toBeNull();
    expect(screen.queryByText('Cómo funciona Juntos')).toBeNull();
    expect(screen.queryByText('Crear cuenta y proteger mis datos')).toBeNull();
    expect(screen.queryByText('Ocultar importes')).toBeNull();
    expect(screen.queryByText('Gestionar recurrencias')).toBeNull();
    expect(screen.queryByText('Importar y exportar')).toBeNull();
    expect(screen.queryByText('Permisos y privacidad')).toBeNull();
    expect(
      StyleSheet.flatten(screen.getByTestId('section-icon-Cuenta').props.style),
    ).not.toHaveProperty('backgroundColor');
    expect(
      StyleSheet.flatten(screen.getByTestId('section-glyph-Cuenta').props.style)
        .color,
    ).toBe(colors.textMuted);
    expect(
      StyleSheet.flatten(screen.getByTestId('section-glyph-Cuenta').props.style)
        .textShadowRadius,
    ).toBeUndefined();
    expect(
      StyleSheet.flatten(
        screen.getByTestId('section-glyph-Notificaciones').props.style,
      ).textShadowRadius,
    ).toBe(0.45);
    expect(
      StyleSheet.flatten(screen.getByTestId('row-icon-Moneda').props.style)
        .backgroundColor,
    ).toBe(categoryColors.green);
    expect(
      StyleSheet.flatten(screen.getByTestId('row-icon-Idioma').props.style)
        .backgroundColor,
    ).toBe(categoryColors.blue);
    expect(
      StyleSheet.flatten(
        screen.getByTestId('row-icon-Estado de los datos').props.style,
      ).backgroundColor,
    ).toBe(categoryColors.violet);
    expect(
      StyleSheet.flatten(screen.getByTestId('row-glyph-Idioma').props.style)
        .textShadowRadius,
    ).toBe(0.45);
    expect(
      StyleSheet.flatten(
        screen.getByTestId('row-glyph-Iniciar sesión o crear cuenta').props
          .style,
      ).textShadowRadius,
    ).toBe(0.45);
    expect(
      StyleSheet.flatten(screen.getByTestId('settings-header').props.style),
    ).toMatchObject({ justifyContent: 'flex-start' });
    expect(
      StyleSheet.flatten(screen.getByTestId('settings-back-icon').props.style)
        .color,
    ).toBe(colors.textPrimary);
    expect(screen.getByText('juntoss 0.1.0')).toBeTruthy();
  });

  it('explica una opción pendiente', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    const { screen } = await renderScreen();

    await fireEvent.press(screen.getByText('Idioma'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Función pendiente',
      expect.stringContaining('falta implementar'),
    );
    alertSpy.mockRestore();
  });

  it('abre las reglas de notificación en vez de mostrar el aviso pendiente', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    const { screen } = await renderScreen();

    await fireEvent.press(screen.getByText('Recordatorios y alertas'));

    expect(alertSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId('notification-rules-modal')).toBeTruthy();
    alertSpy.mockRestore();
  });

  it('permite volver a abrir el onboarding desde Ayuda', async () => {
    const { screen } = await renderScreen();

    await fireEvent.press(screen.getByText('Ver onboarding'));

    expect(mockRestartOnboarding).toHaveBeenCalledTimes(1);
  });

  it('confirma con un mensaje flotante al guardar las reglas de notificación', async () => {
    const { screen } = await renderScreen();

    await fireEvent.press(screen.getByText('Recordatorios y alertas'));
    await fireEvent.press(screen.getByTestId('notification-rules-save'));

    expect(
      await screen.findByText('Recordatorios y alertas actualizados.'),
    ).toBeTruthy();
  });

  it('abre la pantalla de privacidad en vez de mostrar el aviso pendiente', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    const { screen } = await renderScreen();

    await fireEvent.press(screen.getByText('Política de privacidad'));

    expect(alertSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId('privacy-legal-screen')).toBeTruthy();
    alertSpy.mockRestore();
  });

  it('permite volver a la aplicación', async () => {
    const { props, screen } = await renderScreen();

    await fireEvent.press(screen.getByLabelText('Volver'));
    expect(props.onBack).toHaveBeenCalledTimes(1);
  });

  it('muestra la moneda activa y varias monedas activas en el resumen', async () => {
    const { screen } = await renderScreen();
    expect(screen.getByText('Euro')).toBeTruthy();

    const { screen: multiCurrencyScreen } = await renderScreen({
      currencies: ['EUR', 'USD', 'MXN'],
    });
    expect(multiCurrencyScreen.getByText('EUR · USD · MXN')).toBeTruthy();
  });

  it('permite buscar y elegir varias monedas, hasta un máximo de tres', async () => {
    const { props, screen } = await renderScreen();

    await fireEvent.press(screen.getByText('Moneda'));
    await fireEvent.press(screen.getByTestId('currency-option-USD'));
    await fireEvent.press(screen.getByTestId('currency-option-MXN'));
    await fireEvent.press(screen.getByTestId('currency-preferences-save'));

    expect(props.onSaveCurrencyPreferences).toHaveBeenCalledWith({
      currencies: ['EUR', 'USD', 'MXN'],
    });
  });

  it('filtra el catálogo con el buscador por país, moneda o código', async () => {
    const { screen } = await renderScreen();

    await fireEvent.press(screen.getByText('Moneda'));

    await fireEvent.changeText(
      screen.getByTestId('currency-search-input'),
      'mexico',
    );
    expect(screen.getByTestId('currency-option-MXN')).toBeTruthy();
    expect(screen.queryByTestId('currency-option-USD')).toBeNull();

    await fireEvent.changeText(
      screen.getByTestId('currency-search-input'),
      'peso mexicano',
    );
    expect(screen.getByTestId('currency-option-MXN')).toBeTruthy();

    await fireEvent.changeText(
      screen.getByTestId('currency-search-input'),
      'usd',
    );
    expect(screen.getByTestId('currency-option-USD')).toBeTruthy();
    expect(screen.queryByTestId('currency-option-MXN')).toBeNull();
  });

  it('limita a tres monedas activas y avisa al superar el máximo', async () => {
    const { screen } = await renderScreen();

    await fireEvent.press(screen.getByText('Moneda'));
    await fireEvent.press(screen.getByTestId('currency-option-USD'));
    await fireEvent.press(screen.getByTestId('currency-option-MXN'));
    await fireEvent.press(screen.getByTestId('currency-option-GBP'));

    expect(
      screen.getByText('Ya elegiste 3 monedas. Quita una para añadir otra.'),
    ).toBeTruthy();
  });

  it('exige mantener al menos una moneda activa', async () => {
    const { screen } = await renderScreen();

    await fireEvent.press(screen.getByText('Moneda'));
    await fireEvent.press(screen.getByTestId('currency-option-EUR'));

    expect(
      screen.getByText('Debes mantener al menos una moneda activa.'),
    ).toBeTruthy();
  });

  it('permite activar y desactivar la comparación de Inicio', async () => {
    const { props, screen } = await renderScreen({ currencies: ['EUR'] }, true);

    expect(screen.getByTestId('home-comparison-toggle').props.value).toBe(true);

    fireEvent(
      screen.getByTestId('home-comparison-toggle'),
      'valueChange',
      false,
    );

    expect(props.onToggleHomeComparisonIndicators).toHaveBeenCalledWith(false);
  });

  it('refleja el ajuste desactivado de la comparación de Inicio', async () => {
    const { screen } = await renderScreen({ currencies: ['EUR'] }, false);

    expect(screen.getByTestId('home-comparison-toggle').props.value).toBe(
      false,
    );
  });

  it('permite activar y desactivar el modo oscuro', async () => {
    const { screen } = await renderScreen();

    expect(screen.getByTestId('dark-mode-toggle').props.value).toBe(false);

    fireEvent(screen.getByTestId('dark-mode-toggle'), 'valueChange', true);

    await waitFor(() =>
      expect(screen.getByTestId('dark-mode-toggle').props.value).toBe(true),
    );

    fireEvent(screen.getByTestId('dark-mode-toggle'), 'valueChange', false);

    await waitFor(() =>
      expect(screen.getByTestId('dark-mode-toggle').props.value).toBe(false),
    );
  });

  it('muestra el modo oscuro activado cuando ya está seleccionado', async () => {
    const { screen } = await renderScreen(undefined, undefined, {}, 'dark');

    expect(screen.getByTestId('dark-mode-toggle').props.value).toBe(true);
  });

  it('ya no anuncia que los datos quedan solo en el dispositivo y explica cómo cambiar la foto', async () => {
    const { screen } = await renderScreen();

    expect(
      screen.queryByText('Invitado · Datos solo en este dispositivo'),
    ).toBeNull();
    expect(screen.getByText('Toca tu foto para cambiarla')).toBeTruthy();
  });

  it('abre el modal de autenticación en vez de mostrar un aviso pendiente', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    const { screen } = await renderScreen();

    expect(
      screen.queryByTestId('pending-Iniciar sesión o crear cuenta'),
    ).toBeNull();
    await fireEvent.press(screen.getByText('Iniciar sesión o crear cuenta'));

    expect(alertSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId('auth-modal-open-login')).toBeTruthy();
    expect(screen.getByTestId('auth-modal-open-signup')).toBeTruthy();
    alertSpy.mockRestore();
  });

  it('carga la foto de perfil guardada al abrir Ajustes', async () => {
    mockGetLocalProfile.mockResolvedValue({
      ...emptyProfile,
      avatarUri: 'file:///avatar.jpg?v=1',
    });

    const { screen } = await renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId('settings-avatar').props.source).toEqual({
        uri: 'file:///avatar.jpg?v=1',
      }),
    );
  });

  it('permite elegir una foto de la galería y actualiza el avatar mostrado', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    mockUpdateProfileAvatar.mockResolvedValue({
      ...emptyProfile,
      avatarUri: 'file:///document/avatars/profile-avatar.jpg?v=stamp',
    });
    const { screen } = await renderScreen();

    await fireEvent.press(screen.getByTestId('settings-avatar-button'));
    const buttons = alertSpy.mock.calls[0]![2] as {
      text: string;
      onPress?: () => void;
    }[];
    const galleryButton = buttons.find(
      (button) => button.text === 'Elegir de la galería',
    );
    await act(async () => {
      galleryButton?.onPress?.();
    });

    expect(mockUpdateProfileAvatar).toHaveBeenCalledWith(
      'library',
      expect.any(Function),
    );
    await waitFor(() =>
      expect(screen.getByTestId('settings-avatar').props.source).toEqual({
        uri: 'file:///document/avatars/profile-avatar.jpg?v=stamp',
      }),
    );
    alertSpy.mockRestore();
  });

  it('explica el rechazo del servidor usando el código, no el mensaje', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    mockUpdateProfileAvatar.mockRejectedValue(
      new ApiError({
        status: 400,
        code: 'AVATAR_TOO_SMALL',
        message: 'Revisa los datos e inténtalo de nuevo.',
      }),
    );
    const { screen } = await renderScreen();

    await fireEvent.press(screen.getByTestId('settings-avatar-button'));
    const buttons = alertSpy.mock.calls[0]![2] as {
      text: string;
      onPress?: () => void;
    }[];
    const cameraButton = buttons.find((button) => button.text === 'Tomar foto');
    await act(async () => {
      cameraButton?.onPress?.();
    });

    await waitFor(() =>
      expect(screen.getByTestId('settings-avatar-status').props.children).toBe(
        'Esta imagen tiene una resolución demasiado baja. Elige otra foto.',
      ),
    );
    alertSpy.mockRestore();
  });

  it('ofrece quitar la foto solo cuando hay una puesta', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    mockGetLocalProfile.mockResolvedValue({
      ...emptyProfile,
      avatarUri: 'file:///avatar.jpg?v=1',
    });
    mockRemoveProfileAvatar.mockResolvedValue(emptyProfile);
    const { screen } = await renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId('settings-avatar').props.source).toEqual({
        uri: 'file:///avatar.jpg?v=1',
      }),
    );
    await fireEvent.press(screen.getByTestId('settings-avatar-button'));
    const buttons = alertSpy.mock.calls.at(-1)![2] as {
      text: string;
      onPress?: () => void;
    }[];
    await act(async () => {
      buttons.find((button) => button.text === 'Quitar foto')?.onPress?.();
    });

    expect(mockRemoveProfileAvatar).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('no muestra "Salir del espacio de pareja" fuera de un espacio de pareja', async () => {
    const { screen } = await renderScreen();

    expect(screen.queryByText('Salir del espacio de pareja')).toBeNull();
  });

  it('sale del espacio tras confirmar en un espacio de pareja', async () => {
    jest.useFakeTimers();
    const { props, screen } = await renderScreen(undefined, undefined, {
      activeSpaceType: 'couple',
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Salir del espacio de pareja'));
    });
    expect(
      screen.getByTestId('confirm-couple-space-exit').props.accessibilityState
        .disabled,
    ).toBe(true);

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(
      screen.getByTestId('confirm-couple-space-exit').props.accessibilityState
        .disabled,
    ).toBe(false);

    await act(async () => {
      fireEvent.press(screen.getByTestId('confirm-couple-space-exit'));
    });

    expect(props.onLeaveCoupleSpace).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
