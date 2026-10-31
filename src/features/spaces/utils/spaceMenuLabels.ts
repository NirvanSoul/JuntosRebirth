import type { Space } from '@/features/spaces/types';

const spaceTypeOrder = { personal: 0, couple: 1, other: 2 };

/** Orden del menú lateral: Personal, Juntos y después el resto. */
export function sortSpacesForMenu(spaces: readonly Space[]): Space[] {
  return [...spaces].sort(
    (first, second) => spaceTypeOrder[first.type] - spaceTypeOrder[second.type],
  );
}

export function getSpaceLabel(space: Space): string {
  if (space.type === 'personal') return 'Personal';
  if (space.type === 'couple') return 'Juntos';
  return space.name;
}
