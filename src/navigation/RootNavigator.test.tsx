import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render } from '@testing-library/react-native';
import {
  Linking,
  type StyleProp,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from '@/navigation/RootNavigator';
import { saveAppPreferences } from '@/state/appPreferences/appPreferencesRepository';
import { renderWithTheme } from '@/test/renderWithTheme';
import { darkColors, lightColors } from '@/theme/colors';
import { ThemeProvider } from '@/theme/ThemeProvider';

let mockAuthReady = true;
let mockOnboardingReady = true;
let mockOnboardingCompleted = true;
let mockSession: {
  user: { id: string; email: string; emailVerified: boolean };
} | null = {
  user: { id: 'user-1', email: 'ana@ejemplo.com', emailVerified: true },
};

jest.mock('@/features/auth/hooks/useBetterAuthSession', () => ({
  useBetterAuthSession: () => ({
    error: null,
    isReady: mockAuthReady,
    session: mockSession,
  }),
}));

jest.mock('@/features/onboarding/hooks/useOnboardingCompletion', () => ({
  useOnboardingCompletion: () => ({
    complete: jest.fn(),
    hasCompleted: mockOnboardingCompleted,
    isReady: mockOnboardingReady,
  }),
}));

jest.mock('@/lib/auth-client', () => ({
  authClient: { signIn: { social: jest.fn() } },
}));

jest.mock('@/navigation/MainTabsNavigator', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  return {
    MainTabsNavigator: () => <RNText>pestañas</RNText>,
  };
});

jest.mock('@/features/onboarding/OnboardingNavigator', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  return {
    OnboardingNavigator: () => <RNText>onboarding</RNText>,
  };
});

jest.mock('@/features/access/screens/AccessScreen', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  return {
    AccessScreen: () => <RNText>acceso</RNText>,
  };
});

function backdropBackgroundColor(style: StyleProp<ViewStyle>) {
  return StyleSheet.flatten(style)?.backgroundColor;
}

describe('RootNavigator', () => {
  beforeEach(() => {
    mockAuthReady = true;
    mockOnboardingReady = true;
    mockOnboardingCompleted = true;
    mockSession = {
      user: { id: 'user-1', email: 'ana@ejemplo.com', emailVerified: true },
    };
  });

  it('pinta el fondo del tema detrás de la navegación', async () => {
    const screen = await renderWithTheme(<RootNavigator />, {
      appearance: 'dark',
    });

    expect(await screen.findByText('pestañas')).toBeTruthy();
    expect(
      backdropBackgroundColor(
        screen.getByTestId('root-navigator-backdrop').props.style,
      ),
    ).toBe(darkColors.background);
  });

  it('mantiene el fondo del tema mientras la sesión no está lista', async () => {
    mockAuthReady = false;

    const screen = await renderWithTheme(<RootNavigator />, {
      appearance: 'dark',
    });

    expect(
      backdropBackgroundColor(
        screen.getByTestId('root-navigator-backdrop').props.style,
      ),
    ).toBe(darkColors.background);
    expect(screen.queryByText('pestañas')).toBeNull();
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('espera las fuentes sin mostrar texto ni abrir la cuenta prematuramente', async () => {
    const screen = await renderWithTheme(<RootNavigator fontsReady={false} />);

    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(screen.queryByText('Abriendo juntoss')).toBeNull();
    expect(screen.queryByText('pestañas')).toBeNull();

    await screen.rerender(<RootNavigator fontsReady />);
    expect(screen.getByText('pestañas')).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('mantiene la barra mientras la navegación resuelve la URL inicial', async () => {
    let resolveInitialUrl: ((value: string | null) => void) | undefined;
    const getInitialURL = jest
      .spyOn(Linking, 'getInitialURL')
      .mockImplementationOnce(
        () =>
          new Promise<string | null>((resolve) => {
            resolveInitialUrl = resolve;
          }),
      );
    try {
      const screen = await renderWithTheme(<RootNavigator />);

      expect(screen.getByRole('progressbar')).toBeTruthy();
      expect(screen.queryByText('pestañas')).toBeNull();

      await act(async () => {
        resolveInitialUrl?.(null);
      });
      expect(screen.getByText('pestañas')).toBeTruthy();
      expect(screen.queryByRole('progressbar')).toBeNull();
    } finally {
      getInitialURL.mockRestore();
    }
  });

  it('espera la apariencia guardada antes de abrir, sin pintar el fondo claro', async () => {
    await saveAppPreferences({ appearance: 'dark' });
    // La lectura de AsyncStorage sigue pendiente: aún no se sabe la apariencia.
    let resolveStoredPreferences: ((value: string | null) => void) | undefined;
    const getItem = jest.spyOn(AsyncStorage, 'getItem').mockImplementationOnce(
      () =>
        new Promise<string | null>((resolve) => {
          resolveStoredPreferences = resolve;
        }),
    );

    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider>
          <RootNavigator />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(screen.queryByText('pestañas')).toBeNull();

    await act(async () => {
      resolveStoredPreferences?.(
        JSON.stringify({ version: 1, appearance: 'dark' }),
      );
    });

    expect(await screen.findByText('pestañas')).toBeTruthy();
    expect(
      backdropBackgroundColor(
        screen.getByTestId('root-navigator-backdrop').props.style,
      ),
    ).toBe(darkColors.background);
    getItem.mockRestore();
  });

  it('mantiene el fondo del tema mientras se restaura el estado del onboarding', async () => {
    mockOnboardingReady = false;

    const screen = await renderWithTheme(<RootNavigator />, {
      appearance: 'dark',
    });

    expect(screen.queryByText('onboarding')).toBeNull();
    expect(screen.queryByText('pestañas')).toBeNull();
    expect(
      backdropBackgroundColor(
        screen.getByTestId('root-navigator-backdrop').props.style,
      ),
    ).toBe(darkColors.background);
  });

  it('muestra el onboarding antes de Acceso en una instalación nueva', async () => {
    mockOnboardingCompleted = false;
    mockSession = null;

    const screen = await renderWithTheme(<RootNavigator />);

    expect(await screen.findByText('onboarding')).toBeTruthy();
    expect(screen.queryByText('acceso')).toBeNull();
    expect(screen.queryByText('pestañas')).toBeNull();
  });

  it('usa el fondo claro cuando la apariencia es clara', async () => {
    const screen = await renderWithTheme(<RootNavigator />, {
      appearance: 'light',
    });

    expect(
      backdropBackgroundColor(
        screen.getByTestId('root-navigator-backdrop').props.style,
      ),
    ).toBe(lightColors.background);
  });

  it('mantiene el acceso cuando la sesión todavía no verificó el correo', async () => {
    mockSession = {
      user: {
        id: 'user-1',
        email: 'ana@ejemplo.com',
        emailVerified: false,
      },
    };

    const screen = await renderWithTheme(<RootNavigator />);

    expect(await screen.findByText('acceso')).toBeTruthy();
    expect(screen.queryByText('pestañas')).toBeNull();
  });

  it('después de cerrar sesión no muestra las pestañas de la cuenta anterior', async () => {
    mockSession = null;

    const screen = await renderWithTheme(<RootNavigator />);

    expect(await screen.findByText('acceso')).toBeTruthy();
    expect(screen.queryByText('pestañas')).toBeNull();
  });
});
