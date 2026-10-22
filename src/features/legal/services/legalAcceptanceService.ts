import type { LegalDocumentId } from '@/features/legal/model/types';
import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import { getLegalDocument } from '@/features/legal/services/legalDocumentService';
import { apiClient } from '@/services/api/juntossApiClient';

const appVersion = '0.1.0';

export type RecordLegalAcceptanceInput = {
  documentId: Exclude<LegalDocumentId, 'open-source-licenses'>;
  documentVersion: string;
  locale: string;
  source: string;
};

/**
 * Registra evidencia de aceptación de términos/política cuando existe una
 * sesión autenticada. Sin sesión no hay nada que registrar: la evidencia se
 * guarda contra un usuario, no contra un dispositivo.
 *
 * El identificador del usuario no viaja en el cuerpo: lo deduce la API de la
 * sesión, para que nadie pueda firmar una aceptación en nombre de otro.
 */
export async function recordLegalAcceptance(
  input: RecordLegalAcceptanceInput,
): Promise<void> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return;

  try {
    await apiClient.post('/v1/me/legal-acceptances', {
      appVersion,
      documentType: input.documentId,
      documentVersion: input.documentVersion,
      locale: input.locale,
      source: input.source,
    });
  } catch (error) {
    throw new Error(
      `No pudimos registrar la aceptación: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Registra la aceptación de Términos y Política de privacidad en sus
 * versiones vigentes. Se llama al autenticar desde Acceso, donde la casilla
 * de consentimiento es obligatoria para crear cuenta o iniciar sesión.
 */
export async function recordAccessLegalAcceptance(): Promise<void> {
  await Promise.all(
    (['terms-of-service', 'privacy-policy'] as const).map((documentId) => {
      const document = getLegalDocument(documentId);
      return recordLegalAcceptance({
        documentId,
        documentVersion: document.version,
        locale: document.locale,
        source: 'access',
      });
    }),
  );
}
