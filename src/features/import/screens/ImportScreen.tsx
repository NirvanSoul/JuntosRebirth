import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { DestructiveConfirmationPanel } from '@/components/overlays/DestructiveConfirmationPanel/DestructiveConfirmationPanel';
import { DetailDeleteIcon } from '@/components/overlays/DetailActionMenu/DetailActionIcons';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { SelectableOption } from '@/components/ui/SelectableOption/SelectableOption';
import { Text } from '@/components/ui/Text/Text';
import {
  CategoryPickerModal,
  type CategoryPickerSelection,
} from '@/features/categories/components/CategoryPickerModal/CategoryPickerModal';
import { CreateCategoryModal } from '@/features/categories/components/CreateCategoryModal/CreateCategoryModal';
import { createDefaultCategoryInputForSpace } from '@/features/categories/constants/defaultCategories';
import type { DefaultCategoryDefinition } from '@/features/categories/constants/defaultCategories';
import {
  createLocalCategories,
  createLocalCategory,
} from '@/features/categories/repositories/localCategoryRepository';
import type {
  Category,
  CreateCategoryInput,
} from '@/features/categories/types';
import {
  listCategoriesBySpace,
  validateCategoryName,
} from '@/features/categories/utils/categoryCatalog';
import { buildImportCandidates } from '@/features/import/buildImportCandidates';
import { ColumnMappingSheet } from '@/features/import/components/ColumnMappingSheet/ColumnMappingSheet';
import { ImportMerchantGroup } from '@/features/import/components/ImportMerchantGroup/ImportMerchantGroup';
import { ImportProgressAction } from '@/features/import/components/ImportProgressAction/ImportProgressAction';
import { ImportSummary } from '@/features/import/components/ImportSummary/ImportSummary';
import { importAcceptedMimeTypes } from '@/features/import/constants/importLimits';
import {
  columnMappingHasMinimumRoles,
  detectColumnMapping,
} from '@/features/import/normalization/detectColumnMapping';
import {
  SpreadsheetParseError,
  parseSpreadsheetFile,
} from '@/features/import/parsers/spreadsheetParser';
import { enqueueMerchantFeedback } from '@/features/import/repositories/localMerchantFeedbackQueueRepository';
import {
  listLocalMerchantRules,
  saveLocalMerchantRule,
} from '@/features/import/repositories/localMerchantRuleRepository';
import {
  cancelLocalImportBatch,
  completeLocalImportBatch,
  createLocalImportBatch,
  findLocalImportBatchByFileHash,
  listResumableLocalImportBatches,
  type ResumableLocalImportBatch,
  saveLocalImportBatchReview,
} from '@/features/import/repositories/localImportBatchRepository';
import type {
  ColumnMapping,
  ColumnRole,
  ImportedTransactionCandidate,
  ImportMerchantRule,
  ImportSourceExtension,
  ImportSummaryCounts,
} from '@/features/import/types';
import { computeImportFileHash } from '@/features/import/utils/computeImportFileHash';
import { groupImportCandidates } from '@/features/import/utils/groupImportCandidates';
import {
  validateImportFile,
  validateImportRowCount,
} from '@/features/import/validation/validateImportFile';
import { createLocalTransactions } from '@/features/transactions/repositories/localTransactionRepository';
import type {
  CreateTransactionDraft,
  SessionTransaction,
} from '@/features/transactions/types';
import {
  getCurrencyFlag,
  getCurrencyName,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import { iconSize } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/useTheme';

type ImportScreenProps = {
  activeSpaceId: string;
  activeSpaceName: string;
  /** Monedas activas del espacio; si hay 2 o más, se pide elegir la del documento (Bible §multi-currency). */
  availableCurrencies?: readonly CurrencyCode[];
  categories: readonly Category[];
  existingTransactions: readonly SessionTransaction[];
  fallbackCurrency: CurrencyCode;
  onCategoriesCreated: (created: readonly Category[]) => void;
  onClose: () => void;
  onImportComplete: (created: readonly SessionTransaction[]) => void;
  visible: boolean;
};

type Phase =
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

/** Fecha por defecto para desambiguar formatos: el público principal de juntoss usa DD/MM. */
const dayMonthPreference = 'DMY';

function formatSavedBatchDate(value: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function mappingHasCurrencyColumn(mapping: ColumnMapping): boolean {
  for (const role of mapping.values()) {
    if (role === 'currency') return true;
  }
  return false;
}

function isCandidateReady(candidate: ImportedTransactionCandidate): boolean {
  return (
    candidate.occurredOn !== null &&
    candidate.amountMinor !== null &&
    candidate.type !== 'unknown' &&
    candidate.categoryId !== null
  );
}

function computeSummaryCounts(
  candidates: readonly ImportedTransactionCandidate[],
): ImportSummaryCounts {
  let duplicates = 0;
  let needsReview = 0;

  for (const candidate of candidates) {
    if (candidate.duplicateStatus === 'exact') {
      duplicates += 1;
    } else if (candidate.issues.length > 0 || !isCandidateReady(candidate)) {
      needsReview += 1;
    }
  }

  return {
    detected: candidates.length,
    duplicates,
    needsReview,
    ready: candidates.length - duplicates - needsReview,
  };
}

/**
 * Anfitrión de la importación de movimientos (Excel/XLS/CSV, Bible Fase 1;
 * PDF fue eliminado por ADR-073). Sigue
 * el mismo patrón que otras pantallas a pantalla completa del proyecto
 * (`InvitePartnerScreen`): un único componente con una máquina de estados
 * `Phase`, montado dentro de `AppModal variant="expanded"`. Es autocontenido:
 * gestiona su propio picker de categorías para no acoplar este flujo al
 * estado ya extenso de `MainTabsNavigator`, y solo notifica hacia arriba lo
 * que debe sobrevivir a que se cierre (categorías y movimientos creados).
 */
export function ImportScreen({
  activeSpaceId,
  activeSpaceName,
  availableCurrencies = [],
  categories,
  existingTransactions,
  fallbackCurrency,
  onCategoriesCreated,
  onClose,
  onImportComplete,
  visible,
}: ImportScreenProps) {
  const { colors } = useTheme();
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [remainingImportNotice, setRemainingImportNotice] = useState<
    string | null
  >(null);
  const [documentCurrency, setDocumentCurrency] =
    useState<CurrencyCode>(fallbackCurrency);
  const [candidates, setCandidates] = useState<ImportedTransactionCandidate[]>(
    [],
  );
  const [localCategories, setLocalCategories] =
    useState<readonly Category[]>(categories);
  const [isCategoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [isCreateCategoryVisible, setCreateCategoryVisible] = useState(false);
  const [batchPendingDeletion, setBatchPendingDeletion] =
    useState<ResumableLocalImportBatch | null>(null);
  const [categoryPickerTargetGroupId, setCategoryPickerTargetGroupId] =
    useState<string | null>(null);
  const pickedFileUriRef = useRef<string | null>(null);
  const pickedFileHashRef = useRef<string | undefined>(undefined);
  const duplicateFileProceedRef = useRef<(() => void) | null>(null);
  const activeBatchIdRef = useRef<string | null>(null);
  const reviewCandidatesRef = useRef<ImportedTransactionCandidate[]>([]);
  const reviewWriteQueueRef = useRef<Promise<void>>(Promise.resolve());
  const activeSpaceCategories = listCategoriesBySpace(
    localCategories,
    activeSpaceId,
  );
  const candidateGroups = groupImportCandidates(candidates);

  const cleanupPickedFile = useCallback(() => {
    const uri = pickedFileUriRef.current;
    pickedFileUriRef.current = null;
    if (!uri) return;
    try {
      new File(uri).delete();
    } catch {
      // El archivo temporal puede ya no existir; no bloquea el flujo.
    }
  }, []);

  const replaceReviewCandidates = useCallback(
    (next: ImportedTransactionCandidate[]) => {
      reviewCandidatesRef.current = next;
      setCandidates(next);
      const batchId = activeBatchIdRef.current;
      if (!batchId) return;
      reviewWriteQueueRef.current = reviewWriteQueueRef.current
        .catch(() => undefined)
        .then(() => saveLocalImportBatchReview(batchId, next));
    },
    [],
  );

  const finishParsing = useCallback(
    (
      rows: readonly (readonly unknown[])[],
      mapping: ColumnMapping,
      merchantRules: readonly ImportMerchantRule[],
      sourceType: ImportSourceExtension,
      currency: CurrencyCode,
    ) => {
      const built = buildImportCandidates(rows, mapping, {
        spaceId: activeSpaceId,
        categories: localCategories,
        existingTransactions,
        fallbackCurrency: currency,
        dayMonthPreference,
        merchantRules,
      });

      if (built.length === 0) {
        setPhase({
          kind: 'failed',
          message:
            'No encontramos movimientos. Revisa que el archivo sea un extracto bancario con fechas e importes visibles.',
        });
        return;
      }

      const reviewCandidates = built.map((candidate) =>
        isCandidateReady(candidate)
          ? candidate
          : { ...candidate, selected: false },
      );
      void createLocalImportBatch({
        spaceId: activeSpaceId,
        sourceType,
        candidates: reviewCandidates,
        ...(pickedFileHashRef.current === undefined
          ? {}
          : { fileHash: pickedFileHashRef.current }),
      })
        .then((batch) => {
          activeBatchIdRef.current = batch.id;
          reviewCandidatesRef.current = reviewCandidates;
          setCandidates(reviewCandidates);
          setPhase({ kind: 'review' });
        })
        .catch(() => {
          setPhase({
            kind: 'failed',
            message: 'No pudimos preparar esta revisión para guardarla.',
          });
        });
    },
    [activeSpaceId, localCategories, existingTransactions],
  );

  const proceedAfterMapping = useCallback(
    (
      rows: readonly (readonly unknown[])[],
      mapping: ColumnMapping,
      merchantRules: readonly ImportMerchantRule[],
      sourceType: ImportSourceExtension,
    ) => {
      // Solo pedimos la moneda del documento cuando la hoja no trae su propia
      // columna de moneda por fila y el espacio maneja más de una (si no,
      // no hay nada que decidir).
      if (
        availableCurrencies.length > 1 &&
        !mappingHasCurrencyColumn(mapping)
      ) {
        setPhase({
          kind: 'select-currency',
          rows,
          mapping,
          merchantRules,
          sourceType,
        });
        return;
      }
      finishParsing(rows, mapping, merchantRules, sourceType, fallbackCurrency);
    },
    [availableCurrencies, fallbackCurrency, finishParsing],
  );

  const handlePickFile = useCallback(async () => {
    // Reintentar (p. ej. tras un archivo demasiado grande) no debe dejar en
    // caché la copia del intento anterior (Bible §9, §63).
    cleanupPickedFile();

    let result: DocumentPicker.DocumentPickerResult;
    try {
      result = await DocumentPicker.getDocumentAsync({
        type: [...importAcceptedMimeTypes],
        copyToCacheDirectory: true,
        multiple: false,
      });
    } catch {
      setPhase({
        kind: 'failed',
        message: 'No pudimos abrir el selector de archivos.',
      });
      return;
    }

    const asset = result.canceled ? null : result.assets[0];
    if (!asset) {
      onClose();
      return;
    }

    pickedFileUriRef.current = asset.uri;
    setPhase({ kind: 'validating' });

    const validation = validateImportFile({
      name: asset.name,
      sizeBytes: asset.size ?? null,
    });
    if (!validation.valid) {
      setPhase({ kind: 'failed', message: validation.message });
      return;
    }

    const continueParsing = async () => {
      setPhase({ kind: 'parsing' });
      let sheet;
      try {
        sheet = await parseSpreadsheetFile(asset.uri);
      } catch (caught) {
        setPhase({
          kind: 'failed',
          message:
            caught instanceof SpreadsheetParseError
              ? caught.message
              : 'No pudimos leer este archivo.',
        });
        return;
      }

      const rowCountError = validateImportRowCount(sheet.rows.length);
      if (rowCountError) {
        setPhase({ kind: 'failed', message: rowCountError.message });
        return;
      }

      const mapping = detectColumnMapping(sheet.headers);
      let merchantRules: readonly ImportMerchantRule[];
      try {
        merchantRules = await listLocalMerchantRules(activeSpaceId);
      } catch {
        setPhase({
          kind: 'failed',
          message: 'No pudimos preparar tus reglas de categorización.',
        });
        return;
      }

      if (!columnMappingHasMinimumRoles(mapping)) {
        setPhase({
          kind: 'mapping-columns',
          headers: sheet.headers,
          rows: sheet.rows,
          mapping,
          merchantRules,
          sourceType: validation.extension,
        });
        return;
      }

      proceedAfterMapping(
        sheet.rows,
        mapping,
        merchantRules,
        validation.extension,
      );
    };

    // El hash solo sirve para avisar de una reimportación; si falla, seguimos
    // sin bloquear el flujo (Bible §49: "solo si no existe equivalente" no
    // aplica a fallos puntuales de lectura).
    pickedFileHashRef.current = undefined;
    const fileHash = await computeImportFileHash(asset.uri).catch(
      () => undefined,
    );
    if (fileHash) {
      pickedFileHashRef.current = fileHash;
      const existingBatch = await findLocalImportBatchByFileHash(
        activeSpaceId,
        fileHash,
      ).catch(() => null);
      if (existingBatch) {
        duplicateFileProceedRef.current = () => void continueParsing();
        setPhase({
          kind: 'duplicate-file',
          existingBatchDate: formatSavedBatchDate(existingBatch.createdAt),
        });
        return;
      }
    }

    await continueParsing();
  }, [activeSpaceId, cleanupPickedFile, proceedAfterMapping, onClose]);

  const handleConfirmDuplicateFile = useCallback(() => {
    const proceed = duplicateFileProceedRef.current;
    duplicateFileProceedRef.current = null;
    proceed?.();
  }, []);

  const handleCancelDuplicateFile = useCallback(() => {
    duplicateFileProceedRef.current = null;
    cleanupPickedFile();
    onClose();
  }, [cleanupPickedFile, onClose]);

  const resumeBatch = useCallback((batch: ResumableLocalImportBatch) => {
    activeBatchIdRef.current = batch.id;
    reviewCandidatesRef.current = [...batch.candidates];
    setCandidates([...batch.candidates]);
    setPhase({ kind: 'review' });
  }, []);

  const handleReturnToSavedBatches = useCallback(async () => {
    try {
      await reviewWriteQueueRef.current.catch(() => undefined);
      const batches = await listResumableLocalImportBatches(activeSpaceId);
      setBatchPendingDeletion(null);
      setRemainingImportNotice(null);
      setPhase({ kind: 'saved-batches', batches });
    } catch {
      setPhase({
        kind: 'failed',
        message: 'No pudimos cargar tus revisiones guardadas.',
      });
    }
  }, [activeSpaceId]);

  const handleDiscardBatch = useCallback(
    async (batchId: string) => {
      try {
        await cancelLocalImportBatch(batchId);
        const batches = await listResumableLocalImportBatches(activeSpaceId);
        if (batches.length > 0) {
          setPhase({ kind: 'saved-batches', batches });
        } else {
          setPhase({ kind: 'idle' });
          void handlePickFile();
        }
      } catch {
        setPhase({
          kind: 'failed',
          message: 'No pudimos eliminar esta revisión. Inténtalo de nuevo.',
        });
      }
    },
    [activeSpaceId, handlePickFile],
  );

  // Snapshot: se repite solo al reabrir el modal o cambiar de espacio, no ante
  // cambios de `categories`/`handlePickFile` (borrarían el progreso). Supresión intencional.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setPhase({ kind: 'idle' });
    setRemainingImportNotice(null);
    setBatchPendingDeletion(null);
    setCandidates([]);
    reviewCandidatesRef.current = [];
    activeBatchIdRef.current = null;
    setLocalCategories(categories);
    setDocumentCurrency(fallbackCurrency);
    void listResumableLocalImportBatches(activeSpaceId)
      .then((batches) => {
        if (cancelled) return;
        if (batches.length > 0) {
          setPhase({ kind: 'saved-batches', batches });
          return;
        }
        void handlePickFile();
      })
      .catch(() => {
        if (!cancelled) void handlePickFile();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, activeSpaceId]);

  const handleClose = useCallback(() => {
    setBatchPendingDeletion(null);
    cleanupPickedFile();
    onClose();
  }, [cleanupPickedFile, onClose]);

  const handleChangeColumnRole = (columnIndex: number, role: ColumnRole) => {
    setPhase((current) => {
      if (current.kind !== 'mapping-columns') return current;
      const nextMapping = new Map(current.mapping);
      // Cada rol de uso único solo puede pertenecer a una columna.
      if (role !== 'ignore') {
        for (const [index, assignedRole] of nextMapping) {
          if (assignedRole === role && index !== columnIndex) {
            nextMapping.delete(index);
          }
        }
      }
      nextMapping.set(columnIndex, role);
      return { ...current, mapping: nextMapping };
    });
  };

  const handleConfirmMapping = () => {
    if (phase.kind !== 'mapping-columns') return;
    proceedAfterMapping(
      phase.rows,
      phase.mapping,
      phase.merchantRules,
      phase.sourceType,
    );
  };

  const handleSelectDocumentCurrency = (currency: CurrencyCode) => {
    if (phase.kind !== 'select-currency') return;
    setDocumentCurrency(currency);
    finishParsing(
      phase.rows,
      phase.mapping,
      phase.merchantRules,
      phase.sourceType,
      currency,
    );
  };

  const openCategoryPickerForCandidate = (candidateId: string) => {
    const group = candidateGroups.find((candidateGroup) =>
      candidateGroup.candidates.some(
        (candidate) => candidate.id === candidateId,
      ),
    );
    if (!group) return;
    openCategoryPickerForGroup(group.id);
  };

  const openCategoryPickerForGroup = (groupId: string) => {
    if (!candidateGroups.some((group) => group.id === groupId)) return;
    setCategoryPickerTargetGroupId(groupId);
    setCategoryPickerVisible(true);
  };

  const handleToggleSelected = (candidateId: string) => {
    const candidate = reviewCandidatesRef.current.find(
      (currentCandidate) => currentCandidate.id === candidateId,
    );
    if (!candidate) return;
    if (!candidate.selected && !isCandidateReady(candidate)) {
      // La categoría es una decisión del grupo, así que no dejamos una fila
      // bloqueada sin explicar qué falta.
      openCategoryPickerForCandidate(candidateId);
      return;
    }

    replaceReviewCandidates(
      reviewCandidatesRef.current.map((currentCandidate) => {
        if (currentCandidate.id !== candidateId) return currentCandidate;
        return { ...currentCandidate, selected: !currentCandidate.selected };
      }),
    );
  };

  const closeCategoryPicker = () => {
    setCategoryPickerVisible(false);
    setCategoryPickerTargetGroupId(null);
  };

  const handleAssignCategory = (groupId: string, categoryId: string) => {
    const group = candidateGroups.find(
      (candidateGroup) => candidateGroup.id === groupId,
    );
    if (!group) return;
    const candidateIds = new Set(
      group.candidates.map((candidate) => candidate.id),
    );

    replaceReviewCandidates(
      reviewCandidatesRef.current.map((candidate) => {
        if (!candidateIds.has(candidate.id)) return candidate;
        const updated: ImportedTransactionCandidate = {
          ...candidate,
          categoryId,
          issues: candidate.issues.filter(
            (issue) => issue.code !== 'unknown_category',
          ),
        };
        return {
          ...updated,
          // Al elegir una categoría para un comercio, todo el grupo queda
          // listo en una sola acción. Los duplicados exactos se preservan
          // deseleccionados como protección frente a dobles importaciones.
          selected:
            candidate.duplicateStatus !== 'exact' && isCandidateReady(updated),
        };
      }),
    );
    if (group.normalizedMerchant) {
      void saveLocalMerchantRule({
        spaceId: activeSpaceId,
        normalizedMerchant: group.normalizedMerchant,
        categoryId,
      }).catch(() => undefined);
    }
    closeCategoryPicker();
  };

  const handleCategorySelection = (
    selection: CategoryPickerSelection | null,
  ) => {
    if (!selection || !categoryPickerTargetGroupId) {
      closeCategoryPicker();
      return;
    }
    handleAssignCategory(categoryPickerTargetGroupId, selection.categoryId);
  };

  const handleToggleGroupSelected = (groupId: string) => {
    const group = candidateGroups.find(
      (candidateGroup) => candidateGroup.id === groupId,
    );
    if (!group) return;
    const candidateIds = new Set(
      group.candidates.map((candidate) => candidate.id),
    );
    const selectableCandidates = group.candidates.filter(
      (candidate) =>
        candidate.duplicateStatus !== 'exact' && isCandidateReady(candidate),
    );
    const allSelected =
      selectableCandidates.length > 0 &&
      selectableCandidates.every((candidate) => candidate.selected);
    const categoryId = group.candidates[0]?.categoryId ?? null;
    const hasOneCategory =
      categoryId !== null &&
      group.candidates.every(
        (candidate) => candidate.categoryId === categoryId,
      );

    if (!allSelected && !hasOneCategory) {
      openCategoryPickerForGroup(groupId);
      return;
    }

    replaceReviewCandidates(
      reviewCandidatesRef.current.map((candidate) => {
        if (!candidateIds.has(candidate.id)) return candidate;
        if (allSelected) return { ...candidate, selected: false };
        return {
          ...candidate,
          selected:
            candidate.duplicateStatus !== 'exact' &&
            isCandidateReady(candidate),
        };
      }),
    );
  };

  const handleCreateCategory = (input: CreateCategoryInput) => {
    const validation = validateCategoryName(
      input.name,
      localCategories,
      input.spaceId,
    );
    if (!validation.valid || input.spaceId !== activeSpaceId) return;

    void createLocalCategory({
      spaceId: input.spaceId,
      name: validation.name,
      icon: input.icon,
      colorToken: input.colorToken,
      isDefault: false,
    })
      .then((created) => {
        setLocalCategories((current) => [...current, created]);
        onCategoriesCreated([created]);
        setCreateCategoryVisible(false);
        if (categoryPickerTargetGroupId) {
          handleAssignCategory(categoryPickerTargetGroupId, created.id);
        }
      })
      .catch(() => undefined);
  };

  const handleCreateDefaultCategories = (
    definitions: readonly DefaultCategoryDefinition[],
  ) => {
    const existingTemplateKeys = new Set(
      activeSpaceCategories.map((category) => category.templateKey),
    );
    const pendingDefinitions = definitions.filter(
      (definition) => !existingTemplateKeys.has(definition.key),
    );
    if (pendingDefinitions.length === 0) return;

    void createLocalCategories(
      pendingDefinitions.map((definition) =>
        createDefaultCategoryInputForSpace(activeSpaceId, definition),
      ),
    )
      .then((created) => {
        setLocalCategories((current) => [...current, ...created]);
        onCategoriesCreated(created);
        if (categoryPickerTargetGroupId && created[0]) {
          handleAssignCategory(categoryPickerTargetGroupId, created[0].id);
        } else {
          closeCategoryPicker();
        }
      })
      .catch(() => undefined);
  };

  const handleConfirmImport = async () => {
    const selectedCandidates = reviewCandidatesRef.current.filter(
      (candidate) => candidate.selected && isCandidateReady(candidate),
    );
    const drafts: CreateTransactionDraft[] = selectedCandidates.map(
      (candidate) => ({
        spaceId: activeSpaceId,
        type: candidate.type as 'expense' | 'income',
        amountMinor: candidate.amountMinor!,
        currency: candidate.currency!,
        title: candidate.displayTitle,
        categoryId: candidate.categoryId!,
        occurredOn: candidate.occurredOn!,
        recurrence: 'once',
      }),
    );

    if (drafts.length === 0) return;

    setPhase({ kind: 'committing' });
    try {
      await reviewWriteQueueRef.current;
      const created = await createLocalTransactions(drafts);
      // Solo alimenta el consenso comunitario cuando la categoría final
      // corresponde a una clave canónica conocida (Bible §41: nada de
      // patrones genéricos ni categorías propias del usuario).
      for (const candidate of selectedCandidates) {
        const category = localCategories.find(
          (existing) => existing.id === candidate.categoryId,
        );
        if (category?.templateKey) {
          void enqueueMerchantFeedback({
            importItemId: candidate.id,
            canonicalCategoryKey: category.templateKey,
          }).catch(() => undefined);
        }
      }
      const batchId = activeBatchIdRef.current;
      if (batchId) {
        const remainingCount = await completeLocalImportBatch(
          batchId,
          new Map(
            selectedCandidates.map((candidate, index) => [
              candidate.id,
              created[index]!.id,
            ]),
          ),
        );
        if (remainingCount > 0) {
          const importedIds = new Set(
            selectedCandidates.map((candidate) => candidate.id),
          );
          const remainingCandidates = reviewCandidatesRef.current.filter(
            (candidate) => !importedIds.has(candidate.id),
          );
          reviewCandidatesRef.current = remainingCandidates;
          setCandidates(remainingCandidates);
          setRemainingImportNotice(
            `Importamos ${created.length}. Aún te quedan ${remainingCount} movimientos por revisar o seleccionar.`,
          );
          cleanupPickedFile();
          onImportComplete(created);
          setPhase({ kind: 'review' });
          return;
        }
      }
      cleanupPickedFile();
      onImportComplete(created);
      setPhase({ kind: 'complete', createdCount: created.length });
    } catch {
      setPhase({
        kind: 'failed',
        message: 'No pudimos guardar los movimientos. Inténtalo de nuevo.',
      });
    }
  };

  const selectedCount = candidates.filter(
    (candidate) => candidate.selected && isCandidateReady(candidate),
  ).length;
  const importableCandidateCount = candidates.filter(
    (candidate) =>
      candidate.duplicateStatus !== 'exact' && isCandidateReady(candidate),
  ).length;
  return (
    <AppModal
      containsScrollable
      extendContentIntoBottomInset
      onClose={handleClose}
      testID="import-screen"
      variant="expanded"
      visible={visible}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          {phase.kind === 'review' ? (
            <ModalCloseButton
              onPress={() => void handleReturnToSavedBatches()}
              variant="back"
            />
          ) : null}
          <View style={styles.headerText}>
            <Text accessibilityRole="header" variant="heading">
              Importar movimientos
            </Text>
            <Text tone="secondary" variant="label">
              {phase.kind === 'review'
                ? (remainingImportNotice ?? 'Revisa antes de importar')
                : phase.kind === 'saved-batches'
                  ? 'Tienes revisiones pendientes'
                  : phase.kind === 'duplicate-file'
                    ? 'Ya vimos este archivo antes'
                    : phase.kind === 'select-currency'
                      ? 'Elige la moneda de este documento'
                      : 'Estamos buscando tus movimientos.'}
            </Text>
          </View>
          {phase.kind !== 'review' ? (
            <ModalCloseButton onPress={handleClose} />
          ) : null}
        </View>

        {phase.kind === 'idle' ||
        phase.kind === 'validating' ||
        phase.kind === 'parsing' ||
        phase.kind === 'committing' ? (
          <View style={styles.loading} testID="import-loading">
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : null}

        {phase.kind === 'failed' ? (
          <View style={styles.body}>
            <Text tone="expense" variant="body">
              {phase.message}
            </Text>
            <ModalPrimaryAction
              accessibilityLabel="Elegir otro archivo"
              label="Elegir otro archivo"
              onPress={() => void handlePickFile()}
              variant="surface"
            />
          </View>
        ) : null}

        {phase.kind === 'duplicate-file' ? (
          <View style={styles.body} testID="import-duplicate-file">
            <Text variant="body">
              Ya importaste este mismo archivo el {phase.existingBatchDate}.
            </Text>
            <DestructiveConfirmationPanel
              cancelLabel="Cancelar"
              confirmLabel="Importar de todas formas"
              description="Si continúas, podrías crear movimientos duplicados."
              onCancel={handleCancelDuplicateFile}
              onConfirm={handleConfirmDuplicateFile}
              testID="import-duplicate-file-confirm"
              title="Archivo ya importado"
              tone="neutral"
            />
          </View>
        ) : null}

        {phase.kind === 'select-currency' ? (
          <View style={styles.body} testID="import-select-currency">
            <Text variant="body">
              No encontramos una columna de moneda en el archivo. ¿En qué moneda
              están los movimientos de este documento?
            </Text>
            <View accessibilityRole="radiogroup" style={styles.rows}>
              {availableCurrencies.map((code) => (
                <SelectableOption
                  accessibilityLabel={`${getCurrencyFlag(code)} ${getCurrencyName(code)} (${code})`}
                  indicatorTestID={`import-currency-${code}-check`}
                  key={code}
                  label={`${getCurrencyFlag(code)}  ${getCurrencyName(code)} · ${code}`}
                  onPress={() => handleSelectDocumentCurrency(code)}
                  selected={code === documentCurrency}
                  testID={`import-currency-${code}-option`}
                />
              ))}
            </View>
          </View>
        ) : null}

        {phase.kind === 'complete' ? (
          <View style={styles.body}>
            <Text tone="cta" variant="body">
              Tus movimientos ya están en juntoss.
            </Text>
            <ModalPrimaryAction
              accessibilityLabel="Listo"
              label="Listo"
              onPress={handleClose}
            />
          </View>
        ) : null}

        {phase.kind === 'saved-batches' ? (
          <View style={styles.savedBatches} testID="import-center">
            <Text variant="body">
              Retoma una revisión guardada o empieza una importación nueva.
            </Text>
            {batchPendingDeletion ? (
              <DestructiveConfirmationPanel
                description={`Se eliminará esta revisión guardada y sus ${batchPendingDeletion.totalItems} movimientos pendientes no se importarán.`}
                onCancel={() => setBatchPendingDeletion(null)}
                onConfirm={() => {
                  const batchId = batchPendingDeletion.id;
                  setBatchPendingDeletion(null);
                  void handleDiscardBatch(batchId);
                }}
                testID="import-delete-panel"
                title="¿Eliminar esta importación?"
              />
            ) : null}
            <BottomSheetScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.rows}>
                {phase.batches.map((batch) => (
                  <View
                    key={batch.id}
                    style={[styles.savedBatch, { borderColor: colors.border }]}
                  >
                    <Pressable
                      accessibilityLabel={`Revisar importación de ${batch.totalItems} movimientos`}
                      accessibilityRole="button"
                      onPress={() => resumeBatch(batch)}
                      style={({ pressed }) => [
                        styles.savedBatchContent,
                        pressed && styles.pressed,
                      ]}
                      testID={`import-resume-${batch.id}`}
                    >
                      <View style={styles.savedBatchMain}>
                        <Text variant="bodyStrong" weight="semibold">
                          {batch.totalItems} movimientos ·{' '}
                          {batch.sourceType.toUpperCase()}
                        </Text>
                        <View style={styles.savedBatchTimestamp}>
                          <Ionicons
                            color={colors.textMuted}
                            name="time-outline"
                            size={iconSize.xs}
                          />
                          <Text tone="secondary" variant="footnote">
                            Guardada {formatSavedBatchDate(batch.updatedAt)}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.reviewButton,
                          { backgroundColor: colors.cta },
                        ]}
                      >
                        <Text
                          tone="onBrand"
                          variant="footnote"
                          weight="semibold"
                        >
                          Revisar
                        </Text>
                        <Ionicons
                          color={colors.onBrand}
                          name="arrow-forward"
                          size={iconSize.xs}
                        />
                      </View>
                    </Pressable>
                    <View style={styles.savedBatchBadges}>
                      <Pressable
                        accessibilityLabel={`Eliminar importación guardada de ${batch.totalItems} movimientos`}
                        accessibilityRole="button"
                        hitSlop={spacing.sm}
                        onPress={() => setBatchPendingDeletion(batch)}
                        style={({ pressed }) => [
                          styles.savedBatchBadge,
                          styles.savedBatchDeleteBadge,
                          {
                            backgroundColor: colors.expense,
                            borderColor: colors.expense,
                          },
                          pressed && styles.pressed,
                        ]}
                        testID={`import-delete-${batch.id}`}
                      >
                        <DetailDeleteIcon
                          color={colors.onBrand}
                          size={iconSize.xs}
                        />
                      </Pressable>
                      <View
                        style={[
                          styles.savedBatchBadge,
                          {
                            backgroundColor: colors.ctaSoft,
                            borderColor: colors.cta,
                          },
                        ]}
                      >
                        <Text tone="cta" variant="footnote" weight="semibold">
                          {batch.reviewItems} por revisar
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.savedBatchBadge,
                          {
                            backgroundColor: colors.surfaceMuted,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <Text
                          tone="secondary"
                          variant="footnote"
                          weight="semibold"
                        >
                          {batch.duplicateItems} duplicados
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </BottomSheetScrollView>
            <ModalPrimaryAction
              accessibilityLabel="Elegir un archivo nuevo"
              label="Elegir archivo nuevo"
              onPress={() => void handlePickFile()}
              variant="surface"
            />
          </View>
        ) : null}

        {phase.kind === 'review' ? (
          <View style={styles.reviewContainer}>
            <BottomSheetScrollView
              contentContainerStyle={styles.reviewScrollContent}
              showsVerticalScrollIndicator={false}
              style={styles.reviewScroll}
            >
              <View style={styles.rows}>
                {candidateGroups.map((group) => {
                  const categoryId = group.candidates[0]?.categoryId ?? null;
                  const hasOneCategory =
                    categoryId !== null &&
                    group.candidates.every(
                      (candidate) => candidate.categoryId === categoryId,
                    );

                  return (
                    <ImportMerchantGroup
                      category={
                        hasOneCategory
                          ? (activeSpaceCategories.find(
                              (category) => category.id === categoryId,
                            ) ?? null)
                          : null
                      }
                      group={group}
                      key={group.id}
                      onPressCategory={() => {
                        openCategoryPickerForGroup(group.id);
                      }}
                      onToggleCandidate={handleToggleSelected}
                      onToggleSelected={() =>
                        handleToggleGroupSelected(group.id)
                      }
                    />
                  );
                })}
              </View>
            </BottomSheetScrollView>
            <View style={styles.floatingSummary}>
              <ImportSummary counts={computeSummaryCounts(candidates)} />
            </View>
            <View style={styles.floatingActions}>
              <ImportProgressAction
                onPress={() => void handleConfirmImport()}
                selectedCount={selectedCount}
                totalCount={importableCandidateCount}
              />
            </View>
          </View>
        ) : null}
      </View>

      {phase.kind === 'mapping-columns' ? (
        <ColumnMappingSheet
          canConfirm={columnMappingHasMinimumRoles(phase.mapping)}
          headers={phase.headers}
          mapping={phase.mapping}
          onChangeRole={handleChangeColumnRole}
          onClose={handleClose}
          onConfirm={handleConfirmMapping}
          visible={phase.kind === 'mapping-columns'}
        />
      ) : null}

      <CategoryPickerModal
        categories={activeSpaceCategories}
        mode="select"
        onClose={closeCategoryPicker}
        onCreateCategory={() => setCreateCategoryVisible(true)}
        onCreateTemplates={handleCreateDefaultCategories}
        onSelect={handleCategorySelection}
        selectedCategoryId={
          candidateGroups.find(
            (group) => group.id === categoryPickerTargetGroupId,
          )?.candidates[0]?.categoryId ?? null
        }
        visible={isCategoryPickerVisible}
      />
      <CreateCategoryModal
        categories={localCategories}
        onClose={() => setCreateCategoryVisible(false)}
        onSubmit={handleCreateCategory}
        spaceId={activeSpaceId}
        spaceName={activeSpaceName}
        visible={isCreateCategoryVisible}
      />
    </AppModal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headerText: { flex: 1, gap: spacing.xs },
  loading: { paddingVertical: spacing.xl, alignItems: 'center' },
  body: { gap: spacing.md },
  reviewContainer: { flex: 1, gap: spacing.md },
  reviewScroll: { flex: 1 },
  reviewScrollContent: {
    paddingTop: 112,
    paddingBottom: 136,
  },
  floatingSummary: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  savedBatches: { flex: 1, gap: spacing.md, paddingBottom: spacing.lg },
  savedBatch: {
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  savedBatchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  savedBatchMain: { flex: 1, gap: spacing.sm },
  savedBatchTimestamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  savedBatchBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.xl,
    rowGap: spacing.sm,
  },
  savedBatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radii.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    transform: [{ scale: 1.1 }],
  },
  savedBatchDeleteBadge: {
    justifyContent: 'center',
    minWidth: 28,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressed: { opacity: 0.78 },
  rows: { gap: spacing.lg, paddingBottom: spacing.lg },
  floatingActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    gap: spacing.sm,
    paddingBottom: spacing.lg,
    zIndex: 2,
  },
});
