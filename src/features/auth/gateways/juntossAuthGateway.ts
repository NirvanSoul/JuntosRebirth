import { authClient } from '@/lib/auth-client';
import type {
  LoginInput,
  SignUpInput,
  VerifyCodeInput,
} from '@/features/auth/types';
import { unregisterCurrentDeviceFromInvitationPush } from '@/lib/notifications/invitationPushTokenStore';

/**
 * Se lanza cuando la API reporta que la cuenta quedó bloqueada por intentos
 * fallidos (9 intentos, Bible/ROADMAP.md Fase 7, ADR-075). `lockedUntil`
 * permite a la interfaz decir cuándo puede reintentarse.
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
  /**
   * Necesita el correo y el código porque la API los pide junto con la
   * contraseña nueva: verificar el código no abre sesión, precisamente para
   * que tener el código no equivalga a entrar en la cuenta.
   */
  setNewPassword(input: {
    email: string;
    code: string;
    password: string;
  }): Promise<void>;
  signOut(): Promise<void>;
};

type ApiError = { code?: string; message?: string } | null | undefined;

/**
 * Traduce los códigos conocidos de la API a mensajes en español; el resto cae
 * en un mensaje genérico para no filtrar texto en inglés a la interfaz.
 */
function describeAuthError(error: ApiError, fallback: string): string {
  switch (error?.code) {
    case 'INVALID_EMAIL_OR_PASSWORD':
      return 'Correo o contraseña incorrectos.';
    case 'USER_ALREADY_EXISTS':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
      return 'Ya existe una cuenta con este correo.';
    case 'EMAIL_NOT_VERIFIED':
      return 'Confirma tu correo antes de continuar.';
    case 'INVALID_OTP':
    case 'OTP_EXPIRED':
    case 'INVALID_OR_EXPIRED_OTP':
      return 'El código venció o no es válido. Solicita uno nuevo.';
    case 'TOO_MANY_ATTEMPTS':
    case 'TOO_MANY_REQUESTS':
      return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
    case 'PASSWORD_TOO_SHORT':
      return 'La contraseña es demasiado corta. Usa al menos 8 caracteres.';
    case 'PASSWORD_TOO_LONG':
      return 'La contraseña es demasiado larga.';
    case 'INVALID_EMAIL':
      return 'El correo no es válido.';
    case 'VALIDATION_ERROR':
      return 'Revisa el nombre, correo y contraseña e inténtalo de nuevo.';
    case 'UNTRUSTED_ORIGIN':
      return 'Esta versión de prueba no puede crear cuentas. Usa la development build de Juntoss.';
    case 'FAILED_TO_CREATE_USER':
      return 'No pudimos crear la cuenta ahora. Inténtalo de nuevo en unos minutos.';
    case 'USER_NOT_FOUND':
      return 'No encontramos una cuenta con ese correo.';
    default:
      return fallback;
  }
}

/** El bloqueo llega como 429 con la fecha hasta la que dura. */
function readLockout(error: unknown): Date | null {
  if (!error || typeof error !== 'object') return null;
  const candidate = error as { code?: string; lockedUntil?: unknown };
  if (candidate.code !== 'ACCOUNT_LOCKED') return null;
  if (typeof candidate.lockedUntil !== 'string') return null;
  const lockedUntil = new Date(candidate.lockedUntil);
  return Number.isNaN(lockedUntil.getTime()) ? null : lockedUntil;
}

function fail(error: ApiError, fallback: string): never {
  throw new Error(describeAuthError(error, fallback));
}

async function handleAuthRequest<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('Network') ||
        error.message.includes('timed out') ||
        error.message.includes('Network request failed') ||
        error.message.includes('Failed to fetch'))
    ) {
      throw new Error(
        'Tiempo de espera agotado al conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.',
      );
    }
    throw error;
  }
}

export function createJuntossAuthGateway(): AuthGateway {
  return {
    async signUp({ email, password, displayName }) {
      await handleAuthRequest(async () => {
        const { error } = await authClient.signUp.email({
          email,
          password,
          name: displayName,
        });
        if (error) fail(error, 'No pudimos crear tu cuenta.');
      });
    },

    async verifyOtp({ email, token, purpose }) {
      await handleAuthRequest(async () => {
        if (purpose === 'signup') {
          const { error } = await authClient.emailOtp.verifyEmail({
            email,
            otp: token,
          });
          if (error) fail(error, 'No pudimos verificar el código.');
          return;
        }

        // Recuperación: se comprueba el código sin consumirlo, porque la
        // contraseña nueva se envía después junto con él.
        const { error } = await authClient.emailOtp.checkVerificationOtp({
          email,
          otp: token,
          type: 'forget-password',
        });
        if (error) fail(error, 'No pudimos verificar el código.');
      });
    },

    async resendSignUpCode(email) {
      await handleAuthRequest(async () => {
        const { error } = await authClient.emailOtp.sendVerificationOtp({
          email,
          type: 'email-verification',
        });
        if (error) fail(error, 'No pudimos reenviar el código.');
      });
    },

    async resendRecoveryCode(email) {
      await handleAuthRequest(async () => {
        const { error } = await authClient.emailOtp.sendVerificationOtp({
          email,
          type: 'forget-password',
        });
        if (error) fail(error, 'No pudimos reenviar el código.');
      });
    },

    async signInWithPassword({ email, password }) {
      return await handleAuthRequest(async () => {
        const { data, error } = await authClient.signIn.email({
          email,
          password,
        });
        if (error) {
          const lockedUntil = readLockout(error);
          if (lockedUntil) throw new AccountLockedError(lockedUntil);
          fail(error, 'No pudimos iniciar sesión.');
        }
        if (!data?.user?.id) throw new Error('No pudimos iniciar sesión.');
        return { userId: data.user.id };
      });
    },

    async requestPasswordReset(email) {
      await handleAuthRequest(async () => {
        const { error } = await authClient.emailOtp.sendVerificationOtp({
          email,
          type: 'forget-password',
        });
        if (error) fail(error, 'No pudimos enviar el código de recuperación.');
      });
    },

    async setNewPassword({ email, code, password }) {
      await handleAuthRequest(async () => {
        const { error } = await authClient.emailOtp.resetPassword({
          email,
          otp: code,
          password,
        });
        if (error) fail(error, 'No pudimos actualizar tu contraseña.');
      });
    },

    async signOut() {
      // El token push se retira antes de perder la sesión: después ya no
      // habría credenciales para hacerlo.
      await unregisterCurrentDeviceFromInvitationPush().catch(() => undefined);
      await handleAuthRequest(async () => {
        const { error } = await authClient.signOut();
        if (error) fail(error, 'No pudimos cerrar sesión.');
      });
    },
  };
}
