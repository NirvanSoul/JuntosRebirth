import { useEffect, useMemo, useState } from 'react';

import { listSpaceMemberProfiles } from '@/features/profile/repositories/localSpaceMemberProfileRepository';
import type { SpaceMemberProfile } from '@/features/profile/types';
import type { Space } from '@/features/spaces/types';
import { listSpaceCurrencies } from '@/features/spaces/utils/spaceCurrencies';
import {
  isCurrencyCode,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';

type SpaceCurrencyTransaction = {
  createdBy: string;
  currency: string;
};

/**
 * Monedas que muestra el espacio activo: las activas de quien usa el móvil y,
 * en un espacio compartido, las de los demás miembros y las de los movimientos
 * que ellos registran.
 *
 * El censo incluye también a quien usa el móvil, con la moneda principal de su
 * última sincronización. Se descarta: si no, una moneda recién quitada en
 * Ajustes volvía por su propio perfil. Del mismo modo, solo cuentan como
 * ajenos los movimientos de un miembro conocido del censo; lo registrado antes
 * de iniciar sesión lleva el id de instalación y es propio.
 *
 * Lee el censo local directamente en vez de consumir `SpaceMembershipContext`
 * porque se usa desde `MainTabsNavigator`, por encima del proveedor, donde ese
 * contexto todavía tiene su valor vacío.
 *
 * Un espacio personal no consulta nada: no hay más miembros de quienes heredar
 * monedas.
 */
export function useSpaceCurrencies(
  space: Space,
  ownCurrencies: readonly CurrencyCode[],
  ownUserId: string | null,
  spaceTransactions: readonly SpaceCurrencyTransaction[],
): readonly CurrencyCode[] {
  const [memberProfiles, setMemberProfiles] = useState<
    readonly SpaceMemberProfile[]
  >([]);
  const spaceId = space.id;
  const isShared = space.type !== 'personal';

  useEffect(() => {
    let isMounted = true;

    if (!isShared) {
      // Rama del mismo efecto que hace I/O (censo) en el caso compartido;
      // limpiar aquí evita arrastrar monedas del espacio anterior.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMemberProfiles([]);
      return () => {
        isMounted = false;
      };
    }

    void listSpaceMemberProfiles(spaceId)
      .then((profiles) => {
        if (isMounted) setMemberProfiles(profiles);
      })
      .catch((error: unknown) => {
        // Sin el censo se cae a las monedas propias, que siguen siendo
        // utilizables: no merece romper la pantalla.
        console.error('[spaces] no se pudieron leer las monedas del espacio', {
          spaceId,
          error,
        });
      });

    return () => {
      isMounted = false;
    };
  }, [isShared, spaceId]);

  return useMemo(() => {
    if (!isShared) return listSpaceCurrencies(ownCurrencies);

    const otherMembers = memberProfiles.filter(
      (profile) => profile.userId !== ownUserId,
    );
    const otherMemberIds = new Set(
      otherMembers.map((profile) => profile.userId),
    );
    const otherMembersDataCurrencies = spaceTransactions.flatMap(
      (transaction) =>
        otherMemberIds.has(transaction.createdBy) &&
        isCurrencyCode(transaction.currency)
          ? [transaction.currency]
          : [],
    );

    return listSpaceCurrencies(ownCurrencies, [
      ...otherMembers.map((profile) => profile.defaultCurrency),
      ...otherMembersDataCurrencies,
    ]);
  }, [isShared, memberProfiles, ownCurrencies, ownUserId, spaceTransactions]);
}
