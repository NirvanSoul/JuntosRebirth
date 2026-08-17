import { type StyleProp, StyleSheet, type ViewStyle } from 'react-native';

import { RootNavigator } from '@/navigation/RootNavigator';
import { renderWithTheme } from '@/test/renderWithTheme';
import { darkColors, lightColors } from '@/theme/colors';

let mockAuthReady = true;
let mockOnboardingReady = true;

jest.mock('@/features/auth/hooks/useAuthSession', () => ({
  useAuthSession: () => ({
    session: { access_token: 'token', user: { id: 'user-1' } },
    userId: 'user-1',
    isReady: mockAuthReady,
  }),
}));

jest.mock('@/state/onboarding/useOnboardingStatus', () => ({
  useOnboardingStatus: () => ({
    isReady: mockOnboardingReady,
    status: { accessMode: 'guest', completed: true, version: 1 },
  }),
}));

jest.mock('@/navigation/MainTabsNavigator', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  return {
    MainTabsNavigator: () => <RNText>pestañas</RNText>,
  };
});

function backdropBackgroundColor(style: StyleProp<ViewStyle>) {
  return StyleSheet.flatten(style)?.backgroundColor;
}

describe('RootNavigator', () => {
  beforeEach(() => {
    mockAuthReady = true;
    mockOnboardingReady = true;
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
});
