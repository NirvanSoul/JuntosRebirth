import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { iconSize, minTouchTarget } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/useTheme';

type SideMenuLinkRowProps = {
  accessibilityHint: string;
  /** Pinta icono y flecha en el color de acción para señalar algo nuevo. */
  highlighted?: boolean;
  iconName: ComponentProps<typeof Ionicons>['name'];
  iconTestID?: string;
  label: string;
  onPress: () => void;
};

/** Fila del menú lateral que abre otra pantalla o modal, con flecha final. */
export function SideMenuLinkRow({
  accessibilityHint,
  highlighted = false,
  iconName,
  iconTestID,
  label,
  onPress,
}: SideMenuLinkRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Ionicons
        color={highlighted ? colors.cta : colors.textPrimary}
        name={iconName}
        size={iconSize.sm}
        testID={iconTestID}
      />
      <Text style={styles.label} variant="label" weight="semibold">
        {label}
      </Text>
      <Ionicons
        color={highlighted ? colors.cta : colors.textMuted}
        name="chevron-forward"
        size={iconSize.xs}
        testID={iconTestID ? `${iconTestID}-chevron` : undefined}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  label: { minWidth: 0, flex: 1 },
  pressed: { opacity: 0.68 },
});
