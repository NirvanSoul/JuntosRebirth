import type { Session } from '@supabase/supabase-js';
import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { AcceptInvitationScreen } from '@/features/spaces/screens/AcceptInvitationScreen';
import { renderWithTheme } from '@/test/renderWithTheme';

/**
 * El mock de sesión usa estado real de React y expone su setter, de modo que
 * la prueba reproduce la transición que Supabase garantiza: el OTP de
 * recuperación crea una sesión a mitad del flujo y el cierre local la borra.
 * Congelar `session: null` durante todo el recorrido fue lo que ocultó que esa
 * sesión disparaba la autoaceptación y ocultaba `ResetPasswordScreen`.
 */
let mockSetSession: ((session: Session | null) => void) | null = null;

jest.mock('@/features/auth/hooks/useAuthSession', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    useAuthSession: () => {
      const [session, setSession] = React.useState<Session | null>(null);
      mockSetSession = setSession;
      return { isReady: true, session, userId: session?.user.id ?? null };
    },
  };
});

const mockAcceptInvitation = jest.fn();
jest.mock('@/features/spaces/gateways/supabaseInvitationGateway', () => ({
  AcceptInvitationError: class AcceptInvitationError extends Error {},
  createSupabaseInvitationGateway: () => ({
    acceptInvitation: mockAcceptInvitation,
    getInvitationPreview: jest.fn().mockResolvedValue({
      invitedEmailMasked: 'pe***@ejemplo.com',
      inviterDisplayName: 'Alex',
      spaceName: 'Nuestro hogar',
      status: 'pending',
    }),
  }),
}));

const mockSignOut = jest.fn();
jest.mock('@/features/auth/gateways/supabaseAuthGateway', () => ({
  createSupabaseAuthGateway: () => ({ signOut: mockSignOut }),
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

function createOtpSession(userId: string): Session {
  return {
    access_token: `access-token-${userId}`,
    refresh_token: 'refresh-token',
    expires_at: 9999999999,
    token_type: 'bearer',
    user: {
      id: userId,
      email: 'persona@ejemplo.com',
      app_metadata: {},
      user_metadata: { display_name: 'Persona' },
      aud: 'authenticated',
      created_at: '2026-01-01T00:00:00.000Z',
    },
  } as unknown as Session;
}

async function aparecerSesion(session: Session) {
  await act(async () => {
    mockSetSession?.(session);
  });
}

describe('AcceptInvitationScreen — cableado de autenticación', () => {
  beforeEach(() => {
    mockSetSession = null;
    mockAcceptInvitation.mockReset();
    mockAcceptInvitation.mockResolvedValue({ spaceName: 'Nuestro hogar' });
    mockSignOut.mockReset();
    mockSignOut.mockResolvedValue(undefined);
  });

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

  async function llegarAlRestablecimientoConSesion() {
    const screen = await renderInvitation();
    await fireEvent.press(screen.getByTestId('stub-login-forgot'));
    await screen.findByTestId('stub-forgot-screen');
    await fireEvent.press(screen.getByTestId('stub-forgot-send'));
    await screen.findByText('recovery');
    // La sesión llega antes de devolver el éxito de la verificación.
    await aparecerSesion(createOtpSession('user-recovery'));

    // Comprobar que sigue en verify-recovery, sin autoaceptar
    expect(screen.getByText('recovery')).toBeTruthy();
    expect(screen.queryByTestId('stub-reset-screen')).toBeFalsy();

    // Pulsar el éxito de verificación
    await fireEvent.press(screen.getByTestId('stub-verify-success'));

    // Comprobar que aparece y permanece ResetPasswordScreen
    await screen.findByTestId('stub-reset-screen');
    expect(screen.queryByText('recovery')).toBeFalsy();
    return screen;
  }

  it('lleva de iniciar sesión a crear cuenta y a la verificación de registro', async () => {
    const screen = await renderInvitation();

    await fireEvent.press(screen.getByTestId('stub-login-signup'));
    expect(await screen.findByTestId('stub-signup-screen')).toBeTruthy();

    await fireEvent.press(await screen.findByTestId('stub-signup-complete'));
    expect(await screen.findByText('signup')).toBeTruthy();
  });

  it('en la verificación de registro, iniciar sesión vuelve al inicio de sesión', async () => {
    const screen = await renderInvitation();

    await fireEvent.press(screen.getByTestId('stub-login-signup'));
    await fireEvent.press(await screen.findByTestId('stub-signup-complete'));

    await fireEvent.press(await screen.findByTestId('stub-verify-go-login'));

    expect(await screen.findByTestId('stub-login-screen')).toBeTruthy();
  });

  it('desde la verificación de registro, recuperar contraseña entra en la recuperación', async () => {
    const screen = await renderInvitation();

    await fireEvent.press(screen.getByTestId('stub-login-signup'));
    await fireEvent.press(await screen.findByTestId('stub-signup-complete'));

    await fireEvent.press(await screen.findByTestId('stub-verify-go-recovery'));

    expect(await screen.findByTestId('stub-forgot-screen')).toBeTruthy();
  });

  it('desde el inicio de sesión recorre recuperar, verificar y nueva contraseña', async () => {
    const screen = await renderInvitation();

    await fireEvent.press(screen.getByTestId('stub-login-forgot'));
    expect(await screen.findByTestId('stub-forgot-screen')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('stub-forgot-send'));
    expect(await screen.findByText('recovery')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('stub-verify-success'));

    expect(await screen.findByTestId('stub-reset-screen')).toBeTruthy();
  });

  describe('recuperación con la sesión creada por el OTP', () => {
    it('la sesión del OTP no autoacepta: se llega y permanece en la nueva contraseña', async () => {
      const screen = await llegarAlRestablecimientoConSesion();

      // Con la sesión ya presente, sigue en el restablecimiento: la pausa de
      // recuperación evita el cortocircuito de sesión y la autoaceptación.
      expect(screen.getByTestId('stub-reset-screen')).toBeTruthy();
      expect(mockAcceptInvitation).not.toHaveBeenCalled();
    });

    it('completar el restablecimiento libera la pausa y acepta exactamente una vez', async () => {
      const screen = await llegarAlRestablecimientoConSesion();

      await fireEvent.press(screen.getByTestId('stub-reset-success'));

      await waitFor(() =>
        expect(mockAcceptInvitation).toHaveBeenCalledTimes(1),
      );
      expect(await screen.findByTestId('accept-invitation-done')).toBeTruthy();
    });

    it('cancelar tras el OTP cierra solo la sesión local y vuelve al login sin aceptar', async () => {
      const screen = await llegarAlRestablecimientoConSesion();
      mockSignOut.mockImplementation(async () => {
        // El cierre local deja sin sesión este dispositivo, como en Supabase.
        mockSetSession?.(null);
      });

      await fireEvent.press(screen.getByTestId('stub-reset-cancel'));

      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(mockSignOut).toHaveBeenCalledWith('local');
      expect(await screen.findByTestId('stub-login-screen')).toBeTruthy();
      expect(mockAcceptInvitation).not.toHaveBeenCalled();
    });

    it('si el cierre local falla, conserva el subflujo, muestra el error y no acepta', async () => {
      const screen = await llegarAlRestablecimientoConSesion();
      mockSignOut.mockRejectedValue(new Error('No pudimos cerrar sesión.'));

      await fireEvent.press(screen.getByTestId('stub-reset-cancel'));

      expect(await screen.findByText('No pudimos cerrar sesión.')).toBeTruthy();
      expect(screen.getByTestId('stub-reset-screen')).toBeTruthy();
      expect(mockAcceptInvitation).not.toHaveBeenCalled();
    });

    it('la sesión creada por el registro conserva la autoaceptación', async () => {
      const screen = await renderInvitation();

      await fireEvent.press(screen.getByTestId('stub-login-signup'));
      await screen.findByTestId('stub-signup-screen');
      await fireEvent.press(screen.getByTestId('stub-signup-complete'));
      await screen.findByText('signup');

      // El OTP de registro crea la sesión: la autoaceptación sigue viva.
      await aparecerSesion(createOtpSession('user-signup'));

      await waitFor(() =>
        expect(mockAcceptInvitation).toHaveBeenCalledTimes(1),
      );
      expect(await screen.findByTestId('accept-invitation-done')).toBeTruthy();
    });
  });
});
