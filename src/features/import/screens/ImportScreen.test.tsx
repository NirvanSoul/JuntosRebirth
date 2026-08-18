import { fireEvent, waitFor } from '@testing-library/react-native';

import * as DocumentPicker from 'expo-document-picker';

import { ImportScreen } from '@/features/import/screens/ImportScreen';
import { buildImportCandidates } from '@/features/import/buildImportCandidates';
import {
  columnMappingHasMinimumRoles,
  detectColumnMapping,
} from '@/features/import/normalization/detectColumnMapping';
import { parseSpreadsheetFile } from '@/features/import/parsers/spreadsheetParser';
import { listLocalMerchantRules } from '@/features/import/repositories/localMerchantRuleRepository';
import {
  cancelLocalImportBatch,
  completeLocalImportBatch,
  createLocalImportBatch,
  findLocalImportBatchByFileHash,
  listResumableLocalImportBatches,
  saveLocalImportBatchReview,
  type ResumableLocalImportBatch,
} from '@/features/import/repositories/localImportBatchRepository';
import { enqueueMerchantFeedback } from '@/features/import/repositories/localMerchantFeedbackQueueRepository';
import type { ImportedTransactionCandidate } from '@/features/import/types';
import { computeImportFileHash } from '@/features/import/utils/computeImportFileHash';
import { createLocalTransactions } from '@/features/transactions/repositories/localTransactionRepository';
import type { Category } from '@/features/categories/types';
import { formatCurrency } from '@/lib/currency/formatCurrency';
import { renderWithTheme } from '@/test/renderWithTheme';

jest.mock('@/components/overlays/AppModal/AppModal', () => ({
  AppModal: ({
    children,
    visible,
  }: {
    children: React.ReactNode;
    visible: boolean;
  }) => (visible ? children : null),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => ({ delete: jest.fn() })),
}));

jest.mock('@/features/import/utils/computeImportFileHash', () => ({
  computeImportFileHash: jest.fn(),
}));

jest.mock('@/features/import/parsers/spreadsheetParser', () => ({
  parseSpreadsheetFile: jest.fn(),
  SpreadsheetParseError: class SpreadsheetParseError extends Error {},
}));

jest.mock('@/features/import/normalization/detectColumnMapping', () => ({
  detectColumnMapping: jest.fn(),
  columnMappingHasMinimumRoles: jest.fn(),
}));

jest.mock('@/features/import/buildImportCandidates', () => ({
  buildImportCandidates: jest.fn(),
}));

jest.mock('@/features/import/repositories/localMerchantRuleRepository', () => ({
  listLocalMerchantRules: jest.fn(),
  saveLocalMerchantRule: jest.fn(),
}));

jest.mock('@/features/import/repositories/localImportBatchRepository', () => ({
  createLocalImportBatch: jest.fn(),
  findLocalImportBatchByFileHash: jest.fn(),
  listResumableLocalImportBatches: jest.fn(),
  cancelLocalImportBatch: jest.fn(),
  completeLocalImportBatch: jest.fn(),
  saveLocalImportBatchReview: jest.fn(),
}));

jest.mock(
  '@/features/import/repositories/localMerchantFeedbackQueueRepository',
  () => ({ enqueueMerchantFeedback: jest.fn() }),
);

jest.mock(
  '@/features/transactions/repositories/localTransactionRepository',
  () => ({
    createLocalTransactions: jest.fn(),
  }),
);

jest.mock('@/features/categories/repositories/localCategoryRepository', () => ({
  createLocalCategories: jest.fn(),
  createLocalCategory: jest.fn(),
}));

const groceriesCategory: Category = {
  id: 'groceries',
  spaceId: 'personal',
  name: 'Supermercado',
  icon: 'shopping-cart',
  colorToken: 'orange',
  isDefault: true,
  templateKey: 'groceries',
  isArchived: false,
};

const readyCandidate: ImportedTransactionCandidate = {
  id: 'candidate-1',
  sourceRowNumber: 1,
  rawDescription: 'MERCADONA MADRID',
  normalizedMerchant: 'mercadona',
  displayTitle: 'Mercadona',
  occurredOn: '2026-08-01',
  amountMinor: 3244,
  currency: 'EUR',
  type: 'expense',
  suggestedCategoryId: 'groceries',
  categoryId: 'groceries',
  duplicateStatus: 'none',
  issues: [],
  selected: true,
};

const pickedAsset = {
  uri: 'file:///tmp/statement.xlsx',
  name: 'statement.xlsx',
  size: 1024,
  mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

function baseProps(
  overrides: Partial<Parameters<typeof ImportScreen>[0]> = {},
) {
  return {
    activeSpaceId: 'personal',
    activeSpaceName: 'Personal',
    categories: [groceriesCategory],
    existingTransactions: [],
    fallbackCurrency: 'EUR' as const,
    onCategoriesCreated: jest.fn(),
    onClose: jest.fn(),
    onImportComplete: jest.fn(),
    visible: true,
    ...overrides,
  };
}

describe('ImportScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (listResumableLocalImportBatches as jest.Mock).mockResolvedValue([]);
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [pickedAsset],
    });
    (computeImportFileHash as jest.Mock).mockResolvedValue('hash-1');
    (findLocalImportBatchByFileHash as jest.Mock).mockResolvedValue(null);
    (parseSpreadsheetFile as jest.Mock).mockResolvedValue({
      headers: ['Fecha', 'Concepto', 'Importe'],
      rows: [['2026-08-01', 'MERCADONA MADRID', '-32,44']],
    });
    (detectColumnMapping as jest.Mock).mockReturnValue(
      new Map([
        [0, 'date'],
        [1, 'description'],
        [2, 'amount'],
      ]),
    );
    (columnMappingHasMinimumRoles as jest.Mock).mockReturnValue(true);
    (listLocalMerchantRules as jest.Mock).mockResolvedValue([]);
    (buildImportCandidates as jest.Mock).mockReturnValue([readyCandidate]);
    (createLocalImportBatch as jest.Mock).mockResolvedValue({
      id: 'batch-1',
      spaceId: 'personal',
      sourceType: 'xlsx',
      status: 'ready',
      totalItems: 1,
      reviewItems: 0,
      duplicateItems: 0,
      createdAt: '2026-08-09T10:00:00.000Z',
      updatedAt: '2026-08-09T10:00:00.000Z',
    });
    (completeLocalImportBatch as jest.Mock).mockResolvedValue(0);
    (enqueueMerchantFeedback as jest.Mock).mockResolvedValue(undefined);
    (createLocalTransactions as jest.Mock).mockResolvedValue([
      {
        ...readyCandidate,
        id: 'tx-1',
        spaceId: 'personal',
        updatedAt: '2026-08-09T10:00:00.000Z',
      },
    ]);
  });

  it('analiza el archivo elegido y muestra la revisión lista para importar', async () => {
    const screen = await renderWithTheme(<ImportScreen {...baseProps()} />);

    expect(await screen.findByTestId('import-confirm')).toBeTruthy();
    expect(createLocalImportBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: 'personal',
        sourceType: 'xlsx',
        fileHash: 'hash-1',
      }),
    );
  });

  it('si hay revisiones guardadas, las muestra primero y permite retomarlas', async () => {
    const savedBatch: ResumableLocalImportBatch = {
      id: 'saved-batch',
      spaceId: 'personal',
      sourceType: 'xlsx',
      status: 'needs_review',
      totalItems: 1,
      reviewItems: 1,
      duplicateItems: 0,
      createdAt: '2026-08-08T10:00:00.000Z',
      updatedAt: '2026-08-08T10:00:00.000Z',
      candidates: [readyCandidate],
    };
    (listResumableLocalImportBatches as jest.Mock).mockResolvedValue([
      savedBatch,
    ]);

    const screen = await renderWithTheme(<ImportScreen {...baseProps()} />);

    expect(await screen.findByTestId('import-center')).toBeTruthy();
    expect(DocumentPicker.getDocumentAsync).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('import-resume-saved-batch'));

    expect(await screen.findByTestId('import-confirm')).toBeTruthy();
  });

  it('avisa si el archivo ya se importó antes y continúa solo si el usuario lo confirma', async () => {
    (findLocalImportBatchByFileHash as jest.Mock).mockResolvedValue({
      id: 'previous-batch',
      status: 'imported',
      createdAt: '2026-08-01T10:00:00.000Z',
    });

    const screen = await renderWithTheme(<ImportScreen {...baseProps()} />);

    expect(await screen.findByTestId('import-duplicate-file')).toBeTruthy();
    expect(parseSpreadsheetFile).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Importar de todas formas'));

    expect(await screen.findByTestId('import-confirm')).toBeTruthy();
    expect(parseSpreadsheetFile).toHaveBeenCalledTimes(1);
  });

  it('cancelar el aviso de archivo duplicado cierra la pantalla sin analizarlo', async () => {
    (findLocalImportBatchByFileHash as jest.Mock).mockResolvedValue({
      id: 'previous-batch',
      status: 'imported',
      createdAt: '2026-08-01T10:00:00.000Z',
    });
    const onClose = jest.fn();

    const screen = await renderWithTheme(
      <ImportScreen {...baseProps({ onClose })} />,
    );

    expect(await screen.findByTestId('import-duplicate-file')).toBeTruthy();
    fireEvent.press(screen.getByText('Cancelar'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(parseSpreadsheetFile).not.toHaveBeenCalled();
  });

  it('confirmar la importación crea los movimientos, avisa arriba y encola feedback comunitario', async () => {
    const onImportComplete = jest.fn();
    const screen = await renderWithTheme(
      <ImportScreen {...baseProps({ onImportComplete })} />,
    );

    fireEvent.press(await screen.findByTestId('import-confirm'));

    await waitFor(() =>
      expect(createLocalTransactions).toHaveBeenCalledWith([
        expect.objectContaining({
          spaceId: 'personal',
          type: 'expense',
          amountMinor: 3244,
          currency: 'EUR',
          categoryId: 'groceries',
          occurredOn: '2026-08-01',
        }),
      ]),
    );
    expect(enqueueMerchantFeedback).toHaveBeenCalledWith({
      importItemId: 'candidate-1',
      canonicalCategoryKey: 'groceries',
    });
    expect(
      await screen.findByText('Tus movimientos ya están en juntoss.'),
    ).toBeTruthy();
    expect(onImportComplete).toHaveBeenCalled();
  });

  it('no encola feedback comunitario para una categoría propia del usuario, sin templateKey', async () => {
    const customCategory: Category = {
      id: 'custom-1',
      spaceId: 'personal',
      name: 'Piso nuevo',
      icon: 'shopping-cart',
      colorToken: 'orange',
      isDefault: false,
      isArchived: false,
    };
    (buildImportCandidates as jest.Mock).mockReturnValue([
      { ...readyCandidate, categoryId: 'custom-1', suggestedCategoryId: null },
    ]);

    const screen = await renderWithTheme(
      <ImportScreen
        {...baseProps({ categories: [groceriesCategory, customCategory] })}
      />,
    );

    fireEvent.press(await screen.findByTestId('import-confirm'));

    await waitFor(() => expect(createLocalTransactions).toHaveBeenCalled());
    expect(enqueueMerchantFeedback).not.toHaveBeenCalled();
  });

  it('si no se detecta ningún movimiento, muestra un error con opción de reintentar', async () => {
    (buildImportCandidates as jest.Mock).mockReturnValue([]);

    const screen = await renderWithTheme(<ImportScreen {...baseProps()} />);

    expect(
      await screen.findByText(
        'No encontramos movimientos. Revisa que el archivo sea un extracto bancario con fechas e importes visibles.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Elegir otro archivo')).toBeTruthy();
  });

  it('si el espacio tiene una sola moneda activa, no pide elegir moneda del documento', async () => {
    const screen = await renderWithTheme(
      <ImportScreen {...baseProps({ availableCurrencies: ['EUR'] })} />,
    );

    expect(await screen.findByTestId('import-confirm')).toBeTruthy();
    expect(screen.queryByTestId('import-select-currency')).toBeNull();
  });

  it('si el espacio tiene 2+ monedas y el archivo no trae columna de moneda, pide elegirla antes de analizar', async () => {
    const screen = await renderWithTheme(
      <ImportScreen {...baseProps({ availableCurrencies: ['EUR', 'USD'] })} />,
    );

    expect(await screen.findByTestId('import-select-currency')).toBeTruthy();
    expect(buildImportCandidates).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('import-currency-USD-option'));

    expect(await screen.findByTestId('import-confirm')).toBeTruthy();
    expect(buildImportCandidates).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ fallbackCurrency: 'USD' }),
    );
  });

  it('si el archivo ya trae una columna de moneda, no pide elegirla aunque haya 2+ monedas activas', async () => {
    (detectColumnMapping as jest.Mock).mockReturnValue(
      new Map([
        [0, 'date'],
        [1, 'description'],
        [2, 'amount'],
        [3, 'currency'],
      ]),
    );

    const screen = await renderWithTheme(
      <ImportScreen {...baseProps({ availableCurrencies: ['EUR', 'USD'] })} />,
    );

    expect(await screen.findByTestId('import-confirm')).toBeTruthy();
    expect(screen.queryByTestId('import-select-currency')).toBeNull();
  });

  it('descarta una revisión guardada y vuelve al centro de importaciones', async () => {
    const savedBatch: ResumableLocalImportBatch = {
      id: 'saved-batch',
      spaceId: 'personal',
      sourceType: 'xlsx',
      status: 'needs_review',
      totalItems: 1,
      reviewItems: 1,
      duplicateItems: 0,
      createdAt: '2026-08-08T10:00:00.000Z',
      updatedAt: '2026-08-08T10:00:00.000Z',
      candidates: [readyCandidate],
    };
    (listResumableLocalImportBatches as jest.Mock)
      .mockResolvedValueOnce([savedBatch])
      .mockResolvedValueOnce([]);
    (cancelLocalImportBatch as jest.Mock).mockResolvedValue(undefined);

    const screen = await renderWithTheme(<ImportScreen {...baseProps()} />);
    await screen.findByTestId('import-center');

    fireEvent.press(screen.getByTestId('import-delete-saved-batch'));
    fireEvent.press(await screen.findByText('Eliminar'));

    await waitFor(() =>
      expect(cancelLocalImportBatch).toHaveBeenCalledWith('saved-batch'),
    );
    // Sin más revisiones pendientes, vuelve a abrir el picker de archivos.
    await waitFor(() =>
      expect(DocumentPicker.getDocumentAsync).toHaveBeenCalled(),
    );
  });

  it('reinicia el flujo cuando el modal vuelve a abrirse', async () => {
    const screen = await renderWithTheme(<ImportScreen {...baseProps()} />);
    await waitFor(() =>
      expect(listResumableLocalImportBatches).toHaveBeenCalledTimes(1),
    );

    await screen.rerender(<ImportScreen {...baseProps({ visible: false })} />);
    await screen.rerender(<ImportScreen {...baseProps({ visible: true })} />);

    await waitFor(() =>
      expect(listResumableLocalImportBatches).toHaveBeenCalledTimes(2),
    );
  });

  it('reinicia el flujo al cambiar de espacio', async () => {
    const screen = await renderWithTheme(<ImportScreen {...baseProps()} />);
    await waitFor(() =>
      expect(listResumableLocalImportBatches).toHaveBeenCalledTimes(1),
    );

    await screen.rerender(
      <ImportScreen {...baseProps({ activeSpaceId: 'couple' })} />,
    );

    await waitFor(() =>
      expect(listResumableLocalImportBatches).toHaveBeenCalledTimes(2),
    );
    expect(listResumableLocalImportBatches).toHaveBeenLastCalledWith('couple');
  });

  it('no reinicia el flujo cuando cambian las categorías (snapshot)', async () => {
    const screen = await renderWithTheme(<ImportScreen {...baseProps()} />);
    await waitFor(() =>
      expect(listResumableLocalImportBatches).toHaveBeenCalledTimes(1),
    );

    const anotherCategory = {
      ...groceriesCategory,
      id: 'other-category',
      name: 'Otra categoría',
    };
    await screen.rerender(
      <ImportScreen
        {...baseProps({ categories: [groceriesCategory, anotherCategory] })}
      />,
    );

    expect(listResumableLocalImportBatches).toHaveBeenCalledTimes(1);
  });

  it('re-captura las categorías y la moneda al reabrir el modal', async () => {
    const screen = await renderWithTheme(<ImportScreen {...baseProps()} />);
    await waitFor(() => expect(buildImportCandidates).toHaveBeenCalledTimes(1));

    await screen.rerender(<ImportScreen {...baseProps({ visible: false })} />);

    const anotherCategory = {
      ...groceriesCategory,
      id: 'other-category',
      name: 'Otra categoría',
    };
    await screen.rerender(
      <ImportScreen
        {...baseProps({
          visible: true,
          categories: [groceriesCategory, anotherCategory],
          fallbackCurrency: 'USD',
        })}
      />,
    );

    await waitFor(() => expect(buildImportCandidates).toHaveBeenCalledTimes(2));
    expect(buildImportCandidates).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        categories: [groceriesCategory, anotherCategory],
        fallbackCurrency: 'USD',
      }),
    );
  });

  it('usa el catálogo del espacio nuevo al cambiar de espacio', async () => {
    const screen = await renderWithTheme(<ImportScreen {...baseProps()} />);
    await waitFor(() => expect(buildImportCandidates).toHaveBeenCalledTimes(1));

    const coupleCategory = {
      ...groceriesCategory,
      id: 'couple-category',
      name: 'Categoría pareja',
      spaceId: 'couple',
    };
    await screen.rerender(
      <ImportScreen
        {...baseProps({
          activeSpaceId: 'couple',
          activeSpaceName: 'Juntos',
          categories: [coupleCategory],
        })}
      />,
    );

    await waitFor(() => expect(buildImportCandidates).toHaveBeenCalledTimes(2));
    expect(buildImportCandidates).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        spaceId: 'couple',
        categories: [coupleCategory],
      }),
    );
  });

  it('al cambiar de espacio, reinicia la moneda documental al fallbackCurrency del nuevo espacio', async () => {
    const screen = await renderWithTheme(
      <ImportScreen
        {...baseProps({
          activeSpaceId: 'space-eur',
          availableCurrencies: ['EUR'],
          fallbackCurrency: 'EUR',
        })}
      />,
    );
    await waitFor(() => expect(buildImportCandidates).toHaveBeenCalledTimes(1));

    await screen.rerender(
      <ImportScreen
        {...baseProps({
          activeSpaceId: 'space-ves',
          availableCurrencies: ['VES'],
          fallbackCurrency: 'VES',
        })}
      />,
    );

    await waitFor(() => expect(buildImportCandidates).toHaveBeenCalledTimes(2));
    expect(buildImportCandidates).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        spaceId: 'space-ves',
        fallbackCurrency: 'VES',
      }),
    );
  });

  it('reanuda un lote con moneda nula en un espacio VES y lo repara, muestra e importa como VES', async () => {
    const nullCurrencyCandidate: ImportedTransactionCandidate = {
      ...readyCandidate,
      id: 'candidate-null',
      currency: null,
    };
    const savedBatch: ResumableLocalImportBatch = {
      id: 'saved-batch-ves',
      spaceId: 'space-ves',
      sourceType: 'csv',
      status: 'needs_review',
      totalItems: 1,
      reviewItems: 1,
      duplicateItems: 0,
      createdAt: '2026-08-08T10:00:00.000Z',
      updatedAt: '2026-08-08T10:00:00.000Z',
      candidates: [nullCurrencyCandidate],
    };
    (listResumableLocalImportBatches as jest.Mock).mockResolvedValue([
      savedBatch,
    ]);

    const screen = await renderWithTheme(
      <ImportScreen
        {...baseProps({
          activeSpaceId: 'space-ves',
          activeSpaceName: 'Juntos',
          availableCurrencies: ['VES'],
          fallbackCurrency: 'VES',
        })}
      />,
    );

    expect(await screen.findByTestId('import-center')).toBeTruthy();
    fireEvent.press(screen.getByTestId('import-resume-saved-batch-ves'));

    // Persiste la reparación con la moneda del espacio.
    await waitFor(() =>
      expect(saveLocalImportBatchReview).toHaveBeenCalledWith(
        'saved-batch-ves',
        [expect.objectContaining({ id: 'candidate-null', currency: 'VES' })],
      ),
    );

    // La fila se muestra como VES, sin caer al euro por defecto.
    expect(screen.getByText(formatCurrency(3244, 'VES', 'es-ES'))).toBeTruthy();

    fireEvent.press(await screen.findByTestId('import-confirm'));
    await waitFor(() =>
      expect(createLocalTransactions).toHaveBeenCalledWith([
        expect.objectContaining({ currency: 'VES' }),
      ]),
    );
  });
});
