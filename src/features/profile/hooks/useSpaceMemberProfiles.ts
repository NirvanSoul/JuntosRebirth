import { useCallback, useEffect, useState } from 'react';

import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import { listSpaceMemberProfiles } from '@/features/profile/repositories/localSpaceMemberProfileRepository';
import { syncOwnAvatar } from '@/features/profile/services/syncOwnAvatar';
import { syncSpaceMemberProfiles } from '@/features/profile/services/syncSpaceMemberProfiles';
import type { SpaceMemberProfile } from '@/features/profile/types';
import type { Space } from '@/features/spaces/types';

export type SpaceMembership = {
  /** Perfiles indexados por uuid de usuario, para resolver el autor de una fila. */
  profilesByUserId: Readonly<Record<string, SpaceMemberProfile>>;
  /** Uuid de quien usa el móvil, si la sesión se pudo restaurar. */
  ownUserId: string | null;
};

const emptyMembership: SpaceMembership = {
  profilesByUserId: {},
  ownUserId: null,
};

/**
 * Censo del espacio activo: quién lo comparte y cómo se llama cada persona.
 *
 * Un espacio personal no tiene a nadie más, así que ni consulta ni sincroniza.
 *
 * Lee primero lo que ya hay en local y solo después intenta refrescar contra el
 * servidor: si el dispositivo está sin cobertura, la interfaz sigue mostrando el
 * último nombre conocido en vez de quedarse en blanco. Un fallo de red no se
 * propaga por el mismo motivo, pero sí se registra.
 */
export function useSpaceMemberProfiles(space: Space): SpaceMembership {
  const [membership, setMembership] =
    useState<SpaceMembership>(emptyMembership);
  const spaceId = space.id;
  const isShared = space.type !== 'personal';

  const load = useCallback(async (): Promise<SpaceMembership> => {
    const [ownUserId, cached] = await Promise.all([
      getAuthenticatedUserId(),
      listSpaceMemberProfiles(spaceId),
    ]);

    return {
      profilesByUserId: Object.fromEntries(
        cached.map((profile) => [profile.userId, profile]),
      ),
      ownUserId,
    };
  }, [spaceId]);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        if (isMounted) setMembership(await load());
        // Reintento de la subida pendiente. Va fuera del `if (isShared)` a
        // propósito: en un espacio personal también hay que subir la foto, y
        // este es el único punto que corre siempre. No lanza ni bloquea.
        void syncOwnAvatar();

        // Un espacio personal no tiene a nadie más: la identidad propia que
        // acaba de cargarse ya basta para atribuir sus movimientos.
        if (!isShared) return;

        await syncSpaceMemberProfiles(spaceId);
        if (isMounted) setMembership(await load());
      } catch (error) {
        console.error('[profiles] no se pudo refrescar el censo', {
          spaceId,
          error,
        });
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isShared, load, spaceId]);

  return membership;
}
