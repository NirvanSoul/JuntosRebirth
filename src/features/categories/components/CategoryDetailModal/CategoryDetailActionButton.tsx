import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { iconSize } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

export type CategoryDetailActionButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

export function CategoryDetailActionButton({
  icon,
  label,
  onPress,
}: CategoryDetailActionButtonProps) {
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
    >
      <Ionicons
        color={colors.textMuted}
        name={icon}
        size={iconSize.md}
        testID={`category-action-icon-${icon}`}
      />
      <Text align="center" variant="footnote" weight="semibold">
        {label}
      </Text>
    </Pressable>
  );
}

function createStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    actionButton: {
      ...shadows.subtle,
      minWidth: 0,
      minHeight: 96,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      padding: spacing.xs,
    },
    pressed: { opacity: 0.64 },
  });
}
