import { useEffect, useMemo, useState } from 'react';

import { listSpaceMemberProfiles } from '@/features/profile/repositories/localSpaceMemberProfileRepository';
import type { Space } from '@/features/spaces/types';
import { listSpaceCurrencies } from '@/features/spaces/utils/spaceCurrencies';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';

/**
 * Monedas que ofrece el espacio activo: la suya, las de quien usa el móvil y
 * las de los demás miembros.
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
): readonly CurrencyCode[] {
  const [memberCurrencies, setMemberCurrencies] = useState<
    readonly (CurrencyCode | null)[]
  >([]);
  const spaceId = space.id;
  const isShared = space.type !== 'personal';

  useEffect(() => {
    let isMounted = true;

    if (!isShared) {
      setMemberCurrencies([]);
      return () => {
        isMounted = false;
      };
    }

    void listSpaceMemberProfiles(spaceId)
      .then((profiles) => {
        if (isMounted) {
          setMemberCurrencies(
            profiles.map((profile) => profile.defaultCurrency),
          );
        }
      })
      .catch((error: unknown) => {
        // Sin el censo se cae a las monedas propias más la del espacio, que
        // sigue siendo utilizable: no merece romper la pantalla.
        console.error('[spaces] no se pudieron leer las monedas del espacio', {
          spaceId,
          error,
        });
      });

    return () => {
      isMounted = false;
    };
  }, [isShared, spaceId]);

  return useMemo(
    () => listSpaceCurrencies(space.currency, ownCurrencies, memberCurrencies),
    [space.currency, ownCurrencies, memberCurrencies],
  );
}
