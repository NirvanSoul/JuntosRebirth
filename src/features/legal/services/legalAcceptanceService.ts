import type { SupabaseClient } from '@supabase/supabase-js';

import { appVersion } from '@/app/config/appVersion';
import { supabaseEnvironment } from '@/app/config/environment';
import { privacyPolicy } from '@/features/legal/content/privacyPolicy';
import { termsOfService } from '@/features/legal/content/termsOfService';
import {
  clearPendingLegalAcceptance,
  loadPendingLegalAcceptance,
} from '@/features/legal/persistence/pendingLegalAcceptanceRepository';
import type {
  LegalAcceptanceDocumentId,
  LegalAcceptanceSource,
} from '@/features/legal/model/types';
import { normalizeEmailAddress } from '@/features/legal/utils/normalizeEmail';
import { getConfiguredSupabaseClient } from '@/lib/supabase/supabaseClient';

/** Faltar la configuración de Supabase es un fallo observable, nunca silencio. */
export class LegalAcceptanceMissingConfigError extends Error {
  constructor() {
    super(
      'La configuración de Supabase no está disponible para registrar la aceptación.',
    );
    this.name = 'LegalAcceptanceMissingConfigError';
  }
}

/** Faltar la sesión autenticada es un fallo observable, nunca silencio. */
export class LegalAcceptanceMissingSessionError extends Error {
  constructor() {
    super('Necesitas iniciar sesión para registrar tu aceptación.');
    this.name = 'LegalAcceptanceMissingSessionError';
  }
}

export class LegalAcceptanceQueryError extends Error {
  constructor(message: string) {
    super(`No pudimos consultar tu aceptación: ${message}`);
    this.name = 'LegalAcceptanceQueryError';
  }
}

export class LegalAcceptanceInsertError extends Error {
  constructor(message: string) {
    super(`No pudimos registrar la aceptación: ${message}`);
    this.name = 'LegalAcceptanceInsertError';
  }
}

/**
 * La intención guardada corresponde a otro correo y nunca se aplica a esta
 * sesión sin una acción afirmativa nueva. La intención se conserva intacta.
 */
export class LegalAcceptanceEmailMismatchError extends Error {
  constructor() {
    super(
      'La intención guardada corresponde a otro correo y no se aplica a esta sesión.',
    );
    this.name = 'LegalAcceptanceEmailMismatchError';
  }
}

export type LegalAcceptanceEvidence = readonly {
  documentId: LegalAcceptanceDocumentId;
  documentVersion: string;
}[];

type LegalAcceptanceEvidenceRow = {
  document_type: string;
  document_version: string;
};

export type LegalAcceptanceRecordInput = {
  documentId: LegalAcceptanceDocumentId;
  documentVersion: string;
  locale: string;
  source: LegalAcceptanceSource;
  appVersion: string;
};

/**
 * Documentos y versiones vigentes. Fuente canónica: los módulos de contenido,
 * nunca literales duplicados fuera de ellos. Al cambiar la versión de un
 * documento, este catálogo es el único punto que debe actualizarse y la puerta
 * legal vuelve a exigir únicamente ese documento.
 */
const currentLegalDocuments: readonly {
  documentId: LegalAcceptanceDocumentId;
  documentVersion: string;
}[] = [
  { documentId: 'terms-of-service', documentVersion: termsOfService.version },
  { documentId: 'privacy-policy', documentVersion: privacyPolicy.version },
];

async function getAcceptanceClient(): Promise<SupabaseClient> {
  if (!supabaseEnvironment) {
    throw new LegalAcceptanceMissingConfigError();
  }
  return getConfiguredSupabaseClient();
}

async function insertAcceptanceRow(
  client: SupabaseClient,
  userId: string,
  snapshot: {
    documentId: LegalAcceptanceDocumentId;
    documentVersion: string;
    locale: string;
    source: LegalAcceptanceSource;
    appVersion: string;
  },
): Promise<void> {
  const { error } = await client.from('legal_acceptances').insert({
    user_id: userId,
    document_type: snapshot.documentId,
    document_version: snapshot.documentVersion,
    app_version: snapshot.appVersion,
    locale: snapshot.locale,
    source: snapshot.source,
  });
  if (error) {
    throw new LegalAcceptanceInsertError(error.message);
  }
}

async function listAcceptedLegalAcceptances(
  userId: string,
): Promise<LegalAcceptanceEvidence> {
  const client = await getAcceptanceClient();
  const { data, error } = await client
    .from('legal_acceptances')
    .select('document_type, document_version')
    .eq('user_id', userId);
  if (error) {
    throw new LegalAcceptanceQueryError(error.message);
  }
  const rows = (data ?? []) as unknown as LegalAcceptanceEvidenceRow[];
  return rows.map((row) => ({
    documentId: row.document_type as LegalAcceptanceDocumentId,
    documentVersion: row.document_version,
  }));
}

/**
 * Consulta qué versiones vigentes tiene aceptadas la sesión actual: solo
 * devuelve los documentos cuya versión vigente aún no consta. La vigencia se
 * calcula por documento y versión exacta.
 */
export async function getMissingCurrentLegalDocuments(
  userId: string,
): Promise<LegalAcceptanceDocumentId[]> {
  const existing = await listAcceptedLegalAcceptances(userId);
  return currentLegalDocuments
    .filter(
      (document) =>
        !existing.some(
          (row) =>
            row.documentId === document.documentId &&
            row.documentVersion === document.documentVersion,
        ),
    )
    .map((document) => document.documentId);
}

/**
 * Registra la evidencia de una acción legal de la sesión autenticada. La
 * versión, locale, origen y versión de la app se toman de la instantánea
 * aportada (la de la acción afirmativa), no se recalculan después de una
 * actualización.
 */
export async function recordLegalAcceptance(
  input: LegalAcceptanceRecordInput,
): Promise<void> {
  const client = await getAcceptanceClient();
  const { data, error: userError } = await client.auth.getUser();
  if (userError || !data.user) {
    throw new LegalAcceptanceMissingSessionError();
  }
  await insertAcceptanceRow(client, data.user.id, input);
}
export type ConsumePendingLegalAcceptanceResult = {
  outcome: 'no-intention' | 'complete-nothing-needed' | 'inserted';
  insertedCount: number;
};

/**
 * Aplica una intención pendiente a la sesión que acaba de aparecer, solo si el
 * correo normalizado corresponde. Inserta únicamente los documentos que aún no
 * constan con la versión de la instantánea (nunca las versiones «actuales»
 * en caliente), verifica que todas las filas esperadas existen y solo entonces
 * elimina la intención. Un fallo parcial conserva la intención para reintentar
 * de forma idempotente.
 */
export async function consumePendingLegalAcceptance(input: {
  userId: string;
  sessionEmail: string;
}): Promise<ConsumePendingLegalAcceptanceResult> {
  const intention = await loadPendingLegalAcceptance();
  if (!intention) {
    return { outcome: 'no-intention', insertedCount: 0 };
  }

  const client = await getAcceptanceClient();
  if (
    normalizeEmailAddress(intention.email) !==
    normalizeEmailAddress(input.sessionEmail)
  ) {
    throw new LegalAcceptanceEmailMismatchError();
  }

  const existing = await listAcceptedLegalAcceptances(input.userId);
  const missing = intention.documents.filter(
    (snapshot) =>
      !existing.some(
        (row) =>
          row.documentId === snapshot.documentId &&
          row.documentVersion === snapshot.documentVersion,
      ),
  );

  let insertedCount = 0;
  // La tabla no garantiza unicidad por versión: se evitan duplicados
  // secuenciales desde el cliente consultando antes de insertar.
  for (const snapshot of missing) {
    await insertAcceptanceRow(client, input.userId, {
      documentId: snapshot.documentId,
      documentVersion: snapshot.documentVersion,
      locale: intention.locale,
      source: intention.source,
      appVersion: intention.appVersion,
    });
    insertedCount += 1;
  }

  const after = await listAcceptedLegalAcceptances(input.userId);
  const allExpectedRowsExist = intention.documents.every((snapshot) =>
    after.some(
      (row) =>
        row.documentId === snapshot.documentId &&
        row.documentVersion === snapshot.documentVersion,
    ),
  );
  if (!allExpectedRowsExist) {
    throw new LegalAcceptanceInsertError(
      'No pudimos confirmar el registro de tu aceptación.',
    );
  }

  await clearPendingLegalAcceptance().catch(() => {
    // Si la limpieza falla, el siguiente reintento consulta y confirma que
    // todo existe antes de volver a intentar borrar: el flujo es seguro.
  });

  return {
    outcome: insertedCount > 0 ? 'inserted' : 'complete-nothing-needed',
    insertedCount,
  };
}

/**
 * Registra los documentos pendientes de la sesión actual para la puerta legal
 * de cuentas existentes. Distingue la regularización (sin fila previa del
 * documento) de la reaceptación por nueva versión (fila con versión anterior).
 */
export async function recordMissingCurrentLegalAcceptances(
  userId: string,
): Promise<{
  insertedDocumentIds: LegalAcceptanceDocumentId[];
}> {
  const client = await getAcceptanceClient();
  const existing = await listAcceptedLegalAcceptances(userId);

  const insertedDocumentIds: LegalAcceptanceDocumentId[] = [];
  for (const document of currentLegalDocuments) {
    const hasCurrentVersion = existing.some(
      (row) =>
        row.documentId === document.documentId &&
        row.documentVersion === document.documentVersion,
    );
    if (hasCurrentVersion) continue;

    const hadPreviousVersion = existing.some(
      (row) => row.documentId === document.documentId,
    );
    await insertAcceptanceRow(client, userId, {
      documentId: document.documentId,
      documentVersion: document.documentVersion,
      locale: 'es-ES',
      source: hadPreviousVersion ? 'new-version' : 'account-regularization',
      appVersion,
    });
    insertedDocumentIds.push(document.documentId);
  }
  return { insertedDocumentIds };
}
