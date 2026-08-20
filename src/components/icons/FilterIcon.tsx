import { AssetSvgIcon } from '@/components/icons/AssetSvgIcon';
import { useTheme } from '@/theme/useTheme';

const filterIconSource = require('../../../assets/icons/Filter icon.svg');

type FilterIconProps = {
  size: number;
};

/** Recurso original: `assets/icons/Filter icon.svg`. */
export function FilterIcon({ size }: FilterIconProps) {
  const { colors } = useTheme();

  return (
    <AssetSvgIcon
      color={colors.textPrimary}
      size={size}
      source={filterIconSource}
    />
  );
}
