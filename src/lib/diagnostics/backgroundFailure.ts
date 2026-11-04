const nativeNetworkMessage =
  /network request failed|network connection was lost|fetch failed|failed to fetch|load failed|networkerror|internet connection appears to be offline/i;

/**
 * `true` cuando el fallo se debe a no tener red: el `NETWORK_ERROR` que ya
 * normaliza el cliente de la API, un `fetch` nativo cortado o una petición
 * abortada por el tiempo máximo. Se reconoce por forma, sin importar
 * `ApiError`, para que cualquier capa pueda consultarlo.
 */
export function isNetworkFailure(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as {
    code?: unknown;
    message?: unknown;
    name?: unknown;
  };
  if (candidate.code === 'NETWORK_ERROR') return true;
  if (candidate.name === 'SyntaxError') return false;
  if (candidate.name === 'AbortError') return true;
  return (
    typeof candidate.message === 'string' &&
    nativeNetworkMessage.test(candidate.message)
  );
}

/**
 * Registra el fallo de una tarea de fondo (sincronizar, refrescar el censo,
 * publicar el perfil…), salvo que sea por falta de red.
 *
 * Sin conexión esos fallos son lo esperado: la caché sigue en pantalla y el
 * aviso global "Sin conexión" ya se lo explica a la persona. Registrarlos
 * como error solo llenaba la consola (y la caja roja de desarrollo) cada vez
 * que se abría la app sin cobertura.
 */
export function reportBackgroundFailure(
  message: string,
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (isNetworkFailure(error)) return;
  console.error(message, context ? { ...context, error } : error);
}
