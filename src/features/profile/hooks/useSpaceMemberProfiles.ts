import { reportBackgroundFailure } from '@/lib/diagnostics/backgroundFailure';
import { useCallback, useEffect, useState } from 'react';

import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import {
  getLocalProfile,
  subscribeToLocalProfile,
} from '@/features/profile/repositories/localProfileRepository';
import {
  listSpaceMemberProfiles,
  subscribeToSpaceMemberProfiles,
} from '@/features/profile/repositories/localSpaceMemberProfileRepository';
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

function isSameMemberProfile(
  a: SpaceMemberProfile,
  b: SpaceMemberProfile,
): boolean {
  return (
    a.userId === b.userId &&
    a.displayName === b.displayName &&
    a.avatarPath === b.avatarPath &&
    a.avatarUpdatedAt === b.avatarUpdatedAt &&
    a.avatarUri === b.avatarUri &&
    a.defaultCurrency === b.defaultCurrency
  );
}

/**
 * Conserva la membresía anterior si nada cambió. El censo se relee en cada
 * refresco periódico, y un objeto nuevo en el contexto repintaba todas las
 * filas de movimientos aunque mostraran los mismos nombres.
 */
function keepIfUnchanged(
  current: SpaceMembership,
  next: SpaceMembership,
): SpaceMembership {
  if (current.ownUserId !== next.ownUserId) return next;
  const currentIds = Object.keys(current.profilesByUserId);
  if (currentIds.length !== Object.keys(next.profilesByUserId).length) {
    return next;
  }
  const unchanged = currentIds.every((userId) => {
    const nextProfile = next.profilesByUserId[userId];
    return (
      nextProfile !== undefined &&
      isSameMemberProfile(current.profilesByUserId[userId]!, nextProfile)
    );
  });
  return unchanged ? current : next;
}

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
        const initial = await load();
        if (isMounted)
          setMembership((current) => keepIfUnchanged(current, initial));
        void syncOwnAvatar();

        if (!isShared) return;

        await syncSpaceMemberProfiles(spaceId);
        const synced = await load();
        if (isMounted)
          setMembership((current) => keepIfUnchanged(current, synced));
      } catch (error) {
        reportBackgroundFailure(
          '[profiles] no se pudo refrescar el censo',
          error,
          { spaceId },
        );
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isShared, load, spaceId]);

  useEffect(() => refresh(), [refresh]);
  useEffect(() => {
    let isMounted = true;
    const reload = () => {
      void load()
        .then((nextMembership) => {
          if (isMounted) {
            setMembership((current) =>
              keepIfUnchanged(current, nextMembership),
            );
          }
        })
        .catch((error) => {
          console.error('[profiles] no se pudo releer el censo local', {
            spaceId,
            error,
          });
        });
    };
    const unsubscribeOwnProfile = subscribeToLocalProfile(reload);
    const unsubscribeMemberProfiles = isShared
      ? subscribeToSpaceMemberProfiles(spaceId, reload)
      : () => undefined;

    return () => {
      isMounted = false;
      unsubscribeOwnProfile();
      unsubscribeMemberProfiles();
    };
  }, [isShared, load, spaceId]);
  useAppForeground(refresh);

  return membership;
}
