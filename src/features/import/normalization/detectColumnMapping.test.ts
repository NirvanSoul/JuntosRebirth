import {
  columnMappingHasMinimumRoles,
  detectColumnMapping,
} from '@/features/import/normalization/detectColumnMapping';

describe('detectColumnMapping', () => {
  it('detecta fecha, concepto e importe en español', () => {
    const mapping = detectColumnMapping(['Fecha', 'Concepto', 'Importe']);
    expect(mapping.get(0)).toBe('date');
    expect(mapping.get(1)).toBe('description');
    expect(mapping.get(2)).toBe('amount');
    expect(columnMappingHasMinimumRoles(mapping)).toBe(true);
  });

  it('detecta columnas separadas de débito y crédito', () => {
    const mapping = detectColumnMapping([
      'Date',
      'Description',
      'Debit',
      'Credit',
      'Balance',
    ]);
    expect(mapping.get(2)).toBe('debit');
    expect(mapping.get(3)).toBe('credit');
    expect(mapping.get(4)).toBe('balance');
    expect(columnMappingHasMinimumRoles(mapping)).toBe(true);
  });

  it('prefiere fecha de operación sobre fecha valor', () => {
    const mapping = detectColumnMapping([
      'Fecha operación',
      'Fecha valor',
      'Movimiento',
      'Cantidad',
    ]);
    expect(mapping.get(0)).toBe('date');
    expect(mapping.get(1)).not.toBe('date');
  });

  it('usa la fecha valor cuando no hay fecha de operación', () => {
    const mapping = detectColumnMapping(['Fecha valor', 'Concepto', 'Importe']);
    expect(mapping.get(0)).toBe('date');
  });

  it('no asume roles mínimos cuando falta el importe', () => {
    const mapping = detectColumnMapping(['Fecha', 'Concepto']);
    expect(columnMappingHasMinimumRoles(mapping)).toBe(false);
  });

  it('acepta un archivo de solo gastos con una única columna de cargo', () => {
    const mapping = detectColumnMapping(['Fecha', 'Concepto', 'Cargo']);
    expect(mapping.get(2)).toBe('debit');
    expect(columnMappingHasMinimumRoles(mapping)).toBe(true);
  });

  it('acepta un archivo de solo ingresos con una única columna de abono', () => {
    const mapping = detectColumnMapping(['Fecha', 'Concepto', 'Abono']);
    expect(mapping.get(2)).toBe('credit');
    expect(columnMappingHasMinimumRoles(mapping)).toBe(true);
  });

  it('detecta una columna de tipo (Cargo/Abono como texto)', () => {
    const mapping = detectColumnMapping([
      'Fecha',
      'Concepto',
      'Importe',
      'Tipo',
    ]);
    expect(mapping.get(3)).toBe('transactionType');
  });
});
