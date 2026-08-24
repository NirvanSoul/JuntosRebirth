import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  PendingLegalAcceptance,
  PendingLegalAcceptanceNew,
  PendingLegalDocumentSnapshot,
} from '@/features/legal/model/types';
import { legalAcceptanceSources } from '@/features/legal/model/types';
import { normalizeEmailAddress } from '@/features/legal/utils/normalizeEmail';

/**
 * Prefijo común de la ranura de intención por correo normalizado (B8): cada
 * titular tiene la suya, de modo que el registro de otra persona en el mismo
 * dispositivo nunca puede pisar la de quien aún no ha verificado su cuenta.
 */
export const pendingLegalAcceptanceStoragePrefix =
  '@juntoss/pending-legal-acceptance/v1';

/** Clave de la antigua ranura única (v1): se migra al leer cuando corresponde. */
export const pendingLegalAcceptanceLegacyStorageKey =
  '@juntoss/pending-legal-acceptance/v1';

export function pendingLegalAcceptanceStorageKeyForEmail(
  email: string,
): string {
  return `${pendingLegalAcceptanceStoragePrefix}:${normalizeEmailAddress(email)}`;
}

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

async function readStoredIntention(
  storageKey: string,
): Promise<PendingLegalAcceptance | null> {
  const stored = await AsyncStorage.getItem(storageKey);
  if (stored === null) return null;
  return parseIntention(stored);
}

/**
 * Intención pendiente guardada de forma durable: sobrevive al cierre y a la
 * reapertura de la app. Se valida el esquema y la versión al leerla; un valor
 * ilegible se descarta (no puede aplicarse lo que no es verificable). La
 * antigua ranura única se migra a la clave por correo únicamente si su titular
 * es este correo; la de cualquier otra persona se conserva intacta.
 */
export async function loadPendingLegalAcceptance(
  email: string,
): Promise<PendingLegalAcceptance | null> {
  const normalizedEmail = normalizeEmailAddress(email);
  const intention = await readStoredIntention(
    pendingLegalAcceptanceStorageKeyForEmail(normalizedEmail),
  );
  if (intention) return intention;

  const legacy = await readStoredIntention(
    pendingLegalAcceptanceLegacyStorageKey,
  );
  if (!legacy) return null;
  if (normalizeEmailAddress(legacy.email) !== normalizedEmail) return null;
  await AsyncStorage.setItem(
    pendingLegalAcceptanceStorageKeyForEmail(normalizedEmail),
    JSON.stringify(legacy),
  );
  await AsyncStorage.removeItem(pendingLegalAcceptanceLegacyStorageKey);
  return legacy;
}

/**
 * Guarda la intención creando la instantánea de la acción afirmativa. El correo
 * se normaliza aquí para que la identidad de registro sea estable y cotejable
 * después con la sesión, y la ranura heredada del mismo titular no deja una
 * segunda copia huérfana.
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
  const normalizedEmail = normalizeEmailAddress(intention.email);
  await AsyncStorage.setItem(
    pendingLegalAcceptanceStorageKeyForEmail(normalizedEmail),
    JSON.stringify(stored),
  );
  const legacy = await readStoredIntention(
    pendingLegalAcceptanceLegacyStorageKey,
  );
  if (legacy && normalizeEmailAddress(legacy.email) === normalizedEmail) {
    await AsyncStorage.removeItem(pendingLegalAcceptanceLegacyStorageKey);
  }
}

/**
 * Borra únicamente la intención del correo indicado (B8): la de cualquier otro
 * titular sigue intacta en su propia ranura.
 */
export async function clearPendingLegalAcceptance(
  email: string,
): Promise<void> {
  const normalizedEmail = normalizeEmailAddress(email);
  await AsyncStorage.removeItem(
    pendingLegalAcceptanceStorageKeyForEmail(normalizedEmail),
  );
  const legacy = await readStoredIntention(
    pendingLegalAcceptanceLegacyStorageKey,
  );
  if (legacy && normalizeEmailAddress(legacy.email) === normalizedEmail) {
    await AsyncStorage.removeItem(pendingLegalAcceptanceLegacyStorageKey);
  }
}
