import type { SQLiteDatabase } from 'expo-sqlite';

import {
  archiveLocalCategory,
  createLocalCategories,
  listLocalCategories,
  updateLocalCategory,
  updateLocalCategoryNote,
} from '@/features/categories/repositories/localCategoryRepository';

const mockGetLocalDatabase = jest.fn<Promise<SQLiteDatabase>, []>();

jest.mock('@/lib/storage/localDatabase', () => ({
  getLocalDatabase: () => mockGetLocalDatabase(),
}));

jest.mock('@/lib/storage/localIdentity', () => ({
  getOrCreateInstallationId: jest.fn(async () => 'installation-id'),
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLocalDatabase.mockResolvedValue(database);
  });

  it('crea plantillas con UUID y conserva su identidad al recargarlas', async () => {
    const [created] = await createLocalCategories([
      {
        spaceId: 'personal',
        name: 'Salario',
        icon: 'money',
        colorToken: 'emerald',
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
      'emerald',
      null,
      1,
      'salary',
      null,
      null,
      'installation-id',
      expect.any(String),
      expect.any(String),
    );

    getAllAsync.mockResolvedValueOnce([
      {
        id: created!.id,
        space_id: 'personal',
        name: 'Salario',
        icon: 'money',
        color_token: 'emerald',
        budget_minor: null,
        is_default: 1,
        template_key: 'salary',
        note: null,
        is_archived: 0,
      },
    ]);
    await expect(listLocalCategories()).resolves.toEqual([created]);
  });

  it('incluye categorías archivadas para resolver movimientos existentes', async () => {
    getAllAsync.mockResolvedValueOnce([
      {
        id: 'category-id',
        space_id: 'personal',
        name: 'Casa',
        icon: 'house',
        color_token: 'slate',
        budget_minor: null,
        is_default: 0,
        template_key: null,
        is_archived: 1,
      },
    ]);

    await expect(listLocalCategories()).resolves.toEqual([
      expect.objectContaining({ id: 'category-id', isArchived: true }),
    ]);
    expect(getAllAsync).toHaveBeenCalledWith(
      expect.not.stringContaining('WHERE'),
    );
  });

  it('edita y archiva sin eliminar físicamente la fila', async () => {
    const category = {
      id: 'category-id',
      spaceId: 'personal',
      name: 'Casa',
      icon: 'house' as const,
      colorToken: 'slate' as const,
      budgetMinor: 50000,
      isDefault: false,
      isArchived: false,
    };

    await expect(updateLocalCategory(category)).resolves.toEqual(category);
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("ELSE 'pending'"),
      'Casa',
      'house',
      'slate',
      50000,
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
});
