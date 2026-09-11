import { useEffect, useState } from 'react';

import { useAuthSession } from '@/features/auth/hooks/useAuthSession';
import {
  clearCountryChangeNotice,
  loadCountryChangeNotice,
  type CountryChangeNotice,
} from '@/features/spaces/repositories/countryChangeNoticeRepository';

/** El aviso pertenece a la cuenta y deja de aplicar al tener otro espacio. */
export function useCountryChangeNotice(
  visible: boolean,
  hasCoupleSpace: boolean,
) {
  const { userId } = useAuthSession();
  const [loaded, setLoaded] = useState<{
    userId: string;
    notice: CountryChangeNotice | null;
  } | null>(null);

  useEffect(() => {
    if (!userId || (!visible && !hasCoupleSpace)) return;
    let cancelled = false;
    const read = async () => {
      if (hasCoupleSpace) await clearCountryChangeNotice(userId);
      const notice = hasCoupleSpace
        ? null
        : await loadCountryChangeNotice(userId);
      if (!cancelled) setLoaded({ userId, notice });
    };
    void read().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [hasCoupleSpace, userId, visible]);

  return !hasCoupleSpace && loaded?.userId === userId ? loaded?.notice : null;
}
