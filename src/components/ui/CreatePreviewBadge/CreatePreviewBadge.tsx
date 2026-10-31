import { Minus } from 'phosphor-react-native/src/icons/Minus';
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
  /**
   * Convierte el badge en la opción de quitar la selección —«Sin cuenta»—:
   * mismo formato con un signo menos sobre fondo oscuro, que se comporta como
   * una opción elegible y, elegida, marca el borde del mismo tono oscuro.
   */
  removeSelected?: boolean;
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
  removeSelected,
  testID,
}: CreatePreviewBadgeProps) {
  const isRemoveOption = removeSelected !== undefined;
  const Glyph = isRemoveOption ? Minus : Plus;
  const { colors, shadows } = useTheme();
  const themedStyles = useThemedStyles((palette) =>
    createThemedStyles(palette, shadows),
  );

  return (
    <Pressable
      accessibilityHint={
        isRemoveOption
          ? undefined
          : `Abre el formulario para ${label.toLocaleLowerCase('es-ES')}`
      }
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={isRemoveOption ? 'radio' : 'button'}
      accessibilityState={
        isRemoveOption ? { checked: removeSelected } : undefined
      }
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        themedStyles.badge,
        bordered ? themedStyles.borderedBadge : null,
        removeSelected ? themedStyles.selectedBadge : null,
        pressed ? styles.pressed : null,
      ]}
      testID={testID}
    >
      <View
        style={[
          themedStyles.icon,
          isRemoveOption ? themedStyles.removeIcon : null,
        ]}
        testID={`${testID}-icon-background`}
      >
        <Glyph
          color={isRemoveOption ? colors.onInverse : colors.onBrand}
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
    selectedBadge: {
      borderColor: colors.textPrimary,
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
    removeIcon: { backgroundColor: colors.textPrimary },
  });
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.72 },
});
