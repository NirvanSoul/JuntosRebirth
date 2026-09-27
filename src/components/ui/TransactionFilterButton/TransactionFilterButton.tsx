import type { Insets } from 'react-native';

import { FilterIcon } from '@/components/icons/FilterIcon';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { iconSize, layout } from '@/theme/layout';

type TransactionFilterButtonProps = {
  activeFilterCount: number;
  hitSlop?: Insets;
  onPress: () => void;
  testID: string;
};

const filterIconSize = iconSize.xl * 0.8 * 0.9 * 0.9;

/** Botón de acceso a los filtros de un listado de movimientos. */
export function TransactionFilterButton({
  activeFilterCount,
  hitSlop,
  onPress,
  testID,
}: TransactionFilterButtonProps) {
  return (
    <ModalCloseButton
      accessibilityHint="Abre las opciones de filtrado"
      accessibilityLabel={
        activeFilterCount > 0
          ? `Filtros, ${activeFilterCount} activos`
          : 'Filtros'
      }
      hitSlop={hitSlop}
      iconContent={<FilterIcon size={filterIconSize} />}
      onPress={onPress}
      size={layout.minTouchTarget}
      testID={testID}
    />
  );
}
