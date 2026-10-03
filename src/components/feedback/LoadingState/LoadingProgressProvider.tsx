import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import {
  cancelAnimation,
  Easing,
  ReduceMotion,
  type SharedValue,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { motion } from '@/theme/motion';

/** Tramo rápido inicial y avance lento posterior: la barra nunca parece detenida. */
const FAST_PROGRESS = 0.72;
const PENDING_PROGRESS = 0.92;

export type LoadingProgress = {
  /** 0 → 1; solo lectura para los estilos animados. */
  progress: SharedValue<number>;
  /** Continúa la barra que otra etapa dejó a medias; si no, empieza de cero. */
  begin: () => void;
  /** Lleva la barra al final antes de mostrar el contenido. */
  complete: () => void;
  /**
   * Libera una etapa sin descartar su avance. La siguiente continúa desde el
   * mismo punto hasta que el ciclo completo termina.
   */
  release: () => void;
};

const LoadingProgressContext = createContext<LoadingProgress | null>(null);

export function createLoadingProgress(
  progress: SharedValue<number>,
): LoadingProgress {
  let cycleCompleted = false;
  let activeLoaders = 0;
  return {
    progress,
    begin: () => {
      if (cycleCompleted) {
        progress.value = 0;
        cycleCompleted = false;
      }
      activeLoaders += 1;
      if (progress.value !== 0) return;
      progress.value = withSequence(
        withTiming(FAST_PROGRESS, {
          duration: motion.loadingBarDuration,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        }),
        withTiming(PENDING_PROGRESS, {
          duration: motion.loadingBarCrawlDuration,
          easing: Easing.out(Easing.quad),
          reduceMotion: ReduceMotion.System,
        }),
      );
    },
    complete: () => {
      if (activeLoaders > 0) return;
      cycleCompleted = true;
      progress.value = withTiming(1, {
        duration: motion.loadingCompletionDuration,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      });
    },
    release: () => {
      activeLoaders = Math.max(0, activeLoaders - 1);
    },
  };
}

/** Una sola barra durante las etapas de fuentes, sesión y datos iniciales. */
export function LoadingProgressProvider({ children }: PropsWithChildren) {
  const progress = useSharedValue(0);
  useEffect(() => () => cancelAnimation(progress), [progress]);
  const value = useMemo(() => createLoadingProgress(progress), [progress]);
  return (
    <LoadingProgressContext.Provider value={value}>
      {children}
    </LoadingProgressContext.Provider>
  );
}

/** Fuera del provider cada barra usa su propio avance. */
export function useLoadingProgress(): LoadingProgress {
  const shared = useContext(LoadingProgressContext);
  const local = useSharedValue(0);
  useEffect(() => {
    if (shared) return;
    return () => cancelAnimation(local);
  }, [local, shared]);
  const fallback = useMemo(() => createLoadingProgress(local), [local]);
  return shared ?? fallback;
}
