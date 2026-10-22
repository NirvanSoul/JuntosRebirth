import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import {
  isCurrencyCode,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';

/**
 * Usuario ficticio para demos y marketing. Solo existe en este dispositivo:
 * no tiene cuenta en Juntoss API y ninguna petición privada sale mientras está
 * activo (ver `juntossApiClient`). Únicamente se crea en desarrollo.
 */
export type DemoSession = {
  userId: string;
  displayName: string;
  email: string;
  partnerUserId: string;
  partnerDisplayName: string;
  currency: CurrencyCode;
  createdAt: string;
  /**
   * Valor guardado de las preferencias de moneda antes de crear el demo, para
   * devolverlo intacto al eliminarlo.
   */
  previousCurrencyPreferences: string | null;
};

export type DemoSessionState = {
  /** `false` hasta leer AsyncStorage: antes no se sabe si hay demo activo. */
  isReady: boolean;
  demoSession: DemoSession | null;
};

const demoSessionStorageKey = '@juntoss/demo-session/v1';

let snapshot: DemoSessionState = { isReady: false, demoSession: null };
let loadPromise: Promise<DemoSession | null> | null = null;
const listeners = new Set<() => void>();

function publish(demoSession: DemoSession | null): void {
  snapshot = { isReady: true, demoSession };
  listeners.forEach((listener) => listener());
}

function parseDemoSession(raw: string): DemoSession | null {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null) return null;
  const candidate = parsed as Partial<DemoSession>;
  const textFields = [
    candidate.userId,
    candidate.displayName,
    candidate.email,
    candidate.partnerUserId,
    candidate.partnerDisplayName,
    candidate.createdAt,
  ];
  if (
    !textFields.every((value) => typeof value === 'string' && value.length) ||
    typeof candidate.currency !== 'string' ||
    !isCurrencyCode(candidate.currency) ||
    (candidate.previousCurrencyPreferences !== null &&
      typeof candidate.previousCurrencyPreferences !== 'string')
  ) {
    return null;
  }
  return candidate as DemoSession;
}

async function readDemoSession(): Promise<DemoSession | null> {
  // Una build de release nunca abre un demo, aunque quedara uno guardado.
  if (!__DEV__) return null;
  try {
    const stored = await AsyncStorage.getItem(demoSessionStorageKey);
    return stored === null ? null : parseDemoSession(stored);
  } catch (error) {
    console.error('[demo] No se pudo leer el usuario demo', error);
    return null;
  }
}

/** Lee una sola vez el demo guardado; las llamadas siguientes reutilizan la lectura. */
export function loadDemoSession(): Promise<DemoSession | null> {
  if (snapshot.isReady) return Promise.resolve(snapshot.demoSession);
  loadPromise ??= readDemoSession().then((demoSession) => {
    // Un guardado o borrado durante la lectura ya fijó el estado vigente.
    if (!snapshot.isReady) publish(demoSession);
    return snapshot.demoSession;
  });
  return loadPromise;
}

/**
 * Lectura síncrona para guardas dentro de callbacks. Antes de la primera
 * lectura devuelve `false`; quien no pueda tolerarlo usa `loadDemoSession`.
 */
export function isDemoSessionActive(): boolean {
  return snapshot.demoSession !== null;
}

export function getDemoSession(): DemoSession | null {
  return snapshot.demoSession;
}

export async function saveDemoSession(demoSession: DemoSession): Promise<void> {
  await AsyncStorage.setItem(
    demoSessionStorageKey,
    JSON.stringify(demoSession),
  );
  publish(demoSession);
}

export async function clearDemoSession(): Promise<void> {
  await AsyncStorage.removeItem(demoSessionStorageKey);
  publish(null);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDemoSession(): DemoSessionState {
  const state = useSyncExternalStore(subscribe, () => snapshot);
  useEffect(() => {
    void loadDemoSession();
  }, []);
  return state;
}

/** Solo para pruebas: olvida la lectura en memoria. */
export function resetDemoSessionStoreForTests(): void {
  snapshot = { isReady: false, demoSession: null };
  loadPromise = null;
}
