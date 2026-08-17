import { createLocalCategory } from '@/features/categories/repositories/localCategoryRepository';
import type { Category } from '@/features/categories/types';
import { validateCategoryName } from '@/features/categories/utils/categoryCatalog';

type CopyCategoryToSpaceInput = {
  categories: readonly Category[];
  categoryId: string;
  sourceSpaceId: string;
  targetSpaceId: string;
};

export type CopyCategoryToSpaceResult =
  | { copiedCategory: Category; itemName: string; status: 'copied' }
  | { status: 'rejected' };

/**
 * Copia una categoría a otro espacio con identificador propio. La copia es
 * independiente: no traslada movimientos ni presupuesto, y conserva el origen
 * en `sourceCategoryId`.
 */
export async function copyCategoryToSpace({
  categories,
  categoryId,
  sourceSpaceId,
  targetSpaceId,
}: CopyCategoryToSpaceInput): Promise<CopyCategoryToSpaceResult> {
  const source = categories.find((category) => category.id === categoryId);

  if (
    !source ||
    source.spaceId !== sourceSpaceId ||
    targetSpaceId === sourceSpaceId
  ) {
    return { status: 'rejected' };
  }

  const validation = validateCategoryName(
    source.name,
    categories,
    targetSpaceId,
  );
  if (!validation.valid) {
    return { status: 'rejected' };
  }

  const copiedCategory = await createLocalCategory({
    ...source,
    spaceId: targetSpaceId,
    name: validation.name,
    isDefault: false,
    templateKey: undefined,
    sourceCategoryId: source.id,
  });

  return { copiedCategory, itemName: source.name, status: 'copied' };
}
