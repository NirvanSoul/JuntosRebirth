import { fireEvent, waitFor } from '@testing-library/react-native';

import { AccessScreen } from '@/features/access/screens/AccessScreen';
import { renderWithTheme } from '@/test/renderWithTheme';

let mockSession: { user: { email: string; emailVerified: boolean } } | null =
  null;
let mockPendingVerificationEmail: string | null = null;

jest.mock('@/features/auth/hooks/useBetterAuthSession', () => ({
  useBetterAuthSession: () => ({
    error: null,
    isReady: true,
    session: mockSession,
  }),
}));

jest.mock('@/features/auth/screens/LoginScreen', () => ({
  LoginScreen: () => null,
}));
jest.mock('@/features/auth/services/pendingEmailVerification', () => ({
  loadPendingEmailVerification: jest.fn(
    async () => mockPendingVerificationEmail,
  ),
}));
jest.mock('@/features/auth/screens/SignUpScreen', () => ({
  SignUpScreen: ({
    onSuccess,
  }: {
    onSuccess: (result: { email: string }) => void;
  }) => {
    const { Pressable } = jest.requireActual('react-native');
    return (
      <Pressable
        onPress={() => onSuccess({ email: 'ana@ejemplo.com' })}
        testID="signup-complete"
      />
    );
  },
  signUpTotalSteps: 4,
}));
jest.mock('@/features/auth/screens/VerifyCodeScreen', () => ({
  VerifyCodeScreen: ({ email }: { email: string }) => {
    const { Text } = jest.requireActual('react-native');
    return <Text testID="verify-signup-email">{email}</Text>;
  },
}));
jest.mock('@/features/auth/screens/ForgotPasswordScreen', () => ({
  ForgotPasswordScreen: () => null,
}));
jest.mock('@/features/auth/screens/ResetPasswordScreen', () => ({
  ResetPasswordScreen: () => null,
}));

describe('AccessScreen', () => {
  beforeEach(() => {
    mockSession = null;
    mockPendingVerificationEmail = null;
  });

  it('no ofrece una entrada sin cuenta', async () => {
    const screen = await renderWithTheme(<AccessScreen />);

    expect(screen.queryByTestId('access-continue-guest')).toBeNull();
  });

  it('abre el paso de crear cuenta desde la única entrada de acceso', async () => {
    const screen = await renderWithTheme(<AccessScreen />);

    fireEvent.press(screen.getByTestId('onboarding-login-action'));

    expect(screen.getByText('Crear cuenta')).toBeTruthy();
  });

  it('muestra la misma entrada final después de cerrar sesión', async () => {
    const screen = await renderWithTheme(<AccessScreen />);

    expect(screen.getByTestId('onboarding-login-illustration')).toBeTruthy();
    expect(screen.getByTestId('onboarding-progress-segment-10')).toBeTruthy();
    expect(screen.getByText('Empecemos esto\nJuntos.')).toBeTruthy();

    fireEvent.press(screen.getByTestId('onboarding-login-action'));
    expect(screen.getByText('Crear cuenta')).toBeTruthy();
  });

  it('muestra una flecha junto al título al abrir iniciar sesión', async () => {
    const screen = await renderWithTheme(<AccessScreen />);

    fireEvent.press(screen.getByTestId('onboarding-login-open-login'));

    await waitFor(() => expect(screen.getByLabelText('Volver')).toBeTruthy());
    expect(screen.queryByText('Atrás')).toBeNull();
  });

  it('retoma la verificación cuando Better Auth creó una sesión sin verificar', async () => {
    mockSession = {
      user: { email: 'ana@ejemplo.com', emailVerified: false },
    };

    const screen = await renderWithTheme(<AccessScreen />);

    expect(screen.getByText('Verifica tu correo')).toBeTruthy();
  });

  it('pasa al OTP al terminar el último paso de crear cuenta', async () => {
    const screen = await renderWithTheme(<AccessScreen />);

    fireEvent.press(screen.getByTestId('onboarding-login-action'));
    fireEvent.press(await screen.findByTestId('signup-complete'));

    expect(await screen.findByTestId('verify-signup-email')).toHaveTextContent(
      'ana@ejemplo.com',
    );
  });

  it('retoma el OTP almacenado si el host de acceso se remonta sin sesión provisional', async () => {
    mockPendingVerificationEmail = 'ana@ejemplo.com';
    const screen = await renderWithTheme(<AccessScreen />);

    await waitFor(() =>
      expect(screen.getByTestId('verify-signup-email')).toHaveTextContent(
        'ana@ejemplo.com',
      ),
    );
  });
});
