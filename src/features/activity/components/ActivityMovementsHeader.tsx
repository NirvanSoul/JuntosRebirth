import type { LayoutChangeEvent } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { DocumentDownloadBoldIcon } from '@/components/icons/DocumentDownloadBoldIcon';
import { FilterIcon } from '@/components/icons/FilterIcon';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { Text } from '@/components/ui/Text/Text';
import { getActivityLayoutTransition } from '@/features/activity/components/ActivityCollapsibleSection';
import { iconSize, layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';

type ActivityMovementsHeaderProps = {
  /** Número de filtros aplicados, para anunciarlo en el botón de filtros. */
  activeFilterCount: number;
  onLayout: (event: LayoutChangeEvent) => void;
  onOpenFilters: () => void;
  onOpenImport?: () => void;
};

const filterIconSize = iconSize.xl * 0.8 * 0.9 * 0.9;
const importIconSize = iconSize.xl * 0.85 * 0.9 * 0.9;
const movementActionButtonSize = layout.minTouchTarget;
/**
 * Los dos botones se reparten a partes iguales la separación que los separa
 * (`actions` usa `spacing.sm`), de modo que no quede ninguna franja muerta
 * entre ellos ni se solapen sus áreas táctiles.
 */
const actionGapHitSlop = spacing.sm / 2;
const filterButtonHitSlop = {
  top: spacing.sm,
  right: actionGapHitSlop,
  bottom: spacing.sm,
  left: spacing.sm,
};
const importButtonHitSlop = {
  top: spacing.sm,
  right: spacing.sm,
  bottom: spacing.sm,
  left: actionGapHitSlop,
};

/**
 * Cabecera de la lista de movimientos: el título y sus dos acciones.
 *
 * Queda justo encima del ancla fija del resumen, cuya franja de compensación de
 * safe area se solapa con esta fila; ese ancla la neutraliza con `box-none`
 * para que estos botones reciban sus toques (ver `ActivityScreen`).
 */
export function ActivityMovementsHeader({
  activeFilterCount,
  onLayout,
  onOpenFilters,
  onOpenImport,
}: ActivityMovementsHeaderProps) {
  return (
    <Animated.View
      layout={getActivityLayoutTransition()}
      onLayout={onLayout}
      style={styles.header}
      testID="activity-movements-header"
    >
      <Text accessibilityRole="header" variant="subheading">
        Movimientos
      </Text>
      <View style={styles.actions}>
        <ModalCloseButton
          accessibilityHint="Abre las opciones de filtrado"
          accessibilityLabel={
            activeFilterCount > 0
              ? `Filtros, ${activeFilterCount} activos`
              : 'Filtros'
          }
          hitSlop={filterButtonHitSlop}
          iconContent={<FilterIcon size={filterIconSize} />}
          onPress={onOpenFilters}
          size={movementActionButtonSize}
          testID="activity-filter-button"
        />
        <ModalCloseButton
          accessibilityHint="Abre la importación de documentos bancarios"
          accessibilityLabel="Importar documentos bancarios"
          hitSlop={importButtonHitSlop}
          iconContent={
            <DocumentDownloadBoldIcon offsetX={1} size={importIconSize} />
          }
          onPress={onOpenImport ?? (() => undefined)}
          size={movementActionButtonSize}
          testID="activity-import-button"
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
