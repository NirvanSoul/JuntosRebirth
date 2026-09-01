import { personalSpace, type SpacesState } from '@/features/spaces/types';

/**
 * Conserva la caché autenticada sin exponer espacios compartidos sin sesión.
 * Se calcula durante el render para no dejar un frame con el espacio anterior.
 */
export function projectSpacesForSession(
  current: SpacesState,
  userId: string | null,
): SpacesState {
  if (userId) return current;

  const spaces = current.spaces.filter((space) => space.type !== 'couple');
  if (spaces.length === current.spaces.length) return current;

  const activeSpaceId = spaces.some(
    (space) => space.id === current.activeSpaceId,
  )
    ? current.activeSpaceId
    : personalSpace.id;

  return { activeSpaceId, spaces };
}
