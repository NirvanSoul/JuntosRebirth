import {
  validateImportFile,
  validateImportRowCount,
} from '@/features/import/validation/validateImportFile';

describe('validateImportFile', () => {
  it('acepta un .xlsx dentro del límite de tamaño', () => {
    const result = validateImportFile({
      name: 'movimientos.xlsx',
      sizeBytes: 1024,
    });
    expect(result).toEqual({ valid: true, extension: 'xlsx' });
  });

  it('acepta un .csv sin tamaño conocido', () => {
    const result = validateImportFile({
      name: 'movimientos.csv',
      sizeBytes: null,
    });
    expect(result).toEqual({ valid: true, extension: 'csv' });
  });

  it('rechaza un .pdf: la app ya no soporta importar PDF', () => {
    const result = validateImportFile({
      name: 'extracto.pdf',
      sizeBytes: 1024,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errorCode).toBe('unsupported_file');
  });

  it('rechaza una extensión no soportada', () => {
    const result = validateImportFile({
      name: 'extracto.docx',
      sizeBytes: 100,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errorCode).toBe('unsupported_file');
  });

  it('rechaza un archivo sin extensión', () => {
    const result = validateImportFile({ name: 'extracto', sizeBytes: 100 });
    expect(result.valid).toBe(false);
  });

  it('rechaza un archivo que supera el límite de tamaño', () => {
    const result = validateImportFile({
      name: 'movimientos.csv',
      sizeBytes: 11 * 1024 * 1024,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errorCode).toBe('too_large');
  });
});

describe('validateImportRowCount', () => {
  it('acepta un número de filas dentro del límite', () => {
    expect(validateImportRowCount(100)).toBeNull();
  });

  it('rechaza demasiadas filas', () => {
    const result = validateImportRowCount(10_001);
    expect(result?.errorCode).toBe('too_many_rows');
  });
});
