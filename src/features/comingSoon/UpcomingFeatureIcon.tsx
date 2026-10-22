import { Microphone } from 'phosphor-react-native/src/icons/Microphone';
import { StyleSheet, View } from 'react-native';

import { CategoryIcon } from '@/features/categories/components/CategoryIcon/CategoryIcon';
import type { UpcomingFeature } from '@/features/comingSoon/upcomingFeatures';
import { categoryColors } from '@/theme/categoryColors';
import { previewCardLayout } from '@/theme/previewCard';
import { useTheme } from '@/theme/useTheme';

export function UpcomingFeatureIcon({ feature }: { feature: UpcomingFeature }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.icon, { backgroundColor: categoryColors[feature.color] }]}
    >
      {feature.icon === 'microphone' ? (
        <Microphone
          color={colors.onBrand}
          size={previewCardLayout.glyphSize}
          weight="fill"
        />
      ) : (
        <CategoryIcon
          color={colors.onBrand}
          name={feature.icon}
          size={previewCardLayout.glyphSize}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: previewCardLayout.iconSize,
    height: previewCardLayout.iconSize,
    borderRadius: previewCardLayout.iconRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
