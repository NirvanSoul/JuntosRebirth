import openSourceLicensesData from '@/features/legal/content/openSourceLicenses.json';
import { privacyPolicy } from '@/features/legal/content/privacyPolicy';
import { termsOfService } from '@/features/legal/content/termsOfService';
import type {
  LegalDocumentContent,
  LegalDocumentId,
} from '@/features/legal/model/types';

export type OpenSourceLicenseEntry = {
  name: string;
  version: string;
  license: string;
  repository: string | null;
};

export const openSourceLicenses =
  openSourceLicensesData as readonly OpenSourceLicenseEntry[];

const documentsById: Record<
  Exclude<LegalDocumentId, 'open-source-licenses'>,
  LegalDocumentContent
> = {
  'privacy-policy': privacyPolicy,
  'terms-of-service': termsOfService,
};

export function getLegalDocument(
  documentId: Exclude<LegalDocumentId, 'open-source-licenses'>,
): LegalDocumentContent {
  return documentsById[documentId];
}
