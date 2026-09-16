const mockSheetJsLoaded = jest.fn();
jest.mock('xlsx', () => {
  mockSheetJsLoaded();
  return { read: jest.fn(() => ({ SheetNames: [] })) };
});
jest.mock('expo-file-system', () => ({
  File: jest.fn(() => ({ base64: async () => 'fake-workbook' })),
}));

it('aplaza SheetJS hasta seleccionar un archivo y reutiliza el módulo cargado', async () => {
  const parser = jest.requireActual<typeof import('./spreadsheetParser')>(
    './spreadsheetParser',
  );
  expect(mockSheetJsLoaded).not.toHaveBeenCalled();
  await expect(
    parser.parseSpreadsheetFile('file:///fake.xlsx'),
  ).rejects.toThrow('ninguna hoja');
  await expect(
    parser.parseSpreadsheetFile('file:///fake.xlsx'),
  ).rejects.toThrow('ninguna hoja');
  expect(mockSheetJsLoaded).toHaveBeenCalledTimes(1);
});
