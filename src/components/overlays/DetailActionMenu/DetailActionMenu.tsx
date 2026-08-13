import type { ComponentType } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { iconSize, layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

import { DetailDeleteIcon, DetailEditIcon } from './DetailActionIcons';

type DetailActionMenuProps = {
  itemLabel: string;
  onDelete?: () => void;
  onEdit: () => void;
  testIDPrefix: string;
};

type DetailActionButtonProps = {
  accessibilityLabel: string;
  icon: ComponentType<{ color: string; size: number; testID?: string }>;
  iconSize: number;
  onPress: () => void;
  testID: string;
};

function DetailActionButton({
  accessibilityLabel,
  icon: IconComponent,
  iconSize: actionIconSize,
  onPress,
  testID,
}: DetailActionButtonProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      testID={testID}
    >
      <IconComponent
        color={colors.textPrimary}
        size={actionIconSize}
        testID={`${testID}-icon`}
      />
    </Pressable>
  );
}

export function DetailActionMenu({
  itemLabel,
  onDelete,
  onEdit,
  testIDPrefix,
}: DetailActionMenuProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View
      style={styles.actions}
      testID={`${testIDPrefix}-detail-edit-delete-actions`}
    >
      {onDelete ? (
        <DetailActionButton
          accessibilityLabel={`Eliminar ${itemLabel}`}
          icon={DetailDeleteIcon}
          iconSize={iconSize.md}
          onPress={onDelete}
          testID={`${testIDPrefix}-menu-delete-item`}
        />
      ) : null}
      <DetailActionButton
        accessibilityLabel={`Editar ${itemLabel}`}
        icon={DetailEditIcon}
        iconSize={iconSize.sm}
        onPress={onEdit}
        testID={`${testIDPrefix}-menu-edit-item`}
      />
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    actions: {
      zIndex: 1,
      flexDirection: 'row',
      gap: spacing.md,
    },
    button: {
      width: layout.minTouchTarget,
      height: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: colors.border,
      borderRadius: radii.lg,
      borderWidth: 1,
      backgroundColor: colors.keypad,
    },
    pressed: { opacity: 0.64 },
  });
}
