import { randomUUID } from 'expo-crypto';
import {
  categoryIconNames,
  type Category,
  type CategoryIconName,
} from '@/features/categories/types';
import { getLocalDatabase } from '@/lib/storage/localDatabase';
import { getOrCreateInstallationId } from '@/lib/storage/localIdentity';
import {
  categoryColors,
  type CategoryColorToken,
} from '@/theme/categoryColors';

type CategoryRow = {
  id: string;
  space_id: string;
  name: string;
  icon: string;
  color_token: string;
  budget_minor: number | null;
  is_default: number;
  template_key: string | null;
  note: string | null;
  is_archived: number;
};

export type CreateLocalCategoryInput = Omit<Category, 'id' | 'isArchived'> & {
  id?: string;
  sourceCategoryId?: string;
};

const iconNames = new Set<string>(categoryIconNames);
const colorTokens = new Set<string>(Object.keys(categoryColors));

function mapCategory(row: CategoryRow): Category {
  if (!iconNames.has(row.icon) || !colorTokens.has(row.color_token)) {
    throw new Error('La categoría local contiene valores no reconocidos');
  }

  return {
    id: row.id,
    spaceId: row.space_id,
    name: row.name,
    icon: row.icon as CategoryIconName,
    colorToken: row.color_token as CategoryColorToken,
    ...(row.budget_minor === null ? {} : { budgetMinor: row.budget_minor }),
    isDefault: row.is_default === 1,
    ...(row.template_key === null ? {} : { templateKey: row.template_key }),
    ...(row.note === null || row.note === undefined ? {} : { note: row.note }),
    isArchived: row.is_archived === 1,
  };
}

function assertCategory(input: CreateLocalCategoryInput): void {
  if (!input.spaceId || !input.name.trim()) {
    throw new Error('La categoría local no es válida');
  }
  if (input.budgetMinor !== undefined && input.budgetMinor <= 0) {
    throw new Error('El presupuesto debe ser mayor que cero');
  }
}

/**
 * Incluye categorías archivadas: los movimientos ya creados con una
 * categoría archivada siguen necesitando resolverla para mostrarse y
 * editarse. `listCategoriesBySpace` filtra `isArchived` para cualquier
 * catálogo seleccionable.
 */
export async function listLocalCategories(): Promise<Category[]> {
  const database = await getLocalDatabase();
  const rows = await database.getAllAsync<CategoryRow>(
    `SELECT id, space_id, name, icon, color_token, budget_minor,
            is_default, template_key, note, is_archived
       FROM categories
      ORDER BY created_at ASC`,
  );

  return rows.map(mapCategory);
}

export async function createLocalCategories(
  inputs: readonly CreateLocalCategoryInput[],
): Promise<Category[]> {
  if (inputs.length === 0) return [];
  inputs.forEach(assertCategory);

  const database = await getLocalDatabase();
  const createdBy = await getOrCreateInstallationId(database);
  const created: Category[] = [];

  await database.withExclusiveTransactionAsync(async (transaction) => {
    for (const input of inputs) {
      const id = input.id ?? randomUUID();
      const now = new Date().toISOString();
      await transaction.runAsync(
        `INSERT INTO categories (
           id, space_id, name, icon, color_token, budget_minor, is_default,
           template_key, note, source_category_id, created_by, sync_status,
           is_archived, created_at, updated_at, archived_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'local_only', 0, ?, ?, NULL)`,
        id,
        input.spaceId,
        input.name.trim(),
        input.icon,
        input.colorToken,
        input.budgetMinor ?? null,
        input.isDefault ? 1 : 0,
        input.templateKey ?? null,
        input.note ?? null,
        input.sourceCategoryId ?? null,
        createdBy,
        now,
        now,
      );
      created.push({
        id,
        spaceId: input.spaceId,
        name: input.name.trim(),
        icon: input.icon,
        colorToken: input.colorToken,
        ...(input.budgetMinor === undefined
          ? {}
          : { budgetMinor: input.budgetMinor }),
        isDefault: input.isDefault,
        ...(input.templateKey === undefined
          ? {}
          : { templateKey: input.templateKey }),
        ...(input.note === undefined ? {} : { note: input.note }),
        isArchived: false,
      });
    }
  });

  return created;
}

export async function createLocalCategory(
  input: CreateLocalCategoryInput,
): Promise<Category> {
  const [created] = await createLocalCategories([input]);
  if (!created) throw new Error('No se pudo crear la categoría local');
  return created;
}

export async function updateLocalCategory(
  category: Category,
): Promise<Category> {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  const result = await database.runAsync(
    `UPDATE categories
        SET name = ?, icon = ?, color_token = ?, budget_minor = ?,
            updated_at = ?,
            sync_status = CASE
              WHEN sync_status = 'local_only' THEN 'local_only'
              ELSE 'pending'
            END
      WHERE id = ? AND space_id = ? AND is_archived = 0`,
    category.name.trim(),
    category.icon,
    category.colorToken,
    category.budgetMinor ?? null,
    now,
    category.id,
    category.spaceId,
  );
  if (result.changes !== 1) {
    throw new Error('La categoría local ya no está disponible');
  }

  return { ...category, name: category.name.trim() };
}

export async function updateLocalCategoryNote(
  categoryId: string,
  spaceId: string,
  note: string | null,
): Promise<void> {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  const result = await database.runAsync(
    `UPDATE categories
        SET note = ?, updated_at = ?,
            sync_status = CASE
              WHEN sync_status = 'local_only' THEN 'local_only'
              ELSE 'pending'
            END
      WHERE id = ? AND space_id = ? AND is_archived = 0`,
    note,
    now,
    categoryId,
    spaceId,
  );
  if (result.changes !== 1) {
    throw new Error('La categoría local ya no está disponible');
  }
}

export async function archiveLocalCategory(
  categoryId: string,
  spaceId: string,
): Promise<void> {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  const result = await database.runAsync(
    `UPDATE categories
        SET is_archived = 1, archived_at = ?, updated_at = ?,
            sync_status = CASE
              WHEN sync_status = 'local_only' THEN 'local_only'
              ELSE 'pending'
            END
      WHERE id = ? AND space_id = ? AND is_archived = 0`,
    now,
    now,
    categoryId,
    spaceId,
  );
  if (result.changes !== 1) {
    throw new Error('La categoría local ya no está disponible');
  }
}
