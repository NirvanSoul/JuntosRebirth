import type { Session } from '@supabase/supabase-js';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { AccessScreen } from '@/features/access/screens/AccessScreen';
import { renderWithTheme } from '@/test/renderWithTheme';

const mockMarkAuthenticated = jest.fn();
const mockMarkGuestComplete = jest.fn();

jest.mock('@/state/onboarding/useOnboardingStatus', () => ({
  useOnboardingStatus: () => ({
    markAuthenticated: mockMarkAuthenticated,
    markGuestComplete: mockMarkGuestComplete,
  }),
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

describe('AccessScreen', () => {
  beforeEach(() => {
    mockMarkAuthenticated.mockReset();
    mockMarkGuestComplete.mockReset();
    mockGateState = createGateMock();
    mockSetRecoveryHalted = mockGateState.setRecoveryHalted;
    mockSignOut.mockReset();
    mockSignOut.mockResolvedValue(undefined);
  });

  it('mantiene visible la entrada como invitado y la persiste al elegirla', async () => {
    const screen = await renderWithTheme(<AccessScreen />);

    fireEvent.press(screen.getByTestId('access-continue-guest'));

    expect(mockMarkGuestComplete).toHaveBeenCalledTimes(1);
  });

  it('abre el paso de crear cuenta con su origen y el progreso de 6 pasos', async () => {
    const screen = await renderWithTheme(<AccessScreen />);

    fireEvent.press(screen.getByTestId('access-open-signup'));

    expect(screen.getByText('Crear cuenta')).toBeTruthy();
    // Origen legal del registro desde el acceso inicial y progreso extendido.
    const source = await screen.findByTestId('stub-signup-source');
    expect(source.props.children).toBe('access-signup');
    const progress = screen.getByTestId('access-signup-progress');
    expect(progress.props.accessibilityValue.max).toBe(6);
  });

  describe('cableado de navegación de autenticación', () => {
    it('del inicio de sesión lleva a recuperar contraseña', async () => {
      const screen = await renderWithTheme(<AccessScreen />);

      fireEvent.press(screen.getByTestId('access-open-login'));
      fireEvent.press(await screen.findByTestId('stub-login-forgot'));

      expect(await screen.findByText('Recuperar contraseña')).toBeTruthy();
      expect(screen.getByTestId('stub-forgot-screen')).toBeTruthy();
    });

    it('completa la cadena de recuperación hasta nueva contraseña', async () => {
      const screen = await renderWithTheme(<AccessScreen />);

      fireEvent.press(screen.getByTestId('access-open-login'));
      fireEvent.press(await screen.findByTestId('stub-login-forgot'));
      fireEvent.press(await screen.findByTestId('stub-forgot-send'));

      expect(await screen.findByText('recovery')).toBeTruthy();

      fireEvent.press(await screen.findByTestId('stub-verify-success'));

      expect(await screen.findByText('Nueva contraseña')).toBeTruthy();
      expect(screen.getByTestId('stub-reset-screen')).toBeTruthy();
    });

    it('pausa la puerta legal durante la recuperación (B3): el OTP va a crear una sesión y el restablecimiento no puede cortocircuitarse', async () => {
      const screen = await renderWithTheme(<AccessScreen />);

      fireEvent.press(screen.getByTestId('access-open-login'));
      fireEvent.press(await screen.findByTestId('stub-login-forgot'));
      await screen.findByTestId('stub-forgot-screen');
      fireEvent.press(screen.getByTestId('stub-forgot-send'));

      await screen.findByText('recovery');
      expect(mockSetRecoveryHalted).toHaveBeenCalledWith(true);

      fireEvent.press(await screen.findByTestId('stub-verify-success'));
      await screen.findByText('Nueva contraseña');
      expect(mockSetRecoveryHalted).toHaveBeenCalledWith(true);

      // Salir del restablecimiento vuelve al acceso y libera la pausa.
      fireEvent.press(screen.getByTestId('stub-reset-cancel'));
      await screen.findByText('Iniciar sesión');
      expect(mockSetRecoveryHalted).toHaveBeenCalledWith(false);
    });

    it('desde la verificación de registro, recuperar contraseña lleva al flujo de recuperación', async () => {
      const screen = await renderWithTheme(<AccessScreen />);

      fireEvent.press(screen.getByTestId('access-open-signup'));
      fireEvent.press(await screen.findByTestId('stub-signup-complete'));
      expect(await screen.findByText('signup')).toBeTruthy();

      fireEvent.press(await screen.findByTestId('stub-verify-go-recovery'));

      expect(await screen.findByText('Recuperar contraseña')).toBeTruthy();
    });

    it('desde la verificación de registro, iniciar sesión vuelve al inicio de sesión', async () => {
      const screen = await renderWithTheme(<AccessScreen />);

      fireEvent.press(screen.getByTestId('access-open-signup'));
      fireEvent.press(await screen.findByTestId('stub-signup-complete'));
      fireEvent.press(await screen.findByTestId('stub-verify-go-login'));

      expect(await screen.findByText('Iniciar sesión')).toBeTruthy();
    });
  });

  it('cancelar el restablecimiento cierra la sesión local creada por el OTP (B7): no se puede cancelar y entrar igualmente', async () => {
    const screen = await renderWithTheme(<AccessScreen />);

    fireEvent.press(screen.getByTestId('access-open-login'));
    fireEvent.press(await screen.findByTestId('stub-login-forgot'));
    fireEvent.press(await screen.findByTestId('stub-forgot-send'));
    await screen.findByText('recovery');

    // El código se verifica y el OTP crea la sesión a mitad del flujo: al
    // cancelar, esa sesión debe cerrarse en local (transición real).
    fireEvent.press(await screen.findByTestId('stub-verify-success'));
    await screen.findByText('Nueva contraseña');
    mockGateState.session = mockOtpSession;

    fireEvent.press(screen.getByTestId('stub-reset-cancel'));

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledWith('local'));
    expect(await screen.findByText('Iniciar sesión')).toBeTruthy();
  });

  it('terminar el restablecimiento conserva la sesión del OTP: solo cancelar la cierra (B7)', async () => {
    const screen = await renderWithTheme(<AccessScreen />);

    fireEvent.press(screen.getByTestId('access-open-login'));
    fireEvent.press(await screen.findByTestId('stub-login-forgot'));
    fireEvent.press(await screen.findByTestId('stub-forgot-send'));
    await screen.findByText('recovery');
    fireEvent.press(await screen.findByTestId('stub-verify-success'));
    await screen.findByText('Nueva contraseña');
    mockGateState.session = mockOtpSession;

    fireEvent.press(screen.getByTestId('stub-reset-success'));

    await screen.findByText('Iniciar sesión');
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
