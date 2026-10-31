import { startTransition, useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TransactionFilterButton } from '@/components/ui/TransactionFilterButton/TransactionFilterButton';
import {
  TransactionFiltersModal,
  type TransactionFilters,
} from '@/features/activity/components/TransactionFiltersModal';
import type { useActivityFilters } from '@/features/activity/hooks/useActivityFilters';
import type { Category } from '@/features/categories/types';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';

/**
 * Hueco que la cabecera flotante reserva en Mapa, entre la bandera de moneda
 * y la campana de avisos, para que nada pise este botón. Mide lo mismo que la
 * campana con su separación, así que también es lo que se aparta del borde.
 */
export const mapFilterHeaderInset = layout.minTouchTarget + spacing.sm;

/** Solo Mapa reserva el hueco del botón. */
export function getMapHeaderInset(activeTab: string): number | undefined {
  return activeTab === 'Map' ? mapFilterHeaderInset : undefined;
}

type MapFilterButtonProps = {
  categories: readonly Category[];
  currency: CurrencyCode;
  filters: ReturnType<typeof useActivityFilters>;
  previewMode: 'cards' | 'pills';
  onApplyPreviewMode: (mode: 'cards' | 'pills') => void;
};

/**
 * Filtros de Mapa (tipo, categoría, recurrencia y, en un espacio juntos,
 * autor), alineados con la cabecera flotante del espacio. La cabecera es común
 * a todas las pestañas; el botón vive en la pantalla porque solo filtra los
 * movimientos del calendario. El mes y la moneda se eligen fuera del modal.
 */
export function MapFilterButton({
  categories,
  currency,
  filters,
  previewMode,
  onApplyPreviewMode,
}: MapFilterButtonProps) {
  const insets = useSafeAreaInsets();
  const gutter = layout.screenGutter[useLayoutDensity()];
  // Lo aplicado al abrir: el modal lo usa como base y cerrar sin aplicar
  // vuelve a ello, porque el borrador se muestra en vivo detrás.
  const [openedWith, setOpenedWith] = useState<{
    filters: TransactionFilters;
    previewMode: 'cards' | 'pills';
  } | null>(null);
  const { applyFilters, authorFilter, category, recurrence, type } = filters;
  // Referencia estable: el modal reinicia su borrador cuando cambia `filters`.
  const modalFilters = useMemo<TransactionFilters>(
    () => ({
      author: authorFilter.author,
      category,
      currency,
      date: 'all',
      recurrence,
      type,
    }),
    [authorFilter.author, category, currency, recurrence, type],
  );
  const activeFilterCount =
    Number(type !== 'all') +
    Number(category.length > 0) +
    Number(recurrence !== 'all') +
    Number(authorFilter.isActive);

  const applyIfChanged = useCallback(
    (nextFilters: TransactionFilters) => {
      const sameCategories =
        nextFilters.category.length === category.length &&
        nextFilters.category.every((id, index) => id === category[index]);
      if (
        nextFilters.type !== type ||
        nextFilters.recurrence !== recurrence ||
        nextFilters.author !== authorFilter.author ||
        !sameCategories
      ) {
        applyFilters(nextFilters);
      }
    },
    [applyFilters, authorFilter.author, category, recurrence, type],
  );
  // En transición para que los toques del modal no esperen al calendario.
  const handlePreview = useCallback(
    (nextFilters: TransactionFilters, nextPreviewMode: 'cards' | 'pills') =>
      startTransition(() => {
        applyIfChanged(nextFilters);
        onApplyPreviewMode(nextPreviewMode);
      }),
    [applyIfChanged, onApplyPreviewMode],
  );
  const closeWithoutApplying = () => {
    if (openedWith) {
      applyIfChanged(openedWith.filters);
      onApplyPreviewMode(openedWith.previewMode);
    }
    setOpenedWith(null);
  };

  return (
    <>
      <View
        pointerEvents="box-none"
        style={[
          styles.anchor,
          {
            right: gutter + mapFilterHeaderInset,
            top: insets.top + spacing.sm,
          },
        ]}
        testID="map-filter-anchor"
      >
        <TransactionFilterButton
          activeFilterCount={activeFilterCount}
          onPress={() => setOpenedWith({ filters: modalFilters, previewMode })}
          floating
          testID="map-filter-button"
        />
      </View>
      <TransactionFiltersModal
        authorOptions={authorFilter.authorOptions}
        categories={categories}
        currencies={[currency]}
        filters={openedWith?.filters ?? modalFilters}
        onApply={(nextFilters) => {
          applyIfChanged(nextFilters);
          setOpenedWith(null);
        }}
        onClose={closeWithoutApplying}
        onPreview={handlePreview}
        previewMode={openedWith?.previewMode ?? previewMode}
        onApplyPreviewMode={onApplyPreviewMode}
        variant="calendar"
        visible={openedWith !== null}
      />
    </>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    zIndex: 2,
  },
});
