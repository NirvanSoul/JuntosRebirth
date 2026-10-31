import Ionicons from '@expo/vector-icons/Ionicons';

import type { CopyToSpaceRequest } from '@/components/overlays/CopyToSpaceModal/CopyToSpaceModal';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon/CategoryIcon';
import type { Category } from '@/features/categories/types';
import { categoryCopyToSpaceCopy } from '@/features/categories/utils/categoryActionCopy';
import { categoryColors } from '@/theme/categoryColors';

/**
 * Icono con el que el selector de espacio presenta lo que se copia: el de la
 * categoría sobre su color o, sin categoría, el recibo de las vistas previas.
 */
export function getCategoryCopyItem(
  category: Pick<Category, 'colorToken' | 'icon'> | null | undefined,
): Pick<CopyToSpaceRequest, 'itemColor' | 'renderItemIcon'> {
  if (!category) {
    return {
      renderItemIcon: ({ color, size }) => (
        <Ionicons color={color} name="receipt" size={size} />
      ),
    };
  }

  return {
    itemColor: categoryColors[category.colorToken],
    renderItemIcon: ({ color, size }) => (
      <CategoryIcon color={color} name={category.icon} size={size} />
    ),
  };
}

/** Textos, icono y nombre con que se copia una categoría a otro espacio. */
export function getCategoryCopyRequest(
  category: Pick<Category, 'colorToken' | 'icon' | 'name'>,
): Pick<
  CopyToSpaceRequest,
  'failureMessage' | 'itemColor' | 'itemName' | 'renderItemIcon'
> {
  return {
    ...categoryCopyToSpaceCopy,
    ...getCategoryCopyItem(category),
    itemName: category.name,
  };
}
