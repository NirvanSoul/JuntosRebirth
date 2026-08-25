import { SlidersHorizontal } from 'phosphor-react-native/src/icons/SlidersHorizontal';

import { useTheme } from '@/theme/useTheme';

type FilterIconProps = {
  size: number;
};

export function FilterIcon({ size }: FilterIconProps) {
  const { colors } = useTheme();

  return (
    <SlidersHorizontal
      color={colors.textPrimary}
      size={size}
      testID="activity-filter-icon"
      weight="bold"
    />
  );
}
