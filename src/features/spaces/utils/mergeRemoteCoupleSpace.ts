import {
  resolvePersonalSpaceId,
  type Space,
  type SpacesState,
} from '@/features/spaces/types';

/**
 * Fusiona el espacio de pareja remoto (o su ausencia) con el catálogo local.
 * Si existe uno remoto, reemplaza o añade la entrada local `type: 'couple'`.
 * Si no existe (nunca se creó, o se disolvió), retira cualquier entrada
 * local `couple` que hubiera quedado obsoleta, cayendo al espacio Personal
 * si esa era la selección activa. Devuelve la misma referencia de `current`
 * cuando no hay nada que cambiar, para que el llamador sepa si debe
 * persistir.
 */
export function mergeRemoteCoupleSpace(
  current: SpacesState,
  remoteSpace: Space | null,
): SpacesState {
  const localCoupleSpace = current.spaces.find(
    (space) => space.type === 'couple',
  );

  if (remoteSpace) {
    if (
      localCoupleSpace &&
      localCoupleSpace.id === remoteSpace.id &&
      localCoupleSpace.name === remoteSpace.name &&
      localCoupleSpace.currency === remoteSpace.currency &&
      (localCoupleSpace.isAwaitingPartner ?? false) ===
        remoteSpace.isAwaitingPartner
    ) {
      return current;
    }

    const withoutStaleCouple = current.spaces.filter(
      (space) => space.type !== 'couple' || space.id === remoteSpace.id,
    );
    const alreadyPresent = withoutStaleCouple.some(
      (space) => space.id === remoteSpace.id,
    );
    const nextSpaces = alreadyPresent
      ? withoutStaleCouple.map((space) =>
          space.id === remoteSpace.id ? remoteSpace : space,
        )
      : [...withoutStaleCouple, remoteSpace];

    return { ...current, spaces: nextSpaces };
  }

  if (!localCoupleSpace) {
    return current;
  }

  const nextSpaces = current.spaces.filter(
    (space) => space.id !== localCoupleSpace.id,
  );
  const nextActiveSpaceId =
    current.activeSpaceId === localCoupleSpace.id
      ? resolvePersonalSpaceId(nextSpaces)
      : current.activeSpaceId;

  return { activeSpaceId: nextActiveSpaceId, spaces: nextSpaces };
}
