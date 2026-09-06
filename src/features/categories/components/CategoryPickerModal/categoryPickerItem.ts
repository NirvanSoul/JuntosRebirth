import type { DefaultCategoryDefinition } from '@/features/categories/constants/defaultCategories';
import type { Category } from '@/features/categories/types';

export type CategoryPickerItem = Category | DefaultCategoryDefinition;

export function isCreatedCategory(item: CategoryPickerItem): item is Category {
  return 'spaceId' in item;
}

export function paginateCategories(
  categories: readonly Category[],
  categoriesPerPage: number,
): readonly (readonly Category[])[] {
  const pages: Category[][] = [];

  for (let index = 0; index < categories.length; index += categoriesPerPage) {
    pages.push(categories.slice(index, index + categoriesPerPage));
  }

  return pages;
}
