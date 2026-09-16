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

export type NativeGoogleAuthResult =
  | { status: 'success' }
  | { status: 'cancelled' }
  | { status: 'unsupported' }
  | { status: 'error'; message: string };

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

    // En versiones modernas de GoogleSignin el idToken se ubica en data.idToken;
    // se comprueba también la propiedad raíz por compatibilidad defensiva.
    const idToken =
      (response as { data?: { idToken?: string | null } })?.data?.idToken ??
      (response as { idToken?: string | null })?.idToken;

    if (!idToken) {
      return {
        status: 'error',
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
      return {
        status: 'error',
        message:
          'No pudimos verificar tu cuenta de Google. Inténtalo de nuevo.',
      };
    }

    return { status: 'success' };
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    const statusCodes = mod.statusCodes;
    if (code === statusCodes.SIGN_IN_CANCELLED) {
      return { status: 'cancelled' };
    }
    if (code === statusCodes.IN_PROGRESS) {
      return {
        status: 'error',
        message: 'Ya hay un inicio de sesión con Google en curso.',
      };
    }
    if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return {
        status: 'error',
        message:
          'Los servicios de Google Play no están disponibles o requieren actualización.',
      };
    }

    return {
      status: 'error',
      message: 'No pudimos continuar con Google. Inténtalo de nuevo.',
    };
  }
}
