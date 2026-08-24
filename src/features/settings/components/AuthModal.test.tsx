import type { Session } from '@supabase/supabase-js';
import {
  act,
  cleanup,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';
import { type ReactNode, useState } from 'react';

import { AuthModal } from '@/features/settings/components/AuthModal';
import { renderWithTheme } from '@/test/renderWithTheme';

// AuthModal usa AppModal/BottomSheetScrollView reales de gorhom. La cola de
// presentación de BottomSheetModal es global al proceso y sobrevivía al
// `cleanup()` entre tests: con --randomize la hoja del test siguiente no
// montaba el contenido y la suite caía por el orden. Se mockea la librería
// como hace AppModal.test, y el estado queda por instancia.
jest.mock('@gorhom/bottom-sheet', () => {
  const React = jest.requireActual('react');
  const { ScrollView, View } = jest.requireActual('react-native');

  const BottomSheetModal = React.forwardRef(
    (
      { children }: { children?: ReactNode },
      ref: React.ForwardedRef<{
        present: () => void;
        dismiss: () => void;
      }>,
    ) => {
      React.useImperativeHandle(ref, () => ({
        present: jest.fn(),
        dismiss: jest.fn(),
      }));
      return <View>{children}</View>;
    },
  );
  BottomSheetModal.displayName = 'BottomSheetModalMock';

  return {
    BottomSheetModal,
    BottomSheetScrollView: ({ children }: { children?: ReactNode }) => (
      <ScrollView>{children}</ScrollView>
    ),
    BottomSheetView: ({ children }: { children?: ReactNode }) => (
      <View>{children}</View>
    ),
    BottomSheetBackdrop: () => null,
  };
});

jest.mock('@/state/onboarding/useOnboardingStatus', () => ({
  useOnboardingStatus: () => ({ markAuthenticated: jest.fn() }),
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

/** Sesión que `getSession` reporta cuando el `signOut` no llegó a eliminarla. */
const mockOtpSession = {
  user: { id: 'user-1' },
} as unknown as Session;

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
    setRecoveryHold: jest.fn(),
  };
}

let mockGateState = createGateMock();
let mockSetRecoveryHold = mockGateState.setRecoveryHold;

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

describe('AuthModal — cableado de navegación de autenticación', () => {
  // Cada prueba deja cadenas asincronas reales a medio camino (signOut y
  // setNewPassword diferidos) y fireEvent sin await. Se desmonta entre casos y
  // se drena el ámbito de `act`: `cleanup()` es async en RNTL v14, así que
  // primero se espera y después se vacía el act global; lanzar el act antes de
  // que `cleanup()` resolviera producía «overlapping act() calls» y rompía el
  // render de la prueba siguiente —lo que --randomize destapaba como fallos de
  // montaje del modal—.
  afterEach(async () => {
    await cleanup();
    await act(async () => {});
  });

  beforeEach(() => {
    mockGateState = createGateMock();
    mockSetRecoveryHold = mockGateState.setRecoveryHold;
    mockSetNewPassword.mockReset();
    mockSetNewPassword.mockResolvedValue(undefined);
    mockSignOut.mockReset();
    mockSignOut.mockResolvedValue(undefined);
    mockGetSession.mockReset();
    mockGetSession.mockResolvedValue(null);
  });

  it('usa el origen de Ajustes y el progreso extendido al abrir crear cuenta', async () => {
    const screen = await renderWithTheme(
      <AuthModal onClose={jest.fn()} visible />,
    );

    await fireEvent.press(await screen.findByTestId('auth-modal-open-signup'));

    const source = await screen.findByTestId('stub-signup-source');
    expect(source.props.children).toBe('settings-signup');
    const progress = screen.getByTestId('auth-modal-signup-progress');
    expect(progress.props.accessibilityValue.max).toBe(6);
  });

  it('del inicio de sesión lleva a recuperar contraseña', async () => {
    const screen = await renderWithTheme(
      <AuthModal onClose={jest.fn()} visible />,
    );

    await fireEvent.press(await screen.findByTestId('auth-modal-open-login'));
    await fireEvent.press(await screen.findByTestId('stub-login-forgot'));

    expect(await screen.findByText('Recuperar contraseña')).toBeTruthy();
    expect(screen.getByTestId('stub-forgot-screen')).toBeTruthy();
  });

  it('completa la cadena de recuperación hasta nueva contraseña', async () => {
    const screen = await renderWithTheme(
      <AuthModal onClose={jest.fn()} visible />,
    );

    await fireEvent.press(await screen.findByTestId('auth-modal-open-login'));
    await fireEvent.press(await screen.findByTestId('stub-login-forgot'));
    await fireEvent.press(await screen.findByTestId('stub-forgot-send'));

    expect(await screen.findByText('recovery')).toBeTruthy();

    await fireEvent.press(await screen.findByTestId('stub-verify-success'));

    expect(await screen.findByText('Nueva contraseña')).toBeTruthy();
    expect(screen.getByTestId('stub-reset-screen')).toBeTruthy();
  });

  it('desde la verificación de registro, recuperar contraseña lleva al flujo de recuperación', async () => {
    const screen = await renderWithTheme(
      <AuthModal onClose={jest.fn()} visible />,
    );

    await fireEvent.press(await screen.findByTestId('auth-modal-open-signup'));
    await fireEvent.press(await screen.findByTestId('stub-signup-complete'));
    expect(await screen.findByText('signup')).toBeTruthy();

    await fireEvent.press(await screen.findByTestId('stub-verify-go-recovery'));

    expect(await screen.findByText('Recuperar contraseña')).toBeTruthy();
  });

  it('cancelar el restablecimiento cierra la sesión local creada por el OTP (B7)', async () => {
    const screen = await renderWithTheme(
      <AuthModal onClose={jest.fn()} visible />,
    );

    await fireEvent.press(await screen.findByTestId('auth-modal-open-login'));
    await fireEvent.press(await screen.findByTestId('stub-login-forgot'));
    await fireEvent.press(await screen.findByTestId('stub-forgot-send'));
    await screen.findByText('recovery');
    await fireEvent.press(await screen.findByTestId('stub-verify-success'));
    await screen.findByText('Nueva contraseña');

    await fireEvent.press(screen.getByTestId('stub-reset-cancel'));

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledWith('local'));
  });

  it('la pausa legal se sostiene durante todo el episodio y solo cae al terminar (ADR-084)', async () => {
    const screen = await renderWithTheme(
      <AuthModal onClose={jest.fn()} visible />,
    );

    await fireEvent.press(await screen.findByTestId('auth-modal-open-login'));
    await fireEvent.press(await screen.findByTestId('stub-login-forgot'));
    await fireEvent.press(await screen.findByTestId('stub-forgot-send'));
    await screen.findByText('recovery');
    await fireEvent.press(await screen.findByTestId('stub-verify-success'));
    await screen.findByText('Nueva contraseña');

    const holds = mockSetRecoveryHold.mock.calls.map((call) => call[1]);
    expect(holds.slice(holds.indexOf(true))).toEqual([true]);

    await fireEvent.press(screen.getByTestId('stub-reset-cancel'));
    await waitFor(() =>
      expect(mockSetRecoveryHold).toHaveBeenLastCalledWith(
        expect.any(String),
        false,
      ),
    );
    expect(mockSignOut).toHaveBeenCalledWith('local');
  });

  it('la cancelación que falla deja el mensaje visible y el reintento cierra el episodio (ADR-084)', async () => {
    mockSignOut.mockRejectedValueOnce(new Error('Sin conexión con la red.'));
    // El fallo de GoTrue NO eliminó la sesión: `getSession` la sigue viendo.
    mockGetSession.mockResolvedValue(mockOtpSession);
    const onCloseSpy = jest.fn();
    const screen = await renderWithTheme(
      <AuthModal onClose={onCloseSpy} visible />,
    );

    await fireEvent.press(await screen.findByTestId('auth-modal-open-login'));
    await fireEvent.press(await screen.findByTestId('stub-login-forgot'));
    await fireEvent.press(await screen.findByTestId('stub-forgot-send'));
    await fireEvent.press(await screen.findByTestId('stub-verify-success'));
    await screen.findByText('Nueva contraseña');

    await fireEvent.press(screen.getByTestId('stub-reset-cancel'));
    await screen.findByTestId('stub-reset-error');
    expect(onCloseSpy).not.toHaveBeenCalled();
    expect(mockSetRecoveryHold).toHaveBeenLastCalledWith(
      expect.any(String),
      true,
    );

    mockSignOut.mockResolvedValue(undefined);
    // El reintento ya cierra: esta vez la sesión efectivamente desapareció.
    mockGetSession.mockResolvedValue(null);
    await fireEvent.press(screen.getByTestId('stub-reset-cancel'));
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(2));
  });

  it('desde verify-recovery, Atrás vuelve a pedir el código sin abandonar el episodio (ADR-084)', async () => {
    const screen = await renderWithTheme(
      <AuthModal onClose={jest.fn()} visible />,
    );

    await fireEvent.press(await screen.findByTestId('auth-modal-open-login'));
    await fireEvent.press(await screen.findByTestId('stub-login-forgot'));
    await fireEvent.press(await screen.findByTestId('stub-forgot-send'));
    await screen.findByText('recovery');

    await fireEvent.press(screen.getByLabelText('Volver'));

    expect(await screen.findByTestId('stub-forgot-screen')).toBeTruthy();
    expect(mockSetRecoveryHold).toHaveBeenLastCalledWith(
      expect.any(String),
      true,
    );
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('tras un episodio terminado el modal se cierra y se reabre con normalidad (ADR-084)', async () => {
    const onCloseSpy = jest.fn();
    function ModalHarness() {
      const [visible, setVisible] = useState(true);
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

    await fireEvent.press(await screen.findByTestId('auth-modal-open-login'));
    await fireEvent.press(await screen.findByTestId('stub-login-forgot'));
    await fireEvent.press(await screen.findByTestId('stub-forgot-send'));
    await fireEvent.press(await screen.findByTestId('stub-verify-success'));
    await screen.findByText('Nueva contraseña');

    // «Atrás» cancela con destino «volver a login»: el episodio queda en
    // `canceled` y el modal sigue abierto en inicio de sesión.
    await fireEvent.press(screen.getByLabelText('Volver'));
    await screen.findByText('Iniciar sesión');
    expect(onCloseSpy).not.toHaveBeenCalled();

    // Y desde ahí se puede cerrar: con el episodio terminado, pedir otra
    // cancelación sería un no-op del reductor y el modal quedaba atrapado.
    await fireEvent.press(screen.getByLabelText('Volver'));
    await fireEvent.press(await screen.findByTestId('auth-modal-open-login'));
    expect(await screen.findByTestId('stub-login-forgot')).toBeTruthy();
  });

  it('mientras guarda, Cancelar, Atrás y el cierre quedan bloqueados (ADR-084)', async () => {
    let resolveSave: (() => void) | undefined;
    mockSetNewPassword.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );
    const onCloseSpy = jest.fn();
    const screen = await renderWithTheme(
      <AuthModal onClose={onCloseSpy} visible />,
    );

    await fireEvent.press(await screen.findByTestId('auth-modal-open-login'));
    await fireEvent.press(await screen.findByTestId('stub-login-forgot'));
    await fireEvent.press(await screen.findByTestId('stub-forgot-send'));
    await fireEvent.press(await screen.findByTestId('stub-verify-success'));
    await screen.findByText('Nueva contraseña');

    await fireEvent.press(screen.getByTestId('stub-reset-submit'));
    await screen.findByTestId('stub-reset-saving');

    // I1: el chrome está DESHABILITADO accesiblemente, no solo inerte. Se valida
    // con la consulta por rol y estado de RNTL, no con raw props del host.
    expect(
      screen.getByRole('button', { name: 'Volver', disabled: true }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: 'Cancelar restablecimiento',
        disabled: true,
      }),
    ).toBeTruthy();

    // Guardar de nuevo, cancelar y «Atrás»: los tres se ignoran.
    await fireEvent.press(screen.getByTestId('stub-reset-submit'));
    await fireEvent.press(screen.getByTestId('stub-reset-cancel'));
    await fireEvent.press(screen.getByLabelText('Volver'));
    expect(mockSetNewPassword).toHaveBeenCalledTimes(1);
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(onCloseSpy).not.toHaveBeenCalled();

    resolveSave?.();
    await waitFor(() => expect(onCloseSpy).toHaveBeenCalledTimes(1));
    // Terminar nunca cierra la sesión del OTP.
    expect(mockSignOut).not.toHaveBeenCalled();

    // `onClose` es un espía aquí, así que el modal sigue presentado. Se desmonta
    // para que la pila interna de `BottomSheetModal` no impida montar el de la
    // prueba siguiente.
    screen.unmount();
  });

  it('B15: signOut falla pero la sesión ya no existe — la cancelación se completa: destino y pausa liberada sin mensaje de error', async () => {
    mockSignOut.mockRejectedValue(new Error('Sin conexión con la red.'));
    // GoTrue eliminó la sesión local antes de devolver el error (contrato real).
    mockGetSession.mockResolvedValue(null);
    const onCloseSpy = jest.fn();
    const screen = await renderWithTheme(
      <AuthModal onClose={onCloseSpy} visible />,
    );

    await fireEvent.press(await screen.findByTestId('auth-modal-open-login'));
    await fireEvent.press(await screen.findByTestId('stub-login-forgot'));
    await fireEvent.press(await screen.findByTestId('stub-forgot-send'));
    await fireEvent.press(await screen.findByTestId('stub-verify-success'));
    await screen.findByText('Nueva contraseña');

    // «Atrás» cancela con destino «volver a login»: la postcondición dice que
    // la sesión ya no existe, así que la cancelación se completa sin cancelError.
    await fireEvent.press(screen.getByLabelText('Volver'));
    await screen.findByText('Iniciar sesión');
    expect(screen.queryByTestId('stub-reset-error')).toBeNull();
    expect(mockSetRecoveryHold.mock.calls.at(-1)?.[1]).toBe(false);
  });
});
