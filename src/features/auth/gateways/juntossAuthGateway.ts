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

/**
 * Las credenciales son válidas, pero Better Auth no abre una sesión hasta que
 * la persona confirme su correo. Mantener este caso tipado permite llevarla
 * directamente al OTP en lugar de presentarlo como un fallo de contraseña.
 */
export class EmailVerificationRequiredError extends Error {
  email: string;

  constructor(email: string) {
    super(
      'Tu correo aún no está verificado. Confírmalo con el código que te enviamos.',
    );
    this.name = 'EmailVerificationRequiredError';
    this.email = email;
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

type ApiError = {
  code?: string;
  lockedUntil?: unknown;
  message?: string;
};

type RawAuthError = {
  code?: unknown;
  error?: unknown;
  lockedUntil?: unknown;
  message?: unknown;
};

/** Better Auth entrega el cuerpo remoto bajo `error`; normalizamos ambos
 * formatos para que la UI siempre decida por el código estable de la API. */
function normalizeAuthError(error: unknown): ApiError {
  if (!error || typeof error !== 'object') return {};
  const outer = error as RawAuthError;
  const nested =
    outer.error && typeof outer.error === 'object'
      ? (outer.error as RawAuthError)
      : outer;
  return {
    code: typeof nested.code === 'string' ? nested.code : undefined,
    lockedUntil: nested.lockedUntil ?? outer.lockedUntil,
    message: typeof nested.message === 'string' ? nested.message : undefined,
  };
}

/**
 * Traduce los códigos conocidos de la API a mensajes en español; el resto cae
 * en un mensaje genérico para no filtrar texto en inglés a la interfaz.
 */
function describeAuthError(error: ApiError, fallback: string): string {
  switch (error?.code) {
    case 'INVALID_EMAIL_OR_PASSWORD':
    case 'INVALID_PASSWORD':
    case 'INVALID_USER':
    case 'CREDENTIAL_ACCOUNT_NOT_FOUND':
      return 'Correo o contraseña incorrectos.';
    case 'USER_ALREADY_EXISTS':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
      return 'Ya existe una cuenta con este correo. Inicia sesión o recupera tu contraseña.';
    case 'EMAIL_NOT_VERIFIED':
      return 'Confirma tu correo antes de continuar.';
    case 'INVALID_OTP':
    case 'OTP_EXPIRED':
    case 'INVALID_OR_EXPIRED_OTP':
      return 'El código venció o no es válido. Solicita uno nuevo.';
    case 'TOO_MANY_ATTEMPTS':
    case 'TOO_MANY_REQUESTS':
      return 'Has hecho demasiados intentos. Espera unos minutos antes de volver a probar.';
    case 'PASSWORD_TOO_SHORT':
      return 'La contraseña es demasiado corta. Usa al menos 8 caracteres.';
    case 'PASSWORD_TOO_LONG':
      return 'La contraseña es demasiado larga.';
    case 'INVALID_EMAIL':
      return 'El correo no es válido.';
    case 'VALIDATION_ERROR':
      return 'Revisa el nombre, correo y contraseña e inténtalo de nuevo.';
    case 'UNTRUSTED_ORIGIN':
    case 'INVALID_ORIGIN':
      return 'Esta versión de la app no está autorizada para crear cuentas. Actualízala o usa la development build de Juntoss.';
    case 'FAILED_TO_CREATE_USER':
      return 'No pudimos guardar tu cuenta en el servidor. No se ha creado: inténtalo de nuevo en unos minutos.';
    case 'INTERNAL_SERVER_ERROR':
    case 'INTERNAL_ERROR':
      return 'El servidor tuvo un problema temporal al crear la cuenta. No se ha creado: inténtalo de nuevo más tarde.';
    case 'FAILED_TO_CREATE_SESSION':
      return 'Tus datos son correctos, pero el servidor no pudo abrir la sesión. Inténtalo de nuevo en unos minutos.';
    case 'EMAIL_PASSWORD_DISABLED':
      return 'El acceso con correo y contraseña no está disponible temporalmente. Inténtalo de nuevo más tarde.';
    case 'USER_NOT_FOUND':
      return 'No encontramos una cuenta con ese correo.';
    default:
      return fallback;
  }
}

/** El bloqueo llega como 429 con la fecha hasta la que dura. */
function readLockout(error: ApiError): Date | null {
  const candidate = error;
  if (candidate.code !== 'ACCOUNT_LOCKED') return null;
  if (typeof candidate.lockedUntil !== 'string') return null;
  const lockedUntil = new Date(candidate.lockedUntil);
  return Number.isNaN(lockedUntil.getTime()) ? null : lockedUntil;
}

function fail(error: ApiError, fallback: string): never {
  throw new Error(describeAuthError(error, fallback));
}

function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('network') ||
    message.includes('failed to fetch') ||
    message.includes('timed out') ||
    message.includes('timeout') ||
    message.includes('load failed')
  );
}

async function handleAuthRequest<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isNetworkError(error)) {
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
        if (error) {
          fail(
            normalizeAuthError(error),
            'No pudimos crear tu cuenta porque el servidor no indicó la causa. Comprueba tu conexión e inténtalo de nuevo.',
          );
        }
        // El backend tiene `sendVerificationOnSignUp: true`: este único alta
        // ya emite el OTP. Enviarlo otra vez lo rota, consume el rate limit y
        // puede dejar a la persona con un código distinto al que recibió.
      });
    },

    async verifyOtp({ email, token, purpose }) {
      await handleAuthRequest(async () => {
        if (purpose === 'signup') {
          const { error } = await authClient.emailOtp.verifyEmail({
            email,
            otp: token,
          });
          if (error)
            fail(normalizeAuthError(error), 'No pudimos verificar el código.');
          return;
        }

        // Recuperación: se comprueba el código sin consumirlo, porque la
        // contraseña nueva se envía después junto con él.
        const { error } = await authClient.emailOtp.checkVerificationOtp({
          email,
          otp: token,
          type: 'forget-password',
        });
        if (error)
          fail(normalizeAuthError(error), 'No pudimos verificar el código.');
      });
    },

    async resendSignUpCode(email) {
      await handleAuthRequest(async () => {
        const { error } = await authClient.emailOtp.sendVerificationOtp({
          email,
          type: 'email-verification',
        });
        if (error)
          fail(normalizeAuthError(error), 'No pudimos reenviar el código.');
      });
    },

    async resendRecoveryCode(email) {
      await handleAuthRequest(async () => {
        const { error } = await authClient.emailOtp.sendVerificationOtp({
          email,
          type: 'forget-password',
        });
        if (error)
          fail(normalizeAuthError(error), 'No pudimos reenviar el código.');
      });
    },

    async signInWithPassword({ email, password }) {
      return await handleAuthRequest(async () => {
        const { data, error } = await authClient.signIn.email({
          email,
          password,
        });
        if (error) {
          const normalizedError = normalizeAuthError(error);
          const lockedUntil = readLockout(normalizedError);
          if (lockedUntil) throw new AccountLockedError(lockedUntil);
          if (normalizedError.code === 'EMAIL_NOT_VERIFIED') {
            throw new EmailVerificationRequiredError(email);
          }
          fail(normalizedError, 'No pudimos iniciar sesión.');
        }
        if (!data?.user?.id) {
          throw new Error(
            'No recibimos una confirmación de sesión del servidor. Comprueba tu conexión e inténtalo de nuevo.',
          );
        }
        return { userId: data.user.id };
      });
    },

    async requestPasswordReset(email) {
      await handleAuthRequest(async () => {
        const { error } = await authClient.emailOtp.sendVerificationOtp({
          email,
          type: 'forget-password',
        });
        if (error)
          fail(
            normalizeAuthError(error),
            'No pudimos enviar el código de recuperación.',
          );
      });
    },

    async setNewPassword({ email, code, password }) {
      await handleAuthRequest(async () => {
        const { error } = await authClient.emailOtp.resetPassword({
          email,
          otp: code,
          password,
        });
        if (error)
          fail(
            normalizeAuthError(error),
            'No pudimos actualizar tu contraseña.',
          );
      });
    },

    async signOut() {
      // El token push se retira antes de perder la sesión: después ya no
      // habría credenciales para hacerlo.
      await unregisterCurrentDeviceFromInvitationPush().catch(() => undefined);
      await handleAuthRequest(async () => {
        const { error } = await authClient.signOut();
        if (error) fail(normalizeAuthError(error), 'No pudimos cerrar sesión.');
      });
    },
  };
}
