import type { AuthError, Session, SupabaseClient } from '@supabase/supabase-js';

import type {
  LoginInput,
  SignUpInput,
  VerifyCodeInput,
} from '@/features/auth/types';
import { getConfiguredSupabaseClient } from '@/lib/supabase/supabaseClient';

/**
 * Se lanza cuando `login-with-lockout` reporta que la cuenta quedó
 * bloqueada (9 intentos fallidos, Bible/ROADMAP.md Fase 7, ADR-075).
 * `lockedUntil` permite a la UI mostrar cuándo puede reintentar.
 */
export class AccountLockedError extends Error {
  lockedUntil: Date;

  constructor(lockedUntil: Date) {
    super(
      'Por tu seguridad, debes esperar 1 hora antes de volver a intentarlo.',
    );
    this.name = 'AccountLockedError';
    this.lockedUntil = lockedUntil;
  }
}

export type AuthGateway = {
  signUp(input: SignUpInput): Promise<void>;
  verifyOtp(input: VerifyCodeInput): Promise<void>;
  resendSignUpCode(email: string): Promise<void>;
  resendRecoveryCode(email: string): Promise<void>;
  signInWithPassword(input: LoginInput): Promise<{ userId: string }>;
  requestPasswordReset(email: string): Promise<void>;
  setNewPassword(password: string): Promise<void>;
  signOut(): Promise<void>;
  getSession(): Promise<Session | null>;
  onAuthStateChange(callback: (session: Session | null) => void): {
    unsubscribe: () => void;
  };
};

/**
 * Traduce los códigos de error conocidos de GoTrue a mensajes en español; el
 * resto cae en un mensaje genérico para no filtrar texto de la API en inglés
 * a la interfaz.
 */
function describeAuthError(error: AuthError, fallback: string): string {
  switch (error.code) {
    case 'invalid_credentials':
      return 'Correo o contraseña incorrectos.';
    case 'user_already_exists':
    case 'email_exists':
    case 'identity_already_exists':
      return 'Ya existe una cuenta con este correo.';
    case 'email_not_confirmed':
      return 'Confirma tu correo antes de continuar.';
    case 'otp_expired':
      return 'El código venció o no es válido. Solicita uno nuevo.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
    case 'weak_password':
      return 'La contraseña es demasiado débil. Usa al menos 8 caracteres.';
    case 'same_password':
      return 'La nueva contraseña debe ser distinta a la anterior.';
    case 'user_not_found':
      return 'No encontramos una cuenta con ese correo.';
    case 'signup_disabled':
    case 'email_provider_disabled':
      return 'El registro por correo no está disponible en este momento.';
    default:
      return fallback;
  }
}

async function readFunctionErrorBody(
  response: Response | undefined,
): Promise<{ error?: string; lockedUntil?: string } | null> {
  if (!response) return null;
  try {
    const body: unknown = await response.clone().json();
    if (body && typeof body === 'object') {
      return body as { error?: string; lockedUntil?: string };
    }
  } catch {
    // El cuerpo no era JSON legible: se trata como error desconocido.
  }
  return null;
}

export function createSupabaseAuthGateway(
  client: SupabaseClient = getConfiguredSupabaseClient(),
): AuthGateway {
  return {
    async signUp({ email, password, displayName }) {
      const { error } = await client.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });
      if (error) {
        throw new Error(
          describeAuthError(error, 'No pudimos crear tu cuenta.'),
        );
      }
    },

    async verifyOtp({ email, token, purpose }) {
      const { error } = await client.auth.verifyOtp({
        email,
        token,
        type: purpose,
      });
      if (error) {
        throw new Error(
          describeAuthError(error, 'No pudimos verificar el código.'),
        );
      }
    },

    async resendSignUpCode(email) {
      const { error } = await client.auth.resend({ type: 'signup', email });
      if (error) {
        throw new Error(
          describeAuthError(error, 'No pudimos reenviar el código.'),
        );
      }
    },

    async resendRecoveryCode(email) {
      // `resend()` solo cubre 'signup' y 'email_change'; para recuperación
      // volver a pedir el código es, literalmente, volver a llamar a
      // `resetPasswordForEmail`.
      const { error } = await client.auth.resetPasswordForEmail(email);
      if (error) {
        throw new Error(
          describeAuthError(error, 'No pudimos reenviar el código.'),
        );
      }
    },

    async signInWithPassword({ email, password }) {
      const { data, error, response } = await client.functions.invoke(
        'login-with-lockout',
        { body: { email, password } },
      );

      if (error) {
        const body = await readFunctionErrorBody(response);
        if (body?.error === 'locked' && typeof body.lockedUntil === 'string') {
          throw new AccountLockedError(new Date(body.lockedUntil));
        }
        if (body?.error === 'invalid_credentials') {
          throw new Error('Correo o contraseña incorrectos.');
        }
        throw new Error('No pudimos iniciar sesión.');
      }

      const result = data as {
        session?: { access_token?: string; refresh_token?: string };
        userId?: string;
      } | null;
      if (
        !result?.session?.access_token ||
        !result.session.refresh_token ||
        !result.userId
      ) {
        throw new Error('No pudimos iniciar sesión.');
      }

      const { error: setSessionError } = await client.auth.setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
      });
      if (setSessionError) {
        throw new Error(
          describeAuthError(setSessionError, 'No pudimos iniciar sesión.'),
        );
      }

      return { userId: result.userId };
    },

    async requestPasswordReset(email) {
      const { error } = await client.auth.resetPasswordForEmail(email);
      if (error) {
        throw new Error(
          describeAuthError(
            error,
            'No pudimos enviar el código de recuperación.',
          ),
        );
      }
    },

    async setNewPassword(password) {
      const { error } = await client.auth.updateUser({ password });
      if (error) {
        throw new Error(
          describeAuthError(error, 'No pudimos actualizar tu contraseña.'),
        );
      }
    },

    async signOut() {
      const { error } = await client.auth.signOut();
      if (error) {
        throw new Error(describeAuthError(error, 'No pudimos cerrar sesión.'));
      }
    },

    async getSession() {
      const { data, error } = await client.auth.getSession();
      if (error) {
        throw new Error(
          describeAuthError(error, 'No pudimos recuperar tu sesión.'),
        );
      }
      return data.session;
    },

    onAuthStateChange(callback) {
      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((_event, session) => {
        callback(session);
      });
      return { unsubscribe: () => subscription.unsubscribe() };
    },
  };
}
