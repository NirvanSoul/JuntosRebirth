import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';

import { createSupabaseAuthGateway } from '@/features/auth/gateways/supabaseAuthGateway';
import { useAuthSession } from '@/features/auth/hooks/useAuthSession';
import {
  consumePendingLegalAcceptance,
  getMissingCurrentLegalDocuments,
  LegalAcceptanceEmailMismatchError,
  recordMissingCurrentLegalAcceptances,
} from '@/features/legal/services/legalAcceptanceService';
import type {
  LegalAcceptanceDocumentId,
  LegalDecision,
} from '@/features/legal/model/types';

export type LegalGateStatus =
  | { kind: 'no-session' }
  | { kind: 'checking' }
  | { kind: 'cleared' }
  | { kind: 'required' }
  | { kind: 'halted' };

export type LegalSessionGate = {
  /**
   * Sesión «legalmente habilitada»: solo se publica cuando todas las versiones
   * vigentes están registradas. Hasta entonces vale `null` y los efectos
   * autenticados no pueden reaccionar.
   */
  session: Session | null;
  /** Sesión cruda de `useAuthSession`, para decisiones de navegación. */
  rawSession: Session | null;
  isReady: boolean;
  gateReady: boolean;
  isLegallyEnabled: boolean;
  status: LegalGateStatus;
  error: string | null;
  missingDocuments: LegalAcceptanceDocumentId[];
  /** Reintenta la comprobación tras un fallo observable. */
  retryGate: () => void;
  /**
   * Registra los documentos pendientes de la sesión actual (importa la puerta
   * legal de cuentas existentes) y vuelve a comprobar.
   */
  submitRegularization: (decision: LegalDecision) => Promise<void>;
  /** Cierra solo la sesión local: sin aceptación y sin revocar otros dispositivos. */
  abandonSession: () => Promise<void>;
  /**
   * Pausa la puerta mientras una sesión de OTP de recuperación está activa:
   * no se muestra la puerta ni se habilitan efectos hasta que termine el
   * restablecimiento.
   */
  setRecoveryHalted: (halted: boolean) => void;
};

const noSessionSnapshot = {
  session: null,
  rawSession: null,
  isReady: false,
  gateReady: true,
  isLegallyEnabled: true,
  status: { kind: 'no-session' } as LegalGateStatus,
  error: null,
  missingDocuments: [] as LegalAcceptanceDocumentId[],
};

type GateSnapshot = Omit<
  LegalSessionGate,
  'retryGate' | 'submitRegularization' | 'abandonSession' | 'setRecoveryHalted'
>;

let currentSnapshot: GateSnapshot = { ...noSessionSnapshot };
const listeners = new Set<() => void>();

function publish(next: GateSnapshot): void {
  currentSnapshot = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let checkRunId = 0;
let checkInFlight: Promise<void> | null = null;
let recoveryHalted = false;

/**
 * Solo para pruebas: reinicia el estado global del controlador (instantánea,
 * pausa de recuperación y comprobaciones en vuelo) entre suites de un mismo
 * archivo. En producción no hay que llamarla: el estado se autocorrige con cada
 * cambio real de sesión.
 */
export function resetLegalSessionGateForTests(): void {
  checkRunId += 1;
  checkInFlight = null;
  recoveryHalted = false;
  currentSnapshot = { ...noSessionSnapshot };
}

function describeFailure(caught: unknown): string {
  return caught instanceof Error
    ? caught.message
    : 'No pudimos verificar tu aceptación legal.';
}

async function runGateCheck(session: Session): Promise<void> {
  const runId = ++checkRunId;
  publish({
    ...currentSnapshot,
    session: null,
    rawSession: session,
    isReady: true,
    gateReady: false,
    isLegallyEnabled: false,
    status: { kind: 'checking' },
    error: null,
  });

  try {
    await consumePendingLegalAcceptance({
      userId: session.user.id,
      sessionEmail: session.user.email ?? '',
    });
    const missing = await getMissingCurrentLegalDocuments(session.user.id);
    if (runId !== checkRunId) return;

    if (recoveryHalted) {
      publish({
        ...currentSnapshot,
        session: null,
        rawSession: session,
        isReady: true,
        gateReady: true,
        isLegallyEnabled: false,
        status: { kind: 'halted' },
        error: null,
        missingDocuments: missing,
      });
      return;
    }

    if (missing.length === 0) {
      publish({
        ...currentSnapshot,
        session,
        rawSession: session,
        isReady: true,
        gateReady: true,
        isLegallyEnabled: true,
        status: { kind: 'cleared' },
        error: null,
        missingDocuments: [],
      });
      return;
    }
    publish({
      ...currentSnapshot,
      session: null,
      rawSession: session,
      isReady: true,
      gateReady: true,
      isLegallyEnabled: false,
      status: { kind: 'required' },
      error: null,
      missingDocuments: missing,
    });
  } catch (caught) {
    if (runId !== checkRunId) return;

    if (caught instanceof LegalAcceptanceEmailMismatchError) {
      // La intención es de otro correo y se conserva; esta sesión se regula
      // con una acción nueva si aún le falta evidencia.
      let missing: LegalAcceptanceDocumentId[] = [];
      try {
        missing = await getMissingCurrentLegalDocuments(session.user.id);
      } catch {
        // Sin lectura remota no se puede saber qué falta: el reintento
        // volverá a consultar.
      }
      if (runId !== checkRunId) return;
      publish({
        ...currentSnapshot,
        session: null,
        rawSession: session,
        isReady: true,
        gateReady: true,
        isLegallyEnabled: false,
        status: { kind: 'required' },
        error: null,
        missingDocuments: missing,
      });
      return;
    }

    publish({
      ...currentSnapshot,
      session: null,
      rawSession: session,
      isReady: true,
      gateReady: true,
      isLegallyEnabled: false,
      status: { kind: 'required' },
      error: describeFailure(caught),
      missingDocuments: currentSnapshot.missingDocuments,
    });
  }
}

function triggerCheck(session: Session): void {
  if (checkInFlight) {
    // Ya hay una comprobación corriendo; al terminar publicará el resultado
    // del runId vigente o será descartado por una sesión nueva.
    return;
  }
  checkInFlight = runGateCheck(session)
    .catch(() => {
      // runGateCheck no lanza hacia fuera: los fallos son el estado publicado.
    })
    .finally(() => {
      checkInFlight = null;
    });
}

export function useLegalSessionGate(): LegalSessionGate {
  const { isReady, session } = useAuthSession();
  const [snapshot, setSnapshot] = useState<GateSnapshot>(() => ({
    ...currentSnapshot,
    isReady: isReady || currentSnapshot.isReady,
  }));
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => subscribe(() => setSnapshot({ ...currentSnapshot })), []);

  useEffect(() => {
    if (!isReady) return;

    if (!session) {
      checkRunId += 1;
      publish({
        ...noSessionSnapshot,
        isReady: true,
        rawSession: null,
      });
      return;
    }
    if (recoveryHalted) return;

    triggerCheck(session);
  }, [isReady, retryToken, session]);

  const setRecoveryHalted = useCallback((halted: boolean) => {
    recoveryHalted = halted;
    if (halted) {
      publish({
        ...currentSnapshot,
        session: null,
        gateReady: true,
        isLegallyEnabled: false,
        status: { kind: 'halted' },
      });
      return;
    }
    const resumedSession = currentSnapshot.rawSession ?? sessionRef.current;
    if (resumedSession) {
      triggerCheck(resumedSession);
    } else {
      publish({ ...noSessionSnapshot, isReady: true, rawSession: null });
    }
  }, []);

  const retryGate = useCallback(() => {
    setRetryToken((token) => token + 1);
  }, []);

  const submitRegularization = useCallback(async () => {
    const activeSession = sessionRef.current;
    if (!activeSession) {
      throw new Error('Inicia sesión para registrar tu aceptación legal.');
    }
    await recordMissingCurrentLegalAcceptances(activeSession.user.id);
    triggerCheck(activeSession);
  }, []);

  const abandonSession = useCallback(async () => {
    await createSupabaseAuthGateway().signOut('local');
  }, []);

  return {
    session: snapshot.session,
    rawSession: snapshot.rawSession,
    isReady: snapshot.isReady,
    gateReady: snapshot.gateReady,
    isLegallyEnabled: snapshot.isLegallyEnabled,
    status: snapshot.status,
    error: snapshot.error,
    missingDocuments: snapshot.missingDocuments,
    retryGate,
    submitRegularization,
    abandonSession,
    setRecoveryHalted,
  };
}
