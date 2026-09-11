export type StartupMark =
  | 'bundle_evaluated'
  | 'fonts_ready'
  | 'session_ready'
  | 'local_finance_ready'
  | 'init_done';

const marks = new Map<StartupMark, number>();

/**
 * Registra una marca temporal del proceso de arranque de la aplicación.
 *
 * - Solo está activo en desarrollo (`__DEV__`). En producción es un no-op inmediato.
 * - Idempotente: la primera llamada para una misma marca prevalece.
 * - Al registrar `init_done`, vuelca automáticamente el reporte diagnóstico
 *   con los deltas relativos al inicio de la evaluación del bundle.
 */
export function markStartup(mark: StartupMark): void {
  if (typeof __DEV__ !== 'undefined' && !__DEV__) {
    return;
  }
  if (marks.has(mark)) {
    return;
  }

  const now =
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();

  marks.set(mark, now);

  if (mark === 'init_done') {
    reportStartupTrace();
  }
}

export function getStartupMarks(): ReadonlyMap<StartupMark, number> {
  return new Map(marks);
}

export function clearStartupMarksForTest(): void {
  marks.clear();
}

export function reportStartupTrace(): void {
  if (typeof __DEV__ !== 'undefined' && !__DEV__) {
    return;
  }
  if (marks.size === 0) {
    return;
  }

  const entries = Array.from(marks.entries());
  const firstEntry = entries[0];
  const baseTime = marks.get('bundle_evaluated') ?? firstEntry?.[1] ?? 0;

  const report: Record<string, { timeMs: number; deltaMs: number }> = {};
  for (const [mark, time] of entries) {
    report[mark] = {
      timeMs: Math.round(time),
      deltaMs: Math.round(time - baseTime),
    };
  }

  // eslint-disable-next-line no-console -- traza de diagnóstico solo en desarrollo
  console.info('[startup-trace]', report);
}
