import { useCallback, useEffect, useMemo, useState } from 'react';

import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import { getLocalProfile } from '@/features/profile/repositories/localProfileRepository';
import { listSpaceMemberProfiles } from '@/features/profile/repositories/localSpaceMemberProfileRepository';
import type { Space } from '@/features/spaces/types';
import { useAppForeground } from '@/hooks/useAppForeground';

/**
 * Fotos de los miembros del espacio activo, en orden de pintado: la primera es
 * la de quien usa el móvil y va delante.
 *
 * Un espacio personal devuelve una sola foto; uno juntos devuelve dos, de forma
 * que quien consume el hook decide entre `Avatar` y `AvatarPair` por la
 * longitud y no por el tipo de espacio.
 *
 * La foto propia sale de `local_profile` y no del censo: es la única que existe
 * en modo invitado y la única que está disponible antes de que termine la
 * primera sincronización, así que leerla aparte evita un hueco visible al
 * arrancar.
 */
export function useSpaceMemberAvatars(
  space: Space,
): readonly (string | null)[] {
  const [ownAvatarUri, setOwnAvatarUri] = useState<string | null>(null);
  const [partnerAvatarUri, setPartnerAvatarUri] = useState<string | null>(null);
  const spaceId = space.id;
  const isCouple = space.type === 'couple';

  // La identidad se resuelve aquí en vez de leerla del contexto de membresía:
  // este hook se llama desde `MainTabsNavigator`, por encima del proveedor, así
  // que allí el contexto todavía tiene su valor vacío.
  const loadAvatars = useCallback(() => {
    let isMounted = true;

    void getLocalProfile().then((profile) => {
      if (isMounted) setOwnAvatarUri(profile.avatarUri);
    });

    if (!isCouple) {
      setPartnerAvatarUri(null);
      return () => {
        isMounted = false;
      };
    }

    void (async () => {
      const [ownUserId, profiles] = await Promise.all([
        getAuthenticatedUserId(),
        listSpaceMemberProfiles(spaceId),
      ]);
      // «La otra persona» es todo el que no sea uno mismo. Cuando aún no se
      // conoce el propio uuid —modo invitado, o sesión sin resolver— no se
      // elige a nadie: colocar una foto ajena en el hueco propio sería peor
      // que mostrar el icono de respaldo.
      const partner = ownUserId
        ? profiles.find((profile) => profile.userId !== ownUserId)
        : undefined;
      if (isMounted) setPartnerAvatarUri(partner?.avatarUri ?? null);
    })();

    return () => {
      isMounted = false;
    };
  }, [isCouple, spaceId]);

  useEffect(() => loadAvatars(), [loadAvatars]);
  useAppForeground(loadAvatars);

  return useMemo(
    () => (isCouple ? [ownAvatarUri, partnerAvatarUri] : [ownAvatarUri]),
    [isCouple, ownAvatarUri, partnerAvatarUri],
  );
}
