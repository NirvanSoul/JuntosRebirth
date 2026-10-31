import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FilterIcon } from '@/components/icons/FilterIcon';
import { NoticeToast } from '@/components/overlays/NoticeToast/NoticeToast';
import { iconSize } from '@/theme/layout';
import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { useTheme } from '@/theme/useTheme';

type FilterNotice = { count: number; id: number };

const badgeSize = 32;

/**
 * Aviso inferior al aplicar filtros, con el mismo aspecto que el de un
 * movimiento creado. Solo avisa cuando algo queda filtrado o cuando se
 * quitan los filtros que había; aplicar sin filtros no dice nada.
 */
export function useFilterNotice() {
  const [notice, setNotice] = useState<FilterNotice | null>(null);
  const nextId = useRef(1);

  const announceFilters = useCallback(
    (count: number, previousCount: number) => {
      if (count === 0 && previousCount === 0) return;
      setNotice({ count, id: nextId.current });
      nextId.current += 1;
    },
    [],
  );
  const dismissFilterNotice = useCallback((noticeId: number) => {
    setNotice((current) => (current?.id === noticeId ? null : current));
  }, []);

  return { announceFilters, dismissFilterNotice, filterNotice: notice };
}

export function FilterNoticeToast({
  notice,
  onDismiss,
}: {
  notice: FilterNotice | null;
  onDismiss: (noticeId: number) => void;
}) {
  const { colors } = useTheme();
  // Memorizado: un aviso nuevo en cada render reiniciaría su temporizador.
  const toastNotice = useMemo(
    () =>
      notice && {
        id: notice.id,
        durationMs: motion.movementNoticeVisibleDuration,
        message:
          notice.count === 0
            ? 'Filtros quitados'
            : notice.count === 1
              ? 'Filtro aplicado'
              : `${notice.count} filtros aplicados`,
        placement: 'bottom' as const,
        leading: (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[styles.badge, { backgroundColor: colors.cta }]}
          >
            <FilterIcon color={colors.onBrand} size={iconSize.sm} />
          </View>
        ),
      },
    [colors.cta, colors.onBrand, notice],
  );

  return (
    <NoticeToast
      notice={toastNotice}
      onDismiss={onDismiss}
      testID="filter-notice-toast"
    />
  );
}

const styles = StyleSheet.create({
  badge: {
    width: badgeSize,
    height: badgeSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
  },
});
