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
jest.mock('@/features/auth/screens/ForgotPasswordScreen', () => ({
  ForgotPasswordScreen: jest.requireActual('@/test/authScreenStubs')
    .ForgotPasswordScreenStub,
}));
jest.mock('@/features/auth/screens/ResetPasswordScreen', () => ({
  ResetPasswordScreen: jest.requireActual('@/test/authScreenStubs')
    .ResetPasswordScreenStub,
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

  it('en la verificación de registro, iniciar sesión vuelve al inicio de sesión', async () => {
    const screen = await renderInvitation();

    fireEvent.press(screen.getByTestId('stub-login-signup'));
    fireEvent.press(await screen.findByTestId('stub-signup-complete'));

    fireEvent.press(await screen.findByTestId('stub-verify-go-login'));

    expect(await screen.findByTestId('stub-login-screen')).toBeTruthy();
  });

  it('desde la verificación de registro, recuperar contraseña entra en la recuperación', async () => {
    const screen = await renderInvitation();

    fireEvent.press(screen.getByTestId('stub-login-signup'));
    fireEvent.press(await screen.findByTestId('stub-signup-complete'));

    fireEvent.press(await screen.findByTestId('stub-verify-go-recovery'));

    expect(await screen.findByTestId('stub-forgot-screen')).toBeTruthy();
  });

  it('desde el inicio de sesión recorre recuperar, verificar y nueva contraseña', async () => {
    const screen = await renderInvitation();

    fireEvent.press(screen.getByTestId('stub-login-forgot'));
    expect(await screen.findByTestId('stub-forgot-screen')).toBeTruthy();

    fireEvent.press(screen.getByTestId('stub-forgot-send'));
    expect(await screen.findByText('recovery')).toBeTruthy();

    fireEvent.press(screen.getByTestId('stub-verify-success'));

    expect(await screen.findByTestId('stub-reset-screen')).toBeTruthy();
  });
});
