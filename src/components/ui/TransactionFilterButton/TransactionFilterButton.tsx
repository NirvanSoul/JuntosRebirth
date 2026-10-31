import type { Insets } from 'react-native';

import { FilterIcon } from '@/components/icons/FilterIcon';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { iconSize, layout } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';

type TransactionFilterButtonProps = {
  activeFilterCount: number;
  hitSlop?: Insets;
  onPress: () => void;
  /** Aspecto de botón flotante, como la campana de avisos, para Mapa. */
  floating?: boolean;
  testID: string;
};

const filterIconSize = iconSize.xl * 0.8 * 0.9 * 0.9;

/**
 * Botón de acceso a los filtros de un listado de movimientos. Con algún
 * filtro aplicado, el icono pasa al color de acción para que se note sin
 * abrir el modal; el borde se mantiene.
 */
export function TransactionFilterButton({
  activeFilterCount,
  hitSlop,
  floating,
  onPress,
  testID,
}: TransactionFilterButtonProps) {
  const { colors } = useTheme();
  const isActive = activeFilterCount > 0;

  return (
    <ModalCloseButton
      accessibilityHint="Abre las opciones de filtrado"
      accessibilityLabel={
        isActive ? `Filtros, ${activeFilterCount} activos` : 'Filtros'
      }
      hitSlop={hitSlop}
      iconContent={
        <FilterIcon
          color={isActive ? colors.cta : undefined}
          size={filterIconSize}
        />
      }
      onPress={onPress}
      floating={floating}
      size={layout.minTouchTarget}
      testID={testID}
    />
  );
}
