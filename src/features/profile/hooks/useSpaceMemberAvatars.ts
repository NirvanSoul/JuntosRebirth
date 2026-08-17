import { useCallback, useEffect, useMemo, useState } from 'react';

import { getLocalProfile } from '@/features/profile/repositories/localProfileRepository';
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
 * La foto de la pareja todavía no existe en el cliente: `profiles` solo deja
 * leer la fila propia (`profiles_select_own`). Hasta que la migración 24 abra
 * esa lectura, el segundo hueco viaja como `null` y `Avatar` cae a su icono de
 * respaldo.
 */
export function useSpaceMemberAvatars(
  space: Space,
): readonly (string | null)[] {
  const [ownAvatarUri, setOwnAvatarUri] = useState<string | null>(null);

  const loadOwnAvatar = useCallback(() => {
    let isMounted = true;
    void getLocalProfile().then((profile) => {
      if (isMounted) setOwnAvatarUri(profile.avatarUri);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => loadOwnAvatar(), [loadOwnAvatar]);
  useAppForeground(loadOwnAvatar);

  return useMemo(
    () => (space.type === 'couple' ? [ownAvatarUri, null] : [ownAvatarUri]),
    [ownAvatarUri, space.type],
  );
}
