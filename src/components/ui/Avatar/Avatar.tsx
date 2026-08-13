import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, View } from 'react-native';

import { categoryColors } from '@/theme/categoryColors';
import { radii } from '@/theme/radii';
import { useTheme } from '@/theme/useTheme';

type AvatarProps = {
  size: number;
  testID?: string;
  uri?: string | null;
};

export function Avatar({ size, testID, uri }: AvatarProps) {
  const { colors } = useTheme();
  const dimensions = { width: size, height: size, borderRadius: radii.round };

  if (uri) {
    return <Image source={{ uri }} style={dimensions} testID={testID} />;
  }

  return (
    <View
      style={[
        dimensions,
        {
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: categoryColors.violet,
        },
      ]}
      testID={testID}
    >
      <Ionicons color={colors.onBrand} name="person" size={size * 0.55} />
    </View>
  );
}
