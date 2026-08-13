import {
  importAcceptedExtensions,
  importFileSizeLimitBytes,
  importMaxRows,
} from '@/features/import/constants/importLimits';
import type {
  ImportErrorCode,
  ImportSourceExtension,
} from '@/features/import/types';

export type ImportValidationFailure = {
  valid: false;
  errorCode: ImportErrorCode;
  message: string;
};

export type ImportFileValidationResult =
  { valid: true; extension: ImportSourceExtension } | ImportValidationFailure;

function getExtension(fileName: string): ImportSourceExtension | null {
  const match = /\.([a-z0-9]+)$/i.exec(fileName.trim());
  const extension = match?.[1]?.toLowerCase();
  return (importAcceptedExtensions as readonly string[]).includes(
    extension ?? '',
  )
    ? (extension as ImportSourceExtension)
    : null;
}

/**
 * Valida extensión y tamaño antes de leer el archivo. No confía únicamente
 * en el nombre: Android puede exponer un `content://` sin extensión fiable
 * en el MIME, así que un tamaño desconocido no bloquea el archivo aquí, solo
 * el que exceda el límite conocido (Bible §8, §62).
 */
export function validateImportFile(file: {
  name: string;
  sizeBytes: number | null;
}): ImportFileValidationResult {
  const extension = getExtension(file.name);
  if (!extension) {
    return {
      valid: false,
      errorCode: 'unsupported_file',
      message: 'Elige un archivo Excel (.xlsx, .xls) o CSV.',
    };
  }

  const limit = importFileSizeLimitBytes[extension];
  if (file.sizeBytes !== null && file.sizeBytes > limit) {
    const limitMb = Math.round(limit / (1024 * 1024));
    return {
      valid: false,
      errorCode: 'too_large',
      message: `Este archivo supera el tamaño máximo admitido (${limitMb} MB).`,
    };
  }

  return { valid: true, extension };
}

export function validateImportRowCount(
  rowCount: number,
): ImportValidationFailure | null {
  if (rowCount > importMaxRows) {
    return {
      valid: false,
      errorCode: 'too_many_rows',
      message: `Este archivo tiene demasiadas filas (máximo ${importMaxRows.toLocaleString('es-ES')}).`,
    };
  }

  return null;
}
