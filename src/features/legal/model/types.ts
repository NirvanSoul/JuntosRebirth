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

export type DataDeletionScope = 'local' | 'data' | 'account';

export type DataDeletionResult = {
  scope: DataDeletionScope;
};

export type DataExportScope = 'local' | 'account';
