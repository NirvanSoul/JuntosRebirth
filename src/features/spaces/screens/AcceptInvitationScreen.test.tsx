import { fireEvent } from '@testing-library/react-native';

import { AcceptInvitationScreen } from '@/features/spaces/screens/AcceptInvitationScreen';
import { renderWithTheme } from '@/test/renderWithTheme';

jest.mock('@/features/auth/hooks/useAuthSession', () => ({
  useAuthSession: () => ({ isReady: true, session: null, userId: null }),
}));

jest.mock('@/features/spaces/gateways/supabaseInvitationGateway', () => ({
  AcceptInvitationError: class AcceptInvitationError extends Error {},
  createSupabaseInvitationGateway: () => ({
    acceptInvitation: jest.fn(),
    getInvitationPreview: jest.fn().mockResolvedValue({
      invitedEmailMasked: 'pe***@ejemplo.com',
      inviterDisplayName: 'Alex',
      spaceName: 'Nuestro hogar',
      status: 'pending',
    }),
  }),
}));

jest.mock('@/features/auth/screens/LoginScreen', () => ({
  LoginScreen: jest.requireActual('@/test/authScreenStubs').LoginScreenStub,
}));
jest.mock('@/features/auth/screens/SignUpScreen', () => ({
  SignUpScreen: jest.requireActual('@/test/authScreenStubs').SignUpScreenStub,
  signUpTotalSteps: 4,
}));
jest.mock('@/features/auth/screens/VerifyCodeScreen', () => ({
  VerifyCodeScreen: jest.requireActual('@/test/authScreenStubs')
    .VerifyCodeScreenStub,
}));

describe('AcceptInvitationScreen — cableado de autenticación', () => {
  async function renderInvitation() {
    const screen = await renderWithTheme(
      <AcceptInvitationScreen
        onFinished={jest.fn()}
        refreshCoupleSpace={jest.fn()}
        token="token-123"
      />,
    );
    // Espera a que la preview cargue y se pinte la UI de autenticación.
    await screen.findByTestId('stub-login-screen');
    return screen;
  }

  it('lleva de iniciar sesión a crear cuenta y a la verificación de registro', async () => {
    const screen = await renderInvitation();

    fireEvent.press(screen.getByTestId('stub-login-signup'));
    expect(await screen.findByTestId('stub-signup-screen')).toBeTruthy();

    fireEvent.press(await screen.findByTestId('stub-signup-complete'));
    expect(await screen.findByText('signup')).toBeTruthy();
  });

  it('en la verificación de registro cablea iniciar sesión pero no recuperación', async () => {
    const screen = await renderInvitation();

    fireEvent.press(screen.getByTestId('stub-login-signup'));
    fireEvent.press(await screen.findByTestId('stub-signup-complete'));

    expect(await screen.findByTestId('stub-verify-go-login')).toBeTruthy();
    // El anfitrión de invitación no cablea `onGoToRecovery`; la salida textual
    // («abre la app para recuperar tu contraseña») la prueba
    // VerifyCodeScreen.test.tsx para el caso sin recuperación.
    expect(screen.queryByTestId('stub-verify-go-recovery')).toBeNull();
  });

  it('el inicio de sesión del anfitrión de invitación no ofrece recuperar contraseña', async () => {
    const screen = await renderInvitation();

    expect(screen.queryByTestId('stub-login-forgot')).toBeNull();
  });
});
