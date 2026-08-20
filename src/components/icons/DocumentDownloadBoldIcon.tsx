import { View } from 'react-native';

import { AssetSvgIcon } from '@/components/icons/AssetSvgIcon';
import { useTheme } from '@/theme/useTheme';

const documentDownloadBoldSource = require('../../../assets/icons/DocDownloadBold.svg');

type DocumentDownloadBoldIconProps = {
  offsetX?: number;
  size: number;
};

/** Recurso original: `assets/icons/DocDownloadBold.svg`. */
export function DocumentDownloadBoldIcon({
  offsetX = 0,
  size,
}: DocumentDownloadBoldIconProps) {
  const { colors } = useTheme();

  return (
    <View
      style={
        offsetX === 0 ? undefined : { transform: [{ translateX: offsetX }] }
      }
    >
      <AssetSvgIcon
        color={colors.textPrimary}
        size={size}
        source={documentDownloadBoldSource}
      />
    </View>
  );
}
