import { useCallback, useEffect, useState } from 'react';

import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import { getLocalProfile } from '@/features/profile/repositories/localProfileRepository';
import { listSpaceMemberProfiles } from '@/features/profile/repositories/localSpaceMemberProfileRepository';
import { syncOwnAvatar } from '@/features/profile/services/syncOwnAvatar';
import { syncSpaceMemberProfiles } from '@/features/profile/services/syncSpaceMemberProfiles';
import type { SpaceMemberProfile } from '@/features/profile/types';
import type { Space } from '@/features/spaces/types';
import { useAppForeground } from '@/hooks/useAppForeground';

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
    const [ownUserId, cached, localProfile] = await Promise.all([
      getAuthenticatedUserId(),
      listSpaceMemberProfiles(spaceId),
      getLocalProfile(),
    ]);

    const profilesByUserId: Record<string, SpaceMemberProfile> =
      Object.fromEntries(cached.map((profile) => [profile.userId, profile]));

    if (ownUserId) {
      const existing = profilesByUserId[ownUserId];
      profilesByUserId[ownUserId] = {
        userId: ownUserId,
        displayName: localProfile.displayName ?? existing?.displayName ?? null,
        avatarPath: existing?.avatarPath ?? localProfile.avatarPath ?? null,
        avatarUpdatedAt:
          existing?.avatarUpdatedAt ?? localProfile.avatarUpdatedAt ?? null,
        avatarUri: localProfile.avatarUri ?? existing?.avatarUri ?? null,
        defaultCurrency: existing?.defaultCurrency ?? null,
      };
    }

    return {
      profilesByUserId,
      ownUserId,
    };
  }, [spaceId]);

  const refresh = useCallback(() => {
    let isMounted = true;

    void (async () => {
      try {
        if (isMounted) setMembership(await load());
        void syncOwnAvatar();

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

  useEffect(() => refresh(), [refresh]);
  useAppForeground(refresh);

  return membership;
}
