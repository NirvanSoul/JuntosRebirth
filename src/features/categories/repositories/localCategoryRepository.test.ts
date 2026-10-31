import type { SQLiteDatabase } from 'expo-sqlite';

import {
  archiveLocalCategory,
  createLocalCategories,
  listLocalCategories,
  updateLocalCategory,
  updateLocalCategoryNote,
} from '@/features/categories/repositories/localCategoryRepository';
import { saveLocalCategoryBudget } from '@/features/categories/repositories/localCategoryBudgetRepository';

const mockGetLocalDatabase = jest.fn<Promise<SQLiteDatabase>, []>();

jest.mock('@/lib/storage/localDatabase', () => ({
  getLocalDatabase: () => mockGetLocalDatabase(),
}));

jest.mock('@/lib/storage/localIdentity', () => ({
  getOrCreateInstallationId: jest.fn(async () => 'installation-id'),
}));

jest.mock('@/features/spaces/repositories/localSpaceRepository', () => ({
  loadSpaces: jest.fn(async () => ({
    activeSpaceId: 'personal',
    spaces: [{ id: 'personal', currency: 'VES' }],
  })),
}));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

describe('localCategoryRepository', () => {
  const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
  const getAllAsync = jest.fn();
  const database = {
    getAllAsync,
    runAsync,
    withExclusiveTransactionAsync: jest.fn(async (task) => task({ runAsync })),
  } as unknown as SQLiteDatabase;
  /** Filas que devuelve cada consulta de `listLocalCategories`. */
  const rowsFor = ({
    categories = [] as unknown[],
    budgets = [] as unknown[],
    legacy = [] as unknown[],
  }) =>
    getAllAsync.mockImplementation(async (sql: string) =>
      sql.includes('WHERE budget_minor IS NOT NULL')
        ? legacy
        : sql.includes('FROM category_budgets')
          ? budgets
          : categories,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    getAllAsync.mockReset();
    mockGetLocalDatabase.mockResolvedValue(database);
  });

  it('crea plantillas con UUID y conserva su identidad al recargarlas', async () => {
    const [created] = await createLocalCategories([
      {
        spaceId: 'personal',
        name: 'Salario',
        icon: 'money',
        colorToken: 'forest',
        isDefault: true,
        templateKey: 'salary',
      },
    ]);

    expect(created).toMatchObject({
      id: '00000000-0000-4000-8000-000000000001',
      templateKey: 'salary',
      isArchived: false,
    });
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO categories'),
      '00000000-0000-4000-8000-000000000001',
      'personal',
      'Salario',
      'money',
      'forest',
      1,
      'salary',
      null,
      null,
      'installation-id',
      expect.any(String),
      expect.any(String),
    );

    rowsFor({
      categories: [
        {
          id: created!.id,
          space_id: 'personal',
          name: 'Salario',
          icon: 'money',
          color_token: 'forest',
          is_default: 1,
          template_key: 'salary',
          note: null,
          is_archived: 0,
        },
      ],
    });
    await expect(listLocalCategories()).resolves.toEqual([created]);
  });

  it('incluye categorías archivadas para resolver movimientos existentes', async () => {
    rowsFor({
      categories: [
        {
          id: 'category-id',
          space_id: 'personal',
          name: 'Casa',
          icon: 'house',
          color_token: 'slate',
          is_default: 0,
          template_key: null,
          is_archived: 1,
        },
      ],
    });

    await expect(listLocalCategories()).resolves.toEqual([
      expect.objectContaining({ id: 'category-id', isArchived: true }),
    ]);
    expect(getAllAsync).toHaveBeenCalledWith(
      expect.stringMatching(/FROM categories\s+ORDER BY/),
    );
  });

  it('edita y archiva sin eliminar físicamente la fila', async () => {
    const category = {
      id: 'category-id',
      spaceId: 'personal',
      name: 'Casa',
      icon: 'house' as const,
      colorToken: 'slate' as const,
      budgets: { EUR: { budgetMinor: 50000 } },
      isDefault: false,
      isArchived: false,
    };

    await expect(updateLocalCategory(category)).resolves.toEqual(category);
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("ELSE 'pending'"),
      'Casa',
      'house',
      'slate',
      expect.any(String),
      'category-id',
      'personal',
    );

    await archiveLocalCategory('category-id', 'personal');
    expect(runAsync).toHaveBeenLastCalledWith(
      expect.stringContaining('SET is_archived = 1'),
      expect.any(String),
      expect.any(String),
      'category-id',
      'personal',
    );
  });

  it('guarda y limpia la nota de una categoría sin tocar el resto de campos', async () => {
    await updateLocalCategoryNote('category-id', 'personal', 'Revisar recibos');
    expect(runAsync).toHaveBeenLastCalledWith(
      expect.stringContaining('SET note = ?'),
      'Revisar recibos',
      expect.any(String),
      'category-id',
      'personal',
    );

    await updateLocalCategoryNote('category-id', 'personal', null);
    expect(runAsync).toHaveBeenLastCalledWith(
      expect.stringContaining('SET note = ?'),
      null,
      expect.any(String),
      'category-id',
      'personal',
    );

    runAsync.mockResolvedValueOnce({ changes: 0, lastInsertRowId: 0 });
    await expect(
      updateLocalCategoryNote('missing', 'personal', 'Nota'),
    ).rejects.toThrow('La categoría local ya no está disponible');
  });

  it('carga un presupuesto por moneda con su periodicidad', async () => {
    rowsFor({
      categories: [
        {
          id: 'food',
          space_id: 'personal',
          name: 'Comida',
          icon: 'fork-knife',
          color_token: 'orange',
          is_default: 0,
          template_key: null,
          note: null,
          is_archived: 0,
        },
      ],
      budgets: [
        {
          category_id: 'food',
          currency: 'EUR',
          budget_minor: 5000,
          period: 'week',
          interval_days: null,
          anchor_on: null,
          overrides_json: '[]',
          history_json: '[]',
        },
        {
          category_id: 'food',
          currency: 'VES',
          budget_minor: 90000,
          period: 'month',
          interval_days: null,
          anchor_on: null,
          overrides_json:
            '[{"periodStartOn":"2026-07-01","amountMinor":95000}]',
          history_json: '[]',
        },
      ],
    });

    const [food] = await listLocalCategories();

    expect(food?.budgets).toEqual({
      EUR: { budgetMinor: 5000, budgetSchedule: { period: 'week' } },
      VES: {
        budgetMinor: 90000,
        budgetOverrides: [{ periodStartOn: '2026-07-01', amountMinor: 95000 }],
      },
    });
  });

  it('mueve un presupuesto heredado a la moneda del espacio', async () => {
    rowsFor({
      legacy: [
        {
          id: 'food',
          space_id: 'personal',
          budget_minor: 5000,
          period: 'fortnight',
          interval_days: null,
          anchor_on: null,
          overrides_json: '[]',
          history_json: '[]',
        },
      ],
    });

    await listLocalCategories();

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO category_budgets'),
      'food:VES',
      'food',
      'VES',
      5000,
      'fortnight',
      null,
      null,
      '[]',
      '[]',
      'pending',
      expect.any(String),
      expect.any(String),
    );
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('SET budget_minor = NULL'),
      expect.any(String),
      'food',
    );
  });

  it('guarda o quita el presupuesto de una sola moneda', async () => {
    const category = {
      id: 'food',
      spaceId: 'personal',
      name: 'Comida',
      icon: 'fork-knife' as const,
      colorToken: 'orange' as const,
      budgets: { USD: { budgetMinor: 3000 } },
      isDefault: false,
      isArchived: false,
    };

    await saveLocalCategoryBudget(category, 'USD');
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM category_budgets'),
      'food',
      'USD',
    );
    expect(runAsync).toHaveBeenLastCalledWith(
      expect.stringContaining('INSERT INTO category_budgets'),
      'food:USD',
      'food',
      'USD',
      3000,
      'month',
      null,
      null,
      '[]',
      '[]',
      'pending',
      expect.any(String),
      expect.any(String),
    );

    runAsync.mockClear();
    await saveLocalCategoryBudget(category, 'EUR');
    expect(runAsync).toHaveBeenLastCalledWith(
      expect.stringContaining('DELETE FROM category_budgets'),
      'food',
      'EUR',
    );
  });
});
