import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { GradientCard } from '@/components/ui/GradientCard/GradientCard';
import { Text } from '@/components/ui/Text/Text';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon/CategoryIcon';
import type { Category } from '@/features/categories/types';
import { categoryColors } from '@/theme/categoryColors';
import { colors } from '@/theme/colors';
import { createDiagonalGradient } from '@/theme/gradients';
import { iconSize } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';

type CategorySelectionCardProps = {
  accessibilityLabel?: string;
  accessibilityRole?: 'checkbox' | 'radio';
  category: Pick<Category, 'colorToken' | 'icon' | 'id' | 'name'>;
  height: number;
  onPress: () => void;
  selected: boolean;
  showCheckmark?: boolean;
  testID?: string;
  width: number;
};

const categoryIconCircleSize = 44;
export const categorySelectionCardHeight = {
  compact: 88,
  regular: 104,
} as const;

export function CategorySelectionCard({
  accessibilityLabel,
  accessibilityRole = 'radio',
  category,
  height,
  onPress,
  selected,
  showCheckmark = false,
  testID,
  width,
}: CategorySelectionCardProps) {
  const categoryColor = categoryColors[category.colorToken];

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? category.name}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { width, height },
        selected ? styles.selectedCard : null,
        pressed ? styles.pressed : null,
      ]}
      testID={testID}
    >
      {selected ? (
        <GradientCard
          colors={createDiagonalGradient(categoryColor)}
          pointerEvents="none"
          style={styles.selectedGradient}
          testID={`category-${category.id}-selected-gradient`}
        />
      ) : null}
      {selected && showCheckmark ? (
        <Ionicons
          color={colors.onBrand}
          name="checkmark-circle"
          size={iconSize.sm}
          style={styles.checkmark}
          testID={`category-${category.id}-checkmark`}
        />
      ) : null}
      <View
        accessibilityElementsHidden
        importantForAccessibility="no"
        pointerEvents="none"
        style={[
          styles.icon,
          !selected ? { backgroundColor: categoryColor } : null,
        ]}
        testID={`category-${category.id}-icon`}
      >
        <CategoryIcon
          color={colors.onBrand}
          name={category.icon}
          size={iconSize.md}
        />
      </View>
      <Text
        align="center"
        numberOfLines={2}
        tone={selected ? 'onBrand' : 'primary'}
        variant="footnote"
        weight="semibold"
      >
        {category.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    padding: spacing.sm,
  },
  selectedCard: { borderWidth: 0 },
  selectedGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.md,
  },
  checkmark: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 2,
  },
  icon: {
    width: categoryIconCircleSize,
    height: categoryIconCircleSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
  },
  pressed: { opacity: 0.72 },
});
