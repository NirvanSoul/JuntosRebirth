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

const mockSetNewPassword = jest.fn();
jest.mock('@/features/auth/services/resetPasswordService', () => ({
  setNewPassword: (password: string) => mockSetNewPassword(password),
}));

const mockSignOut = jest.fn();
const mockGetSession = jest.fn();
jest.mock('@/features/auth/gateways/supabaseAuthGateway', () => ({
  createSupabaseAuthGateway: () => ({
    getSession: mockGetSession,
    signOut: mockSignOut,
  }),
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
    setRecoveryHold: jest.fn(),
  };
}

let mockGateState = createGateMock();
let mockSetRecoveryHold = mockGateState.setRecoveryHold;

/** Sesión que el OTP de recuperación crea al verificarse el código (B7). */
const mockOtpSession = {
  user: { id: 'user-1', email: 'persona@ejemplo.com' },
} as unknown as Session;

jest.mock('@/features/legal/hooks/useLegalSessionGate', () => ({
  useLegalSessionGate: () => mockGateState,
  useRecoveryHold: () => mockGateState.setRecoveryHold,
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
    mockSetRecoveryHold = mockGateState.setRecoveryHold;
    mockSetNewPassword.mockReset();
    mockSetNewPassword.mockResolvedValue(undefined);
    mockSignOut.mockReset();
    mockSignOut.mockResolvedValue(undefined);
    mockGetSession.mockReset();
    mockGetSession.mockResolvedValue(null);
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

    it('la pausa legal se sostiene durante todo el episodio y solo cae al terminar (ADR-084)', async () => {
      const screen = await renderWithTheme(<AccessScreen />);

      fireEvent.press(screen.getByTestId('access-open-login'));
      fireEvent.press(await screen.findByTestId('stub-login-forgot'));
      await screen.findByTestId('stub-forgot-screen');
      fireEvent.press(screen.getByTestId('stub-forgot-send'));
      await screen.findByText('recovery');

      fireEvent.press(await screen.findByTestId('stub-verify-success'));
      await screen.findByText('Nueva contraseña');

      // Ni un solo `false` entre el inicio del episodio y su desenlace: con el
      // cleanup dentro del efecto de la pausa aparecía uno en cada transición.
      const holds = mockSetRecoveryHold.mock.calls.map((call) => call[1]);
      expect(holds.slice(holds.indexOf(true))).toEqual([true]);

      // Cancelar cierra el episodio y solo entonces se libera.
      fireEvent.press(screen.getByTestId('stub-reset-cancel'));
      await screen.findByText('Iniciar sesión');
      await waitFor(() =>
        expect(mockSetRecoveryHold).toHaveBeenLastCalledWith(
          expect.any(String),
          false,
        ),
      );
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

  it('mientras guarda, Cancelar y Atrás quedan bloqueados: la carrera no puede empezar (ADR-084)', async () => {
    let resolveSave: (() => void) | undefined;
    mockSetNewPassword.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );
    const screen = await renderWithTheme(<AccessScreen />);

    fireEvent.press(screen.getByTestId('access-open-login'));
    fireEvent.press(await screen.findByTestId('stub-login-forgot'));
    fireEvent.press(await screen.findByTestId('stub-forgot-send'));
    await screen.findByText('recovery');
    fireEvent.press(await screen.findByTestId('stub-verify-success'));
    await screen.findByText('Nueva contraseña');

    fireEvent.press(screen.getByTestId('stub-reset-submit'));
    await screen.findByTestId('stub-reset-saving');

    // Cancelar desde la pantalla y «Atrás» del anfitrión: los dos se ignoran.
    fireEvent.press(screen.getByTestId('stub-reset-cancel'));
    fireEvent.press(screen.getByLabelText('Volver'));
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(screen.getByTestId('stub-reset-screen')).toBeTruthy();

    resolveSave?.();
    await screen.findByText('Iniciar sesión');
    // Terminar no cierra la sesión: solo cancelar lo hace.
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('la cancelación que falla deja el mensaje visible y el reintento cierra el episodio (ADR-084)', async () => {
    mockSignOut.mockRejectedValueOnce(new Error('Sin conexión con la red.'));
    const screen = await renderWithTheme(<AccessScreen />);

    fireEvent.press(screen.getByTestId('access-open-login'));
    fireEvent.press(await screen.findByTestId('stub-login-forgot'));
    fireEvent.press(await screen.findByTestId('stub-forgot-send'));
    await screen.findByText('recovery');
    fireEvent.press(await screen.findByTestId('stub-verify-success'));
    await screen.findByText('Nueva contraseña');

    fireEvent.press(screen.getByTestId('stub-reset-cancel'));
    await screen.findByTestId('stub-reset-error');
    // La pausa NO cae con la sesión posiblemente viva.
    expect(mockSetRecoveryHold).toHaveBeenLastCalledWith(
      expect.any(String),
      true,
    );

    // El mismo control reintenta, porque `canRetryCancel` lo mantiene vivo.
    mockSignOut.mockResolvedValue(undefined);
    fireEvent.press(screen.getByTestId('stub-reset-cancel'));
    await screen.findByText('Iniciar sesión');
    expect(mockSignOut).toHaveBeenCalledTimes(2);
  });

  it('desde verify-recovery, Atrás vuelve a pedir el código sin abandonar el episodio (ADR-084)', async () => {
    const screen = await renderWithTheme(<AccessScreen />);

    fireEvent.press(screen.getByTestId('access-open-login'));
    fireEvent.press(await screen.findByTestId('stub-login-forgot'));
    fireEvent.press(await screen.findByTestId('stub-forgot-send'));
    await screen.findByText('recovery');

    fireEvent.press(screen.getByLabelText('Volver'));

    expect(await screen.findByTestId('stub-forgot-screen')).toBeTruthy();
    // Sigue dentro del episodio: la pausa no se ha liberado.
    expect(mockSetRecoveryHold).toHaveBeenLastCalledWith(
      expect.any(String),
      true,
    );
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
