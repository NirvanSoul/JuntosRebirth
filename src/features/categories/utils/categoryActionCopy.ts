import type { CopyTarget } from '@/components/overlays/CopyToSpaceModal/CopyToSpaceModal';

/**
 * Textos de las acciones sobre una categoría. Los comparten el detalle y las
 * acciones de la pulsación larga para que digan lo mismo.
 */
export const categoryDeletionCopy = {
  title: '¿Eliminar esta categoría?',
  description:
    'Se ocultará de este espacio. Sus movimientos asociados se conservarán.',
};

export const categoryCopyToSpaceCopy = {
  failureMessage: (target: CopyTarget) =>
    `Ya existe una categoría con este nombre en ${target.name}.`,
};
