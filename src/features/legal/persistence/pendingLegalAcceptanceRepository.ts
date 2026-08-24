import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  PendingLegalAcceptance,
  PendingLegalAcceptanceNew,
  PendingLegalDocumentSnapshot,
} from '@/features/legal/model/types';
import { legalAcceptanceSources } from '@/features/legal/model/types';
import { normalizeEmailAddress } from '@/features/legal/utils/normalizeEmail';

export const pendingLegalAcceptanceStorageKey =
  '@juntoss/pending-legal-acceptance/v1';

const intentionVersion = 1;

function isPendingLegalDocumentSnapshot(
  value: unknown,
): value is PendingLegalDocumentSnapshot {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<PendingLegalDocumentSnapshot>;
  return (
    (candidate.documentId === 'privacy-policy' ||
      candidate.documentId === 'terms-of-service') &&
    typeof candidate.documentVersion === 'string' &&
    candidate.documentVersion.length > 0 &&
    (candidate.action === 'accepted' || candidate.action === 'consulted')
  );
}

function parseIntention(value: string): PendingLegalAcceptance | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;

  const candidate = parsed as Partial<PendingLegalAcceptance>;
  if (candidate.version !== intentionVersion) return null;
  if (typeof candidate.email !== 'string' || candidate.email.length === 0) {
    return null;
  }
  if (candidate.locale !== 'es-ES') return null;
  if (
    typeof candidate.source !== 'string' ||
    !legalAcceptanceSources.some((source) => source === candidate.source)
  ) {
    return null;
  }
  if (
    typeof candidate.appVersion !== 'string' ||
    candidate.appVersion.length === 0
  ) {
    return null;
  }
  if (
    !Array.isArray(candidate.documents) ||
    candidate.documents.length === 0 ||
    !candidate.documents.every(isPendingLegalDocumentSnapshot)
  ) {
    return null;
  }

  return {
    version: intentionVersion,
    email: candidate.email,
    locale: candidate.locale,
    source: candidate.source,
    appVersion: candidate.appVersion,
    documents: candidate.documents,
  };
}

/**
 * Intención pendiente guardada de forma durable: sobrevive al cierre y a la
 * reapertura de la app. Se valida el esquema y la versión al leerla; un valor
 * ilegible se descarta (no puede aplicarse lo que no es verificable).
 */
export async function loadPendingLegalAcceptance(): Promise<PendingLegalAcceptance | null> {
  const stored = await AsyncStorage.getItem(pendingLegalAcceptanceStorageKey);
  if (stored === null) return null;
  return parseIntention(stored);
}

/**
 * Guarda la intención creando la instantánea de la acción afirmativa. El correo
 * se normaliza aquí para que la identidad de registro sea estable y cotejable
 * después con la sesión.
 */
export async function savePendingLegalAcceptance(
  intention: PendingLegalAcceptanceNew,
): Promise<void> {
  const stored: PendingLegalAcceptance = {
    version: intentionVersion,
    email: normalizeEmailAddress(intention.email),
    locale: intention.locale,
    source: intention.source,
    appVersion: intention.appVersion,
    documents: intention.documents,
  };
  await AsyncStorage.setItem(
    pendingLegalAcceptanceStorageKey,
    JSON.stringify(stored),
  );
}

export async function clearPendingLegalAcceptance(): Promise<void> {
  await AsyncStorage.removeItem(pendingLegalAcceptanceStorageKey);
}
