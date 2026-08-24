import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';

import { createSupabaseAuthGateway } from '@/features/auth/gateways/supabaseAuthGateway';
import { useAuthSession } from '@/features/auth/hooks/useAuthSession';
import {
  clearRecoveryHolds,
  commitRecoveryHold,
  isRecoveryHalted,
  registerRecoveryHoldEffects,
} from '@/features/legal/hooks/recoveryHoldRegistry';
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
import { decisionCoversDocument } from '@/features/legal/model/types';

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
   * ADR-084: concesión con dueño. Cada controlador de recuperación sostiene la
   * suya y solo libera la propia; la puerta sigue en pausa mientras quede otra.
   */
  setRecoveryHold: (ownerId: string, held: boolean) => void;
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
  'retryGate' | 'submitRegularization' | 'abandonSession' | 'setRecoveryHold'
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
let latestRequestedSession: Session | null = null;
let checkLoop: Promise<void> | null = null;

/** Última sesión cruda conocida; la concesión de pausa no depende de instancias. */
let latestRawSession: Session | null = null;

/**
 * Solo para pruebas: reinicia el estado global del controlador (instantánea,
 * pausa de recuperación y comprobaciones en vuelo) entre suites de un mismo
 * archivo. En producción no hay que llamarla: el estado se autocorrige con cada
 * cambio real de sesión.
 */
export function resetLegalSessionGateForTests(): void {
  checkRunId += 1;
  latestRequestedSession = null;
  checkLoop = null;
  clearRecoveryHolds();
  currentSnapshot = { ...noSessionSnapshot };
}

function describeFailure(caught: unknown): string {
  return caught instanceof Error
    ? caught.message
    : 'No pudimos verificar tu aceptación legal.';
}

function isRunCurrent(runId: number): boolean {
  return runId === checkRunId;
}

/**
 * Publica la sesión «legalmente habilitada» solo si esta comprobación sigue
 * siendo la más reciente (una sesión nueva invalida cualquier resultado).
 */
function publishCleared(session: Session, runId: number): void {
  if (!isRunCurrent(runId)) return;
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
}

/**
 * Una sola comprobación: consume la intención pendiente (solo si el correo
 * corresponde), consulta qué versión vigente falta y publica el estado final.
 * Nunca lanza hacia fuera: los fallos se publican como el estado del grafo.
 */
async function runGateCheckOnce(session: Session): Promise<void> {
  const runId = ++checkRunId;
  publish({
    ...currentSnapshot,
    session: null,
    rawSession: session,
    isReady: true,
    gateReady: true,
    isLegallyEnabled: false,
    status: { kind: 'checking' },
    error: null,
    missingDocuments: [],
  });

  try {
    await consumePendingLegalAcceptance({
      userId: session.user.id,
      sessionEmail: session.user.email ?? '',
    });
    const missing = await getMissingCurrentLegalDocuments(session.user.id);
    if (missing.length > 0) {
      if (!isRunCurrent(runId)) return;
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
    publishCleared(session, runId);
  } catch (caught) {
    if (caught instanceof LegalAcceptanceEmailMismatchError) {
      // B1: la intención guardada pertenece a otro correo y se conserva
      // intacta (su titular aún podría verificar su cuenta en este móvil).
      // Decide la cuenta real de la sesión, no la intención: si ya está al
      // día, la puerta se despeja; si le falta algo, exige solo eso.
      let missing: LegalAcceptanceDocumentId[] = [];
      try {
        missing = await getMissingCurrentLegalDocuments(session.user.id);
      } catch (queryCaught) {
        if (!isRunCurrent(runId)) return;
        publish({
          ...currentSnapshot,
          session: null,
          rawSession: session,
          isReady: true,
          gateReady: true,
          isLegallyEnabled: false,
          status: { kind: 'required' },
          error: describeFailure(queryCaught),
          missingDocuments: currentSnapshot.missingDocuments,
        });
        return;
      }
      if (missing.length === 0) {
        publishCleared(session, runId);
        return;
      }
      if (!isRunCurrent(runId)) return;
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

    if (!isRunCurrent(runId)) return;
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

/**
 * Máquina de estados del ámbito de módulo: latest-wins (B5). Cada petición
 * invalida la comprobación en vuelo y encola la sesión más reciente; la que
 * gana es siempre la última, ninguna se pierde ni publica un resultado ya
 * superado.
 */
function requestGateCheck(session: Session): void {
  latestRequestedSession = session;
  checkRunId += 1;
  if (checkLoop) return;

  checkLoop = (async () => {
    try {
      while (latestRequestedSession) {
        const current = latestRequestedSession;
        latestRequestedSession = null;
        await runGateCheckOnce(current);
      }
    } finally {
      checkLoop = null;
    }
  })();
}

// ADR-084: la concesión de pausa vive en `recoveryHoldRegistry`; aquí se
// registran sus efectos de publicación (estado de módulo, no instancias). Al
// pausar se descarta la comprobación en vuelo; al reanudar, se re-comprueba.
registerRecoveryHoldEffects({
  onHalt: () => {
    checkRunId += 1;
    latestRequestedSession = null;
    publish({
      ...currentSnapshot,
      session: null,
      rawSession: latestRawSession,
      isReady: true,
      gateReady: true,
      isLegallyEnabled: false,
      status: { kind: 'halted' },
      error: null,
      missingDocuments: [],
    });
  },
  onResume: () => {
    const resumedSession = currentSnapshot.rawSession ?? latestRawSession;
    if (resumedSession) {
      requestGateCheck(resumedSession);
    } else {
      publish({ ...noSessionSnapshot, isReady: true, rawSession: null });
    }
  },
});

/** Solo la concesión de pausa, sin suscribirse al resto de la puerta. */
export function useRecoveryHold(): (ownerId: string, held: boolean) => void {
  return commitRecoveryHold;
}

export function useLegalSessionGate(): LegalSessionGate {
  const { isReady, session } = useAuthSession();
  const [snapshot, setSnapshot] = useState<GateSnapshot>(() => ({
    ...currentSnapshot,
    isReady: isReady || currentSnapshot.isReady,
  }));
  const sessionRef = useRef(session);
  sessionRef.current = session;
  latestRawSession = session;
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => subscribe(() => setSnapshot({ ...currentSnapshot })), []);

  useEffect(() => {
    if (!isReady) return;

    if (!session) {
      // «Sin sesión» es un estado propio. I2: la pausa NO se borra en global
      // cuando la sesión desaparece —eso rompería la concesión de un controlador
      // que sigue activo—; cada dueño libera la suya al terminar su episodio.
      checkRunId += 1;
      latestRequestedSession = null;
      publish({
        ...noSessionSnapshot,
        isReady: true,
        rawSession: null,
      });
      return;
    }
    if (isRecoveryHalted()) return;

    requestGateCheck(session);
  }, [isReady, retryToken, session]);

  const setRecoveryHold = commitRecoveryHold;

  const retryGate = useCallback(() => {
    setRetryToken((token) => token + 1);
  }, []);

  const submitRegularization = useCallback(async (decision: LegalDecision) => {
    const activeSession = sessionRef.current;
    if (!activeSession) {
      throw new Error('Inicia sesión para registrar tu aceptación legal.');
    }
    // La decisión de la persona es vinculante: solo se registra lo que cubre
    // exactamente los documentos pendientes de la sesión (B4).
    const missing = await getMissingCurrentLegalDocuments(
      activeSession.user.id,
    );
    const unresolved = missing.filter(
      (documentId) => !decisionCoversDocument(documentId, decision),
    );
    if (unresolved.length > 0) {
      throw new Error(
        `Para continuar necesitamos tu acción sobre: ${unresolved.join(', ')}.`,
      );
    }
    await recordMissingCurrentLegalAcceptances(activeSession.user.id);
    requestGateCheck(activeSession);
  }, []);

  const abandonSession = useCallback(async () => {
    await createSupabaseAuthGateway().signOut('local');
  }, []);

  // Visión derivada (B2 + B6): «sin sesión» y «sesión aún sin comprobar» son
  // estados distintos, y cada snapshot autenticado pertenece a una identidad.
  // Si la sesión cruda actual no coincide con la identidad del snapshot (el
  // snapshot sigue siendo el del invitado, o el resultado fue de otro usuario),
  // el estado viejo no puede presentarse —ni cleared ni required—: se deriva
  // «checking» hasta que la comprobación de la sesión actual publique su propio
  // resultado. Un snapshot autenticado sin sesión cruda actual tampoco se
  // presenta: quedó sin dueño. Una sesión sin comprobar nunca se reporta
  // habilitada ni exigida hacia el resto del árbol.
  const sessionUserId = session?.user.id ?? null;
  const snapshotUserId = snapshot.rawSession?.user.id ?? null;
  const snapshotOwnsCurrentSession =
    sessionUserId !== null && snapshotUserId === sessionUserId;
  const viewSnapshot: GateSnapshot =
    session !== null && !snapshotOwnsCurrentSession
      ? snapshot.status.kind === 'halted'
        ? snapshot
        : {
            ...snapshot,
            session: null,
            rawSession: session,
            isReady: true,
            gateReady: true,
            isLegallyEnabled: false,
            status: { kind: 'checking' },
            error: null,
            missingDocuments: [],
          }
      : session === null && snapshotUserId !== null
        ? { ...noSessionSnapshot, isReady: true }
        : snapshot;

  return {
    session: viewSnapshot.session,
    rawSession: viewSnapshot.rawSession,
    isReady: viewSnapshot.isReady,
    gateReady: viewSnapshot.gateReady,
    isLegallyEnabled: viewSnapshot.isLegallyEnabled,
    status: viewSnapshot.status,
    error: viewSnapshot.error,
    missingDocuments: viewSnapshot.missingDocuments,
    retryGate,
    submitRegularization,
    abandonSession,
    setRecoveryHold,
  };
}
