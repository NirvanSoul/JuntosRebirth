export type LegalDocumentId =
  'privacy-policy' | 'terms-of-service' | 'open-source-licenses';

export type LegalDocumentSection = {
  heading: string;
  body: readonly string[];
};

export type LegalDocumentContent = {
  documentId: LegalDocumentId;
  version: string;
  effectiveDate: string;
  lastUpdated: string;
  locale: 'es-ES';
  title: string;
  intro: readonly string[];
  sections: readonly LegalDocumentSection[];
};

export type DataDeletionScope = 'local' | 'account';

export type DataDeletionResult = {
  scope: DataDeletionScope;
};

export type DataExportScope = 'local' | 'account';

/**
 * Documentos que generan evidencia de aceptación. Las licencias de código
 * abierto son un documento informativo y no generan fila en
 * `public.legal_acceptances` (la tabla solo admite las dos primeras).
 */
export type LegalAcceptanceDocumentId = Exclude<
  LegalDocumentId,
  'open-source-licenses'
>;

/**
 * Origen de la acción legal registrado como evidencia. Lista cerrada y tipada:
 * cada host de registro documentado pasa su origen, y la puerta de sesión
 * distingue regularización de cuentas existentes de la reaceptación por una
 * versión nueva. Futuros proveedores OAuth añadirán su propio valor aquí sin
 * dejar strings arbitrarios dispersos.
 */
export const legalAcceptanceSources = [
  'access-signup',
  'settings-signup',
  'invitation-signup',
  'account-regularization',
  'new-version',
] as const;

export type LegalAcceptanceSource = (typeof legalAcceptanceSources)[number];

/**
 * Las dos acciones legales diferenciadas exigidas por la interfaz: aceptar
 * los Términos es un acto contractual; confirmar la consulta de la Política
 * de privacidad no debe presentarse como «consentimiento» genérico.
 */
export type LegalDecision = {
  acceptedTerms: boolean;
  consultedPrivacy: boolean;
};

/**
 * ¿La decisión cubre la acción afirmativa de este documento? B4: la puerta
 * debe exigir y registrar únicamente los documentos pendientes; una decisión
 * que no cubre un documento pendiente no puede continuar ni registrar filas.
 */
export function decisionCoversDocument(
  documentId: LegalAcceptanceDocumentId,
  decision: LegalDecision,
): boolean {
  return documentId === 'terms-of-service'
    ? decision.acceptedTerms
    : decision.consultedPrivacy;
}

/** Todas las acciones exigidas para el conjunto de documentos pendientes. */
export function isLegalDecisionComplete(
  requiredDocuments: readonly LegalAcceptanceDocumentId[],
  decision: LegalDecision,
): boolean {
  return requiredDocuments.every((documentId) =>
    decisionCoversDocument(documentId, decision),
  );
}

export type LegalDocumentAction = 'accepted' | 'consulted';

/** Instantánea de un documento dentro de una intención pendiente. */
export type PendingLegalDocumentSnapshot = {
  documentId: LegalAcceptanceDocumentId;
  documentVersion: string;
  action: LegalDocumentAction;
};

/**
 * Intención legal duradera creada antes de pedir la cuenta. Solo contiene
 * identidad de registro (correo normalizado), versión de la app, locale,
 * origen y la instantánea de documentos/versiones: nunca contraseña, OTP ni
 * otros secretos.
 */
export type PendingLegalAcceptanceNew = {
  email: string;
  locale: 'es-ES';
  source: LegalAcceptanceSource;
  appVersion: string;
  documents: readonly PendingLegalDocumentSnapshot[];
};

export type PendingLegalAcceptance = PendingLegalAcceptanceNew & {
  version: 1;
};
