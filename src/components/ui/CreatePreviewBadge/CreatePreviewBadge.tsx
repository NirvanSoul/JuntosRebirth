import { Plus } from 'phosphor-react-native/src/icons/Plus';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { iconSize, minTouchTarget } from '@/theme/layout';
import { previewCardLayout } from '@/theme/previewCard';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type CreatePreviewBadgeProps = {
  accessibilityLabel: string;
  bordered?: boolean;
  label: string;
  onPress?: () => void;
  testID: string;
};

/** Mantiene el objetivo táctil sin imponer una anchura al contenido. */
export const createPreviewBadgeLayout = {
  minHeight: minTouchTarget,
} as const;

/** Acción compacta para añadir contenido al final de un carrusel de previews. */
export function CreatePreviewBadge({
  accessibilityLabel,
  bordered = false,
  label,
  onPress,
  testID,
}: CreatePreviewBadgeProps) {
  const { colors, shadows } = useTheme();
  const themedStyles = useThemedStyles((palette) =>
    createThemedStyles(palette, shadows),
  );

  return (
    <Pressable
      accessibilityHint={`Abre el formulario para ${label.toLocaleLowerCase('es-ES')}`}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        themedStyles.badge,
        bordered ? themedStyles.borderedBadge : null,
        pressed ? styles.pressed : null,
      ]}
      testID={testID}
    >
      <View style={themedStyles.icon} testID={`${testID}-icon-background`}>
        <Plus
          color={colors.onBrand}
          size={iconSize.xs}
          testID={`${testID}-glyph`}
          weight="bold"
        />
      </View>
      <Text tone="primary" variant="footnote" weight="medium">
        {label}
      </Text>
    </Pressable>
  );
}

function createThemedStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    badge: {
      ...shadows.subtle,
      ...createPreviewBadgeLayout,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: previewCardLayout.borderRadius,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    borderedBadge: {
      borderColor: colors.categoryPreviewBorder,
      borderWidth: 1,
    },
    icon: {
      width: iconSize.md,
      height: iconSize.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: previewCardLayout.directionIconRadius,
      backgroundColor: colors.cta,
    },
  });
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.72 },
});
