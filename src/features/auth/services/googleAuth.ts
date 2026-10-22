import { TurboModuleRegistry } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { googleAuthConfig } from '@/features/auth/config/google';
import { authClient } from '@/lib/auth-client';

type GoogleSigninModule =
  typeof import('@react-native-google-signin/google-signin');

let cachedGoogleSigninModule: GoogleSigninModule | null = null;
let isConfigured = false;

let overrideSupportedForTest: boolean | null = null;

export function __setGoogleSigninSupportedForTest(
  supported: boolean | null,
): void {
  overrideSupportedForTest = supported;
}

/** Permite restablecer el estado en suites de prueba. */
export function __resetGoogleSigninForTest(): void {
  cachedGoogleSigninModule = null;
  isConfigured = false;
  overrideSupportedForTest = null;
}

/**
 * Comprueba de forma segura si el módulo nativo `RNGoogleSignin`
 * está disponible en el binario nativo de la ejecución actual.
 * Evita que TurboModuleRegistry.getEnforcing() lance Invariant Violation
 * en Expo Go o antes de recompilar la build de desarrollo.
 */
export function isGoogleSigninNativeSupported(): boolean {
  if (overrideSupportedForTest !== null) {
    return overrideSupportedForTest;
  }
  if (process.env.NODE_ENV === 'test') {
    return true;
  }
  try {
    return TurboModuleRegistry.get('RNGoogleSignin') != null;
  } catch {
    return false;
  }
}

export function getGoogleSigninModule(): GoogleSigninModule | null {
  if (cachedGoogleSigninModule) return cachedGoogleSigninModule;
  if (!isGoogleSigninNativeSupported()) return null;

  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const mod =
      require('@react-native-google-signin/google-signin') as GoogleSigninModule;
    /* eslint-enable @typescript-eslint/no-require-imports */
    cachedGoogleSigninModule = mod;
    return cachedGoogleSigninModule;
  } catch {
    return null;
  }
}

/**
 * Asegura que GoogleSignin esté configurado con el webClientId y iosClientId correspondientes.
 * Se invoca automáticamente antes de iniciar sesión nativa.
 */
export function configureGoogleSignIn(): void {
  if (isConfigured) return;
  if (!isGoogleSigninNativeSupported()) return;
  const mod = getGoogleSigninModule();
  if (!mod) return;

  try {
    mod.GoogleSignin.configure({
      iosClientId: googleAuthConfig.iosClientId,
      webClientId: googleAuthConfig.webClientId,
    });
    isConfigured = true;
  } catch {
    // Falla de forma silenciosa si el entorno nativo no está enlazado.
  }
}

/**
 * Precarga y calienta de forma anticipada el módulo del navegador del sistema
 * y la configuración del SDK nativo de Google (por ejemplo, al montar el onboarding o
 * durante el arranque de la app) para reducir la latencia cuando el usuario pulse el botón.
 */
export function warmUpAuthSession(): void {
  try {
    void WebBrowser.warmUpAsync().catch(() => undefined);
    configureGoogleSignIn();
  } catch {
    // Falla de forma silenciosa para entornos donde los módulos nativos no estén enlazados.
  }
}

/**
 * Libera las conexiones y recursos enlazados por el navegador cuando se desmonta la vista.
 */
export function coolDownAuthSession(): void {
  try {
    void WebBrowser.coolDownAsync().catch(() => undefined);
  } catch {
    // Falla de forma silenciosa.
  }
}

type GoogleAuthFailureCode =
  | 'account_not_linked'
  | 'configuration'
  | 'in_progress'
  | 'invalid_token'
  | 'missing_token'
  | 'play_services'
  | 'provider'
  | 'server';

export type NativeGoogleAuthResult =
  | { status: 'success' }
  | { status: 'cancelled' }
  | { status: 'unsupported' }
  | {
      status: 'error';
      code: GoogleAuthFailureCode;
      message: string;
    };

function providerErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' || typeof code === 'number'
    ? String(code)
    : null;
}

function providerErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const message = (error as { message?: unknown }).message;
  return typeof message === 'string' ? message : null;
}

function authErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const record = error as Record<string, unknown>;
  if (typeof record.code === 'string') return record.code;
  return authErrorCode(record.error);
}

function reportFailure(
  stage: 'native' | 'server',
  code: GoogleAuthFailureCode,
  providerCode: string | null,
): void {
  // Nunca registrar el ID token, el correo ni el objeto original: solo datos
  // operativos suficientes para distinguir configuración, proveedor y API.
  console.error('[google-auth] No se pudo completar el acceso', {
    code,
    providerCode,
    stage,
  });
}

/**
 * Ejecuta el flujo nativo de Google Sign-In:
 * 1. Abre el selector de cuentas del sistema operativo (0 ms y sin alerta de navegador en iOS).
 * 2. Extrae el idToken.
 * 3. Valida y autentica directamente con Better Auth enviando el idToken.
 */
export async function signInWithGoogleNative(): Promise<NativeGoogleAuthResult> {
  if (!isGoogleSigninNativeSupported()) {
    return { status: 'unsupported' };
  }

  const mod = getGoogleSigninModule();
  if (!mod) {
    return { status: 'unsupported' };
  }

  try {
    configureGoogleSignIn();
    await mod.GoogleSignin.hasPlayServices();
    const response = await mod.GoogleSignin.signIn();

    // Desde v16 el SDK convierte la cancelación nativa en un resultado; no
    // siempre rechaza la promesa con SIGN_IN_CANCELLED.
    if (response.type === 'cancelled') {
      return { status: 'cancelled' };
    }

    // En versiones modernas de GoogleSignin el idToken se ubica en data.idToken;
    // se comprueba también la propiedad raíz por compatibilidad defensiva.
    const idToken =
      (response as { data?: { idToken?: string | null } })?.data?.idToken ??
      (response as { idToken?: string | null })?.idToken;

    if (!idToken) {
      reportFailure('native', 'missing_token', null);
      return {
        status: 'error',
        code: 'missing_token',
        message: 'No se recibió la confirmación de identidad de Google.',
      };
    }

    const result = await authClient.signIn.social({
      provider: 'google',
      idToken: {
        token: idToken,
      },
    });

    if (result.error) {
      const code = authErrorCode(result.error);

      if (code === 'SOCIAL_ACCOUNT_NOT_LINKED') {
        reportFailure('server', 'account_not_linked', code);
        return {
          status: 'error',
          code: 'account_not_linked',
          message:
            'Ya tienes una cuenta con este correo. Entra con tu email y contraseña para vincular Google.',
        };
      }

      if (code === 'INVALID_SOCIAL_TOKEN') {
        reportFailure('server', 'invalid_token', code);
        return {
          status: 'error',
          code: 'invalid_token',
          message:
            'Esta versión de Juntos no pudo validar tu cuenta de Google. Actualiza la app o contacta con soporte.',
        };
      }

      reportFailure('server', 'server', code);
      return {
        status: 'error',
        code: 'server',
        message:
          'No pudimos verificar tu cuenta de Google. Inténtalo de nuevo.',
      };
    }

    return { status: 'success' };
  } catch (error: unknown) {
    const code = providerErrorCode(error);
    const message = providerErrorMessage(error);
    const statusCodes = mod.statusCodes;
    if (code === statusCodes.SIGN_IN_CANCELLED) {
      return { status: 'cancelled' };
    }
    if (code === statusCodes.IN_PROGRESS) {
      return {
        status: 'error',
        code: 'in_progress',
        message: 'Ya hay un inicio de sesión con Google en curso.',
      };
    }
    if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return {
        status: 'error',
        code: 'play_services',
        message:
          'Los servicios de Google Play no están disponibles o requieren actualización.',
      };
    }

    // Google Play Services usa el código numérico 10 para DEVELOPER_ERROR:
    // package y/o SHA-1 no coinciden con un cliente OAuth Android autorizado.
    if (code === '10' || message?.includes('DEVELOPER_ERROR')) {
      reportFailure('native', 'configuration', code);
      return {
        status: 'error',
        code: 'configuration',
        message:
          'Esta versión de Juntos no está autorizada correctamente para usar Google. Actualiza la app o contacta con soporte.',
      };
    }

    reportFailure('native', 'provider', code);
    return {
      status: 'error',
      code: 'provider',
      message: 'No pudimos continuar con Google. Inténtalo de nuevo.',
    };
  }
}
