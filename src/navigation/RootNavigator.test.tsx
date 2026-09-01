import { type StyleProp, StyleSheet, type ViewStyle } from 'react-native';

import { RootNavigator } from '@/navigation/RootNavigator';
import { renderWithTheme } from '@/test/renderWithTheme';
import { darkColors, lightColors } from '@/theme/colors';

let mockAuthReady = true;
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

jest.mock('@/lib/auth-client', () => ({
  authClient: { signIn: { social: jest.fn() } },
}));

jest.mock('@/navigation/MainTabsNavigator', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  return {
    MainTabsNavigator: () => <RNText>pestañas</RNText>,
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
