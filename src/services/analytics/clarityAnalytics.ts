const clarityProjectId = 'yyk3h5w44v';

type ClaritySdk = typeof import('@microsoft/react-native-clarity');

let claritySdk: ClaritySdk | null = null;
let initialized = false;
let currentScreenName: string | null = null;

function loadClaritySdk(): ClaritySdk {
  // La carga diferida mantiene Expo Go utilizable aunque no incluya el módulo
  // nativo. Metro resuelve este require estático en development/release builds.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  claritySdk ??= require('@microsoft/react-native-clarity') as ClaritySdk;
  return claritySdk;
}

function initializeClarity(): ClaritySdk {
  const clarity = loadClaritySdk();

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
  // No cargar ni inicializar el SDK antes de que exista consentimiento. Así una
  // instalación nueva no abre siquiera una sesión que después haya que pausar.
  if (!enabled && !initialized) return;

  const clarity = initializeClarity();

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
  await clarity.setCurrentScreenName(screenName);
}
