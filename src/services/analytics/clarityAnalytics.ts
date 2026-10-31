import { NativeModules, Platform } from 'react-native';

const clarityProjectId = 'yyk3h5w44v';

type ClaritySdk = typeof import('@microsoft/react-native-clarity');

let claritySdk: ClaritySdk | null = null;
let initialized = false;
let currentScreenName: string | null = null;

function loadClaritySdk(): ClaritySdk | null {
  // Comprobar antes del require: el SDK crea un emisor nativo al importarse.
  if (
    (Platform.OS !== 'ios' && Platform.OS !== 'android') ||
    !NativeModules.Clarity ||
    (Platform.OS === 'ios' && !NativeModules.ClarityEmitter)
  ) {
    return null;
  }

  // La carga diferida mantiene Expo Go utilizable aunque no incluya el módulo
  // nativo. Metro resuelve este require estático en development/release builds.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  claritySdk ??= require('@microsoft/react-native-clarity') as ClaritySdk;
  return claritySdk;
}

function initializeClarity(): ClaritySdk | null {
  const clarity = loadClaritySdk();
  if (!clarity) return null;

  if (!initialized) {
    clarity.initialize(clarityProjectId, {
      logLevel: clarity.LogLevel.None,
    });
    initialized = true;
  }

  return clarity;
}

export async function setClarityAnalyticsEnabled(
  enabled: boolean,
): Promise<void> {
  // Respetar la desactivación guardada sin iniciar una sesión nueva.
  if (!enabled && !initialized) return;

  const clarity = initializeClarity();
  if (!clarity) return;

  // Juntos no usa Clarity para publicidad. El segundo valor controla la
  // analítica de interacción y se mantiene sincronizado con la preferencia.
  await clarity.consent(false, enabled);

  if (!enabled) {
    await clarity.pause();
    return;
  }

  if (await clarity.isPaused()) {
    await clarity.resume();
  }

  if (currentScreenName) {
    await clarity.setCurrentScreenName(currentScreenName);
  }
}

/**
 * Añade únicamente el nombre técnico de la ruta. Nunca adjunta identificadores
 * de cuenta, importes, títulos de movimientos ni valores introducidos.
 */
export async function trackClarityScreen(screenName: string): Promise<void> {
  currentScreenName = screenName;
  if (!initialized) return;

  const clarity = loadClaritySdk();
  await clarity?.setCurrentScreenName(screenName);
}
