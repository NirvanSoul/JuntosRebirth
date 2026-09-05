import { useCallback } from 'react';

import type { BetterAuthSession } from '@/features/auth/hooks/useBetterAuthSession';
import { syncSpaceDataForCurrentSession } from '@/features/sync/services/syncCoupleSpaceData';
import { isAwaitingPartnerSpace, type Space } from '@/features/spaces/types';

export type CoupleSpacePublisher = {
  /** Notifica cambios en el espacio de pareja indicado por id. */
  publishCoupleSpaceChanges: (spaceId: string) => void;
  /** Igual, pero fijo al espacio activo. */
  publishActiveCoupleChanges: () => void;
};

/**
 * Notifica a la contraparte de un espacio de pareja que hay cambios que
 * sincronizar. No hace nada en un espacio personal ni mientras se espera a
 * que la pareja acepte la invitación.
 */
export function useCoupleSpacePublisher(
  session: BetterAuthSession | null,
  spaces: readonly Space[],
  activeSpaceId: string,
): CoupleSpacePublisher {
  const publishCoupleSpaceChanges = useCallback(
    (spaceId: string) => {
      if (!session) return;
      const targetSpace = spaces.find((space) => space.id === spaceId);
      if (!targetSpace) return;
      if (isAwaitingPartnerSpace(targetSpace)) {
        return;
      }
      void syncSpaceDataForCurrentSession({ spaceId }).catch(() => undefined);
    },
    [session, spaces],
  );

  const publishActiveCoupleChanges = useCallback(
    () => publishCoupleSpaceChanges(activeSpaceId),
    [activeSpaceId, publishCoupleSpaceChanges],
  );

  return { publishCoupleSpaceChanges, publishActiveCoupleChanges };
}
