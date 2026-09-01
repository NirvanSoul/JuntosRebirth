import { createContext, useContext, useMemo, type ReactNode } from 'react';

import {
  useSpaceMemberProfiles,
  type SpaceMembership,
} from '@/features/profile/hooks/useSpaceMemberProfiles';
import type { Space } from '@/features/spaces/types';

type SpaceMembershipValue = SpaceMembership & {
  /** `false` en un espacio personal, donde la autoría no aporta información. */
  isSharedSpace: boolean;
};

const emptyValue: SpaceMembershipValue = {
  profilesByUserId: {},
  ownUserId: null,
  isSharedSpace: false,
};

const SpaceMembershipContext = createContext<SpaceMembershipValue>(emptyValue);

/**
 * Publica el censo del espacio activo para toda la pantalla.
 *
 * Es un contexto y no una prop porque los movimientos se pintan desde nueve
 * sitios distintos —Inicio, Actividad, Mapa, el modal de periodo, el de
 * categoría— y hacerlo llegar por props obligaría a atravesar pantallas que
 * no tienen nada que ver con la autoría, varias de ellas con el tope de
 * líneas congelado.
 */
export function SpaceMembershipProvider({
  space,
  children,
}: {
  space: Space;
  children: ReactNode;
}) {
  const membership = useSpaceMemberProfiles(space);
  const isSharedSpace = space.type !== 'personal';

  const value = useMemo(
    () => ({ ...membership, isSharedSpace }),
    [membership, isSharedSpace],
  );

  return (
    <SpaceMembershipContext.Provider value={value}>
      {children}
    </SpaceMembershipContext.Provider>
  );
}

export function useSpaceMembership(): SpaceMembershipValue {
  return useContext(SpaceMembershipContext);
}
