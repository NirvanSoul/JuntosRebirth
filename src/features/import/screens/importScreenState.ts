import type { ResumableLocalImportBatch } from '@/features/import/repositories/localImportBatchRepository';
import type {
  ColumnMapping,
  ImportMerchantRule,
  ImportSourceExtension,
} from '@/features/import/types';

/**
 * Contrato de estados del flujo de importación (Bible Fase 1). Vive aquí y no
 * en los tipos del dominio porque describe la máquina de fases de esta pantalla,
 * no una entidad persistida.
 */
export type Phase =
  | { kind: 'idle' }
  | { kind: 'validating' }
  | { kind: 'parsing' }
  | {
      kind: 'mapping-columns';
      headers: readonly string[];
      rows: readonly (readonly unknown[])[];
      mapping: ColumnMapping;
      merchantRules: readonly ImportMerchantRule[];
      sourceType: ImportSourceExtension;
    }
  | {
      kind: 'select-currency';
      rows: readonly (readonly unknown[])[];
      mapping: ColumnMapping;
      merchantRules: readonly ImportMerchantRule[];
      sourceType: ImportSourceExtension;
    }
  | { kind: 'review' }
  | { kind: 'saved-batches'; batches: readonly ResumableLocalImportBatch[] }
  | { kind: 'duplicate-file'; existingBatchDate: string }
  | { kind: 'committing' }
  | { kind: 'complete'; createdCount: number }
  | { kind: 'failed'; message: string };
