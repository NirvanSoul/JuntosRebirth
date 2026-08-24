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

    fireEvent.press(screen.getByTestId('stub-reset-cancel'));

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledWith('local'));
  });

  it('ruta 2 (B7 r4): con signOut diferido, el cierre manual sostiene la pausa hasta que signOut resuelve', async () => {
    let resolveSignOut: (() => void) | undefined;
    mockSignOut.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSignOut = resolve;
        }),
    );
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

    // Cierre manual (visible → false) con la sesión del OTP viva: el signOut
    // está en vuelo y la pausa NO se libera hasta que resuelve. Antes, el
    // efecto `visible && phase` la soltaba de inmediato por orden de efectos.
    await act(async () => {
      if (closeModal) closeModal();
    });
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledWith('local'));
    expect(mockSetRecoveryHalted).toHaveBeenLastCalledWith(true);

    await act(async () => resolveSignOut?.());

    expect(mockSetRecoveryHalted).toHaveBeenLastCalledWith(false);
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

    fireEvent.press(screen.getByTestId('stub-reset-success'));

    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('ruta 1 (B7 r4): reset → atrás → forgot → Cancelar/Iniciar sesión cierra la sesión local y solo tras el signOut se libera la pausa', async () => {
    let resolveSignOut: (() => void) | undefined;
    mockSignOut.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSignOut = resolve;
        }),
    );
    const onClose = jest.fn();
    const screen = await renderWithTheme(
      <AuthModal onClose={onClose} visible />,
    );

    fireEvent.press(await screen.findByTestId('auth-modal-open-login'));
    fireEvent.press(await screen.findByTestId('stub-login-forgot'));
    fireEvent.press(await screen.findByTestId('stub-forgot-send'));
    await screen.findByText('recovery');
    fireEvent.press(await screen.findByTestId('stub-verify-success'));
    await screen.findByText('Nueva contraseña');

    // Atrás desde «Nueva contraseña» es una salida con la sesión del OTP viva:
    // pasa por cancelReset y no navega hasta que signOut('local') resuelve.
    fireEvent.press(screen.getByLabelText('Volver'));
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledWith('local'));
    expect(screen.getByTestId('stub-reset-screen')).toBeTruthy();
    expect(mockSetRecoveryHalted).toHaveBeenLastCalledWith(true);
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => resolveSignOut?.());

    // Llega a forgot solo tras el éxito, y la pausa cae después del signOut.
    await screen.findByText('Recuperar contraseña');
    expect(mockSetRecoveryHalted).toHaveBeenLastCalledWith(false);
    expect(mockSignOut).toHaveBeenCalledTimes(1);

    // Desde forgot, Cancelar tampoco reabre la sesión: ya se cerró antes de
    // liberar la pausa, así que no vuelve a disparar signOut.
    fireEvent.press(screen.getByTestId('stub-forgot-cancel'));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mockSignOut).toHaveBeenCalledTimes(1);

    // La misma cadena saliendo por «Iniciar sesión»: el back ya cerró la
    // sesión antes, entrar en login no dispara otro signOut.
    mockSignOut.mockResolvedValue(undefined);
    const loginScreen = await renderWithTheme(
      <AuthModal onClose={onClose} visible />,
    );
    fireEvent.press(await loginScreen.findByTestId('auth-modal-open-login'));
    fireEvent.press(await loginScreen.findByTestId('stub-login-forgot'));
    fireEvent.press(await loginScreen.findByTestId('stub-forgot-send'));
    await loginScreen.findByText('recovery');
    fireEvent.press(await loginScreen.findByTestId('stub-verify-success'));
    await loginScreen.findByText('Nueva contraseña');
    fireEvent.press(loginScreen.getByLabelText('Volver'));
    await loginScreen.findByText('Recuperar contraseña');

    fireEvent.press(loginScreen.getByTestId('stub-forgot-login'));
    await loginScreen.findByText('Iniciar sesión');
    expect(mockSetRecoveryHalted).toHaveBeenLastCalledWith(false);
    expect(mockSignOut).toHaveBeenCalledTimes(2);
  });

  it('ruta 3 (B7 r4): si signOut falla, la sesión no se habilita: pausa sostenida, mensaje visible y reintentar cierra', async () => {
    mockSignOut.mockRejectedValue(new Error('Sin conexión con la red.'));
    const onClose = jest.fn();
    const screen = await renderWithTheme(
      <AuthModal onClose={onClose} visible />,
    );

    fireEvent.press(await screen.findByTestId('auth-modal-open-login'));
    fireEvent.press(await screen.findByTestId('stub-login-forgot'));
    fireEvent.press(await screen.findByTestId('stub-forgot-send'));
    await screen.findByText('recovery');
    fireEvent.press(await screen.findByTestId('stub-verify-success'));
    await screen.findByText('Nueva contraseña');

    fireEvent.press(screen.getByTestId('stub-reset-cancel'));

    // El modal no se oculta, el error queda visible y la pausa se sostiene:
    // la sesión del OTP no puede quedar habilitada.
    await screen.findByText('Sin conexión con la red.');
    expect(onClose).not.toHaveBeenCalled();
    expect(mockSetRecoveryHalted).toHaveBeenLastCalledWith(true);

    // Reintentar con el mismo botón: el signOut llega a término y recién ahí
    // se libera la pausa y se cierra el modal.
    mockSignOut.mockResolvedValue(undefined);
    fireEvent.press(screen.getByTestId('stub-reset-cancel'));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mockSetRecoveryHalted).toHaveBeenLastCalledWith(false);
  });

  it('ruta 4 (B9 r5): cancelación fallida y luego contraseña guardada — termina por éxito: pausa liberada, sesión no cerrada y modal cerrado sin cancelar', async () => {
    mockSignOut.mockRejectedValue(new Error('Sin conexión con la red.'));
    let closeModal: (() => void) | null = null;
    const onCloseSpy = jest.fn();
    function ModalHarness() {
      const [visible, setVisible] = useState(true);
      closeModal = () => setVisible(false);
      return (
        <AuthModal
          onClose={() => {
            onCloseSpy();
            setVisible(false);
          }}
          visible={visible}
        />
      );
    }
    const screen = await renderWithTheme(<ModalHarness />);

    fireEvent.press(await screen.findByTestId('auth-modal-open-login'));
    fireEvent.press(await screen.findByTestId('stub-login-forgot'));
    fireEvent.press(await screen.findByTestId('stub-forgot-send'));
    await screen.findByText('recovery');
    fireEvent.press(await screen.findByTestId('stub-verify-success'));
    await screen.findByText('Nueva contraseña');

    // Cancelar falla: el error queda visible y la pausa se sostiene.
    fireEvent.press(screen.getByTestId('stub-reset-cancel'));
    await screen.findByText('Sin conexión con la red.');
    expect(mockSetRecoveryHalted).toHaveBeenLastCalledWith(true);

    // Guardar la contraseña nueva completa el restablecimiento PESE al error
    // de cancelación pendiente: el éxito termina por una transición distinta
    // (completeRecovery), no vuelve a intentar cerrar la sesión.
    expect(closeModal).not.toBeNull();
    fireEvent.press(screen.getByTestId('stub-reset-success'));
    await waitFor(() => expect(onCloseSpy).toHaveBeenCalledTimes(1));

    // B9: la sesión no se toca (el único signOut fue el intento de cancelar que
    // falló) y la pausa se libera. Aunque `visible` cae, el cierre por éxito no
    // dispara la cancelación de nuevo: la fase ya es `inactive`.
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockSetRecoveryHalted).toHaveBeenLastCalledWith(false);
  });
});
