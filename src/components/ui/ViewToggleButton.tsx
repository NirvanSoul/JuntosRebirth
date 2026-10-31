import { List } from 'phosphor-react-native/src/icons/List';
import { SquaresFour } from 'phosphor-react-native/src/icons/SquaresFour';
import { Pressable, StyleSheet } from 'react-native';

import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { iconSize, layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/useTheme';

type ViewToggleButtonProps = {
  accessibilityHint: string;
  accessibilityLabel: string;
  nextView: 'grid' | 'list';
  onPress: () => void;
  floating?: boolean;
  testID: string;
};

export function ViewToggleButton({
  accessibilityHint,
  accessibilityLabel,
  nextView,
  onPress,
  floating = false,
  testID,
}: ViewToggleButtonProps) {
  const { colors } = useTheme();
  const icon =
    nextView === 'list' ? (
      <List color={colors.textSecondary} size={iconSize.sm} />
    ) : (
      <SquaresFour color={colors.textSecondary} size={iconSize.sm} />
    );

  if (floating) {
    return (
      <ModalCloseButton
        accessibilityHint={accessibilityHint}
        accessibilityLabel={accessibilityLabel}
        iconContent={icon}
        onPress={onPress}
        shadow
        testID={testID}
      />
    );
  }

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={spacing.sm}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && { backgroundColor: colors.background },
      ]}
      testID={testID}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
  },
});
