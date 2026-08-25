import { FileArrowDown } from 'phosphor-react-native/src/icons/FileArrowDown';
import { View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

type DocumentDownloadBoldIconProps = {
  offsetX?: number;
  size: number;
};

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
      <FileArrowDown
        color={colors.textPrimary}
        size={size}
        testID="activity-import-icon"
        weight="bold"
      />
    </View>
  );
}
