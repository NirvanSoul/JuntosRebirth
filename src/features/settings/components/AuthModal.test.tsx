import { fireEvent, waitFor } from '@testing-library/react-native';
import { useState } from 'react';

import { AuthModal } from '@/features/settings/components/AuthModal';
import { renderWithTheme } from '@/test/renderWithTheme';

jest.mock('@/state/onboarding/useOnboardingStatus', () => ({
  useOnboardingStatus: () => ({ markAuthenticated: jest.fn() }),
}));

function createGateMock() {
  return {
    session: null,
    rawSession: null,
    isReady: true,
    gateReady: true,
    isLegallyEnabled: true,
    status: { kind: 'no-session' },
    error: null,
    missingDocuments: [],
    retryGate: jest.fn(),
    submitRegularization: jest.fn(),
    abandonSession: jest.fn(),
    setRecoveryHalted: jest.fn(),
  };
}

let mockGateState = createGateMock();
let mockSetRecoveryHalted = mockGateState.setRecoveryHalted;

jest.mock('@/features/legal/hooks/useLegalSessionGate', () => ({
  useLegalSessionGate: () => mockGateState,
  resetLegalSessionGateForTests: jest.fn(),
}));

jest.mock('@/features/auth/screens/LoginScreen', () => ({
  LoginScreen: jest.requireActual('@/test/authScreenStubs').LoginScreenStub,
}));
jest.mock('@/features/auth/screens/SignUpScreen', () => ({
  SignUpScreen: jest.requireActual('@/test/authScreenStubs').SignUpScreenStub,
  signUpTotalSteps: 5,
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

describe('AuthModal — cableado de navegación de autenticación', () => {
  beforeEach(() => {
    mockGateState = createGateMock();
    mockSetRecoveryHalted = mockGateState.setRecoveryHalted;
  });

  it('usa el origen de Ajustes y el progreso extendido al abrir crear cuenta', async () => {
    const screen = await renderWithTheme(
      <AuthModal onClose={jest.fn()} visible />,
    );

    fireEvent.press(await screen.findByTestId('auth-modal-open-signup'));

    const source = await screen.findByTestId('stub-signup-source');
    expect(source.props.children).toBe('settings-signup');
    const progress = screen.getByTestId('auth-modal-signup-progress');
    expect(progress.props.accessibilityValue.max).toBe(6);
  });

  it('del inicio de sesión lleva a recuperar contraseña', async () => {
    const screen = await renderWithTheme(
      <AuthModal onClose={jest.fn()} visible />,
    );

    fireEvent.press(await screen.findByTestId('auth-modal-open-login'));
    fireEvent.press(await screen.findByTestId('stub-login-forgot'));

    expect(await screen.findByText('Recuperar contraseña')).toBeTruthy();
    expect(screen.getByTestId('stub-forgot-screen')).toBeTruthy();
  });

  it('completa la cadena de recuperación hasta nueva contraseña', async () => {
    const screen = await renderWithTheme(
      <AuthModal onClose={jest.fn()} visible />,
    );

    fireEvent.press(await screen.findByTestId('auth-modal-open-login'));
    fireEvent.press(await screen.findByTestId('stub-login-forgot'));
    fireEvent.press(await screen.findByTestId('stub-forgot-send'));

    expect(await screen.findByText('recovery')).toBeTruthy();

    fireEvent.press(await screen.findByTestId('stub-verify-success'));

    expect(await screen.findByText('Nueva contraseña')).toBeTruthy();
    expect(screen.getByTestId('stub-reset-screen')).toBeTruthy();
  });

  it('pausa la puerta legal durante la recuperación (B3) y la libera al cerrar el modal', async () => {
    function ModalHarness() {
      const [visible, setVisible] = useState(true);
      return <AuthModal onClose={() => setVisible(false)} visible={visible} />;
    }
    const screen = await renderWithTheme(<ModalHarness />);

    fireEvent.press(await screen.findByTestId('auth-modal-open-login'));
    fireEvent.press(await screen.findByTestId('stub-login-forgot'));
    await screen.findByTestId('stub-forgot-screen');
    fireEvent.press(screen.getByTestId('stub-forgot-send'));

    await screen.findByText('recovery');
    expect(mockSetRecoveryHalted).toHaveBeenCalledWith(true);

    fireEvent.press(await screen.findByTestId('stub-verify-success'));
    await screen.findByText('Nueva contraseña');
    expect(mockSetRecoveryHalted).toHaveBeenCalledWith(true);

    // Cerrar el modal a mitad de restablecimiento libera la pausa: la puerta
    // vuelve a gobernar la sesión creada por el OTP.
    fireEvent.press(screen.getByTestId('stub-reset-cancel'));
    await waitFor(() =>
      expect(mockSetRecoveryHalted).toHaveBeenLastCalledWith(false),
    );
  });

  it('desde la verificación de registro, recuperar contraseña lleva al flujo de recuperación', async () => {
    const screen = await renderWithTheme(
      <AuthModal onClose={jest.fn()} visible />,
    );

    fireEvent.press(await screen.findByTestId('auth-modal-open-signup'));
    fireEvent.press(await screen.findByTestId('stub-signup-complete'));
    expect(await screen.findByText('signup')).toBeTruthy();

    fireEvent.press(await screen.findByTestId('stub-verify-go-recovery'));

    expect(await screen.findByText('Recuperar contraseña')).toBeTruthy();
  });
});
