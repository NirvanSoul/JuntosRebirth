import type { Session } from '@supabase/supabase-js';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { useState } from 'react';

import { AuthModal } from '@/features/settings/components/AuthModal';
import { renderWithTheme } from '@/test/renderWithTheme';

jest.mock('@/state/onboarding/useOnboardingStatus', () => ({
  useOnboardingStatus: () => ({ markAuthenticated: jest.fn() }),
}));

const mockSignOut = jest.fn();
const mockGetSession = jest.fn();
jest.mock('@/features/auth/gateways/supabaseAuthGateway', () => ({
  createSupabaseAuthGateway: () => ({
    getSession: mockGetSession,
    signOut: mockSignOut,
  }),
}));

/** Sesión que `getSession` reporta cuando el `signOut` no la eliminó. */
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

/**
 * B13(r8): con una cancelación en vuelo, terminar el restablecimiento encola la
 * terminación, pero el host NO puede ejecutar su destino de éxito por
 * adelantado. La resolución del hook gobierna también la navegación: cada
 * carrera termina en exactamente un destino.
 */
describe('AuthModal — la resolución gobierna el destino del host (B13)', () => {
  let resolveSignOut: (() => void) | undefined;
  let onCloseSpy: jest.Mock;

  beforeEach(() => {
    mockGateState = createGateMock();
    mockSetRecoveryHalted = mockGateState.setRecoveryHalted;
    resolveSignOut = undefined;
    onCloseSpy = jest.fn();
    mockSignOut.mockReset();
    mockSignOut.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSignOut = resolve;
        }),
    );
    mockGetSession.mockReset();
    mockGetSession.mockResolvedValue(null);
  });

  /**
   * Lleva el modal hasta «nueva contraseña», lanza una cancelación que queda en
   * vuelo (signOut diferido) y guarda la contraseña: la terminación queda
   * encolada y la carrera sin resolver.
   */
  async function arrangeHostRace() {
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

    fireEvent.press(await screen.findByTestId('auth-modal-open-login'));
    fireEvent.press(await screen.findByTestId('stub-login-forgot'));
    fireEvent.press(await screen.findByTestId('stub-forgot-send'));
    fireEvent.press(await screen.findByTestId('stub-verify-success'));
    await screen.findByTestId('stub-reset-screen');

    // Cancelación en vuelo: el signOut no resuelve todavía.
    fireEvent.press(screen.getByTestId('stub-reset-cancel'));
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));

    // La contraseña se guarda con la cancelación aún sin resolver.
    fireEvent.press(screen.getByTestId('stub-reset-success'));

    // El núcleo de B13: el destino de éxito NO puede ejecutarse aquí. Mientras
    // la carrera no se resuelva, nadie sabe si ganó la terminación.
    expect(onCloseSpy).not.toHaveBeenCalled();
    return screen;
  }

  /**
   * Resuelve el `signOut` y deja que la cadena `signOut → getSession → destino`
   * avance. Sin `act` propio a propósito: `fireEvent` y `waitFor` ya gestionan
   * el suyo, y anidar otro solapaba ámbitos —«overlapping act() calls»— y
   * corrompía la cola de React, de modo que el render de la prueba siguiente
   * dejaba de montar el modal.
   */
  function settleRace() {
    resolveSignOut?.();
  }

  it('sesión nula: gana la cancelación y el destino se ejecuta una sola vez', async () => {
    mockGetSession.mockResolvedValue(null);
    const screen = await arrangeHostRace();

    settleRace();

    await waitFor(() => expect(onCloseSpy).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Sin conexión con la red.')).toBeNull();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('sesión presente: gana la terminación y el destino se ejecuta una sola vez, nunca antes de resolver', async () => {
    mockGetSession.mockResolvedValue(mockOtpSession);
    await arrangeHostRace();

    settleRace();

    await waitFor(() => expect(onCloseSpy).toHaveBeenCalledTimes(1));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  // Única que termina con el modal abierto y la fase en `cancelError`: es justo
  // la garantía que afirma —el fallo tiene que quedar delante de la persona—.
  it('getSession falla: el modal sigue visible, el error se ve, no se cierra y no se reintenta solo', async () => {
    mockGetSession.mockRejectedValue(new Error('Sin conexión con la red.'));
    const screen = await arrangeHostRace();

    settleRace();

    await screen.findByText('Sin conexión con la red.');
    expect(screen.getByTestId('auth-modal')).toBeTruthy();
    expect(onCloseSpy).not.toHaveBeenCalled();
    // Sin reintento automático: el efecto de cierre forzado no puede relanzar
    // la cancelación a espaldas de la persona.
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockSetRecoveryHalted).toHaveBeenLastCalledWith(true);
  });
});
