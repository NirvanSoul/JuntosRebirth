import type { Session } from '@supabase/supabase-js';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { useState } from 'react';

import { AuthModal } from '@/features/settings/components/AuthModal';
import { renderWithTheme } from '@/test/renderWithTheme';

jest.mock('@/state/onboarding/useOnboardingStatus', () => ({
  useOnboardingStatus: () => ({ markAuthenticated: jest.fn() }),
}));

const mockSignOut = jest.fn();
jest.mock('@/features/auth/gateways/supabaseAuthGateway', () => ({
  createSupabaseAuthGateway: () => ({ signOut: mockSignOut }),
}));

function createGateMock() {
  return {
    session: null as Session | null,
    rawSession: null as Session | null,
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

/** Sesión que el OTP de recuperación crea al verificarse el código (B7). */
const mockOtpSession = {
  user: { id: 'user-1', email: 'persona@ejemplo.com' },
} as unknown as Session;

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
    mockSignOut.mockReset();
    mockSignOut.mockResolvedValue(undefined);
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

  it('cancelar el restablecimiento cierra la sesión local creada por el OTP (B7)', async () => {
    const screen = await renderWithTheme(
      <AuthModal onClose={jest.fn()} visible />,
    );

    fireEvent.press(await screen.findByTestId('auth-modal-open-login'));
    fireEvent.press(await screen.findByTestId('stub-login-forgot'));
    fireEvent.press(await screen.findByTestId('stub-forgot-send'));
    await screen.findByText('recovery');
    fireEvent.press(await screen.findByTestId('stub-verify-success'));
    await screen.findByText('Nueva contraseña');
    mockGateState.session = mockOtpSession;

    fireEvent.press(screen.getByTestId('stub-reset-cancel'));

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledWith('local'));
  });

  it('cerrar el modal a mitad de restablecimiento también cierra la sesión local del OTP (B7)', async () => {
    let closeModal: (() => void) | null = null;
    function ModalHarness() {
      const [visible, setVisible] = useState(true);
      closeModal = () => setVisible(false);
      return <AuthModal onClose={() => setVisible(false)} visible={visible} />;
    }
    const screen = await renderWithTheme(<ModalHarness />);

    fireEvent.press(await screen.findByTestId('auth-modal-open-login'));
    fireEvent.press(await screen.findByTestId('stub-login-forgot'));
    fireEvent.press(await screen.findByTestId('stub-forgot-send'));
    await screen.findByText('recovery');
    fireEvent.press(await screen.findByTestId('stub-verify-success'));
    await screen.findByText('Nueva contraseña');
    mockGateState.session = mockOtpSession;

    // La X del modal llama a onClose: visible pasa a false con la sesión del
    // OTP viva, lo mismo que cancelar el restablecimiento.
    await act(async () => {
      if (closeModal) closeModal();
    });

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledWith('local'));
  });

  it('terminar el restablecimiento conserva la sesión: solo cancelar la cierra (B7)', async () => {
    const screen = await renderWithTheme(
      <AuthModal onClose={jest.fn()} visible />,
    );

    fireEvent.press(await screen.findByTestId('auth-modal-open-login'));
    fireEvent.press(await screen.findByTestId('stub-login-forgot'));
    fireEvent.press(await screen.findByTestId('stub-forgot-send'));
    await screen.findByText('recovery');
    fireEvent.press(await screen.findByTestId('stub-verify-success'));
    await screen.findByText('Nueva contraseña');
    mockGateState.session = mockOtpSession;

    fireEvent.press(screen.getByTestId('stub-reset-success'));

    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
