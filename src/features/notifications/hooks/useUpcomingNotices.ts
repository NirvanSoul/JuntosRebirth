import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Category } from '@/features/categories/types';
import {
  loadSeenNoticeKeys,
  saveSeenNoticeKeys,
} from '@/features/notifications/repositories/seenNoticesRepository';
import {
  buildUpcomingNotices,
  type UpcomingNotice,
  upcomingNoticeLeadDays,
} from '@/features/notifications/utils/upcomingNotices';
import type { SessionTransaction } from '@/features/transactions/types';
import { useAppForeground } from '@/hooks/useAppForeground';
import { getLocalTodayKey } from '@/lib/date/localDate';

export type UpcomingNoticesController = {
  hasUnseen: boolean;
  /** Marca como vistos todos los avisos actuales. */
  markAllSeen: () => void;
  notices: readonly UpcomingNotice[];
};

/**
 * Bandeja de avisos de movimientos que llegan en los próximos días, de todos
 * los espacios. El día se recalcula al volver la app a primer plano para que
 * los avisos avancen aunque la app siga abierta de un día para otro.
 */
export function useUpcomingNotices(
  transactions: readonly SessionTransaction[],
  categories: readonly Category[],
): UpcomingNoticesController {
  const [today, setToday] = useState(getLocalTodayKey);
  const [seenKeys, setSeenKeys] = useState<ReadonlySet<string> | null>(null);

  useAppForeground(() => setToday(getLocalTodayKey()));

  useEffect(() => {
    let isMounted = true;
    void loadSeenNoticeKeys()
      .catch(() => new Set<string>())
      .then((keys) => {
        if (isMounted) setSeenKeys(keys);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const notices = useMemo(
    () => buildUpcomingNotices({ categories, today, transactions }),
    [categories, today, transactions],
  );
  // Solo los avisos inminentes cuentan como nuevos; los de la semana o el mes
  // se listan como información sin encender el punto cada día.
  const alertKeys = useMemo(
    () =>
      notices
        .filter((notice) => notice.daysUntil <= upcomingNoticeLeadDays)
        .map((notice) => notice.key),
    [notices],
  );
  // Hasta leer lo ya visto no se marca nada como nuevo: evita un punto que
  // aparece y desaparece al arrancar.
  const hasUnseen =
    seenKeys !== null && alertKeys.some((key) => !seenKeys.has(key));

  const markAllSeen = useCallback(() => {
    // Solo se guardan las claves vigentes: las de días pasados ya no vuelven.
    const keys = alertKeys;
    setSeenKeys(new Set(keys));
    void saveSeenNoticeKeys(keys).catch(() => undefined);
  }, [alertKeys]);

  return { hasUnseen, markAllSeen, notices };
}
