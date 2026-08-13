import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { iconSize, layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type MonthDirection = 'left' | 'right';
const monthArrowSize = 40;

type MonthNavigatorProps = {
  label: string;
  nextAccessibilityLabel: string;
  nextDisabled?: boolean;
  onNext: () => void;
  onPrevious: () => void;
  previousAccessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

export function MonthNavigatorArrow({
  direction,
  disabled = false,
}: {
  direction: MonthDirection;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const themedStyles = useThemedStyles(createThemedStyles);

  return (
    <View style={[themedStyles.arrow, disabled && styles.disabled]}>
      <Ionicons
        color={disabled ? colors.textMuted : colors.textPrimary}
        name={direction === 'left' ? 'chevron-back' : 'chevron-forward'}
        size={iconSize.md}
      />
    </View>
  );
}

export function MonthNavigatorLabel({ label }: { label: string }) {
  return (
    <Text align="center" numberOfLines={1} variant="bodyStrong">
      {label}
    </Text>
  );
}

export function MonthNavigator({
  label,
  nextAccessibilityLabel,
  nextDisabled = false,
  onNext,
  onPrevious,
  previousAccessibilityLabel,
  style,
}: MonthNavigatorProps) {
  return (
    <View style={[styles.navigator, style]}>
      <Pressable
        accessibilityLabel={previousAccessibilityLabel}
        accessibilityRole="button"
        onPress={onPrevious}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <MonthNavigatorArrow direction="left" />
      </Pressable>
      <View style={styles.label}>
        <MonthNavigatorLabel label={label} />
      </View>
      <Pressable
        accessibilityLabel={nextAccessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: nextDisabled }}
        disabled={nextDisabled}
        onPress={onNext}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <MonthNavigatorArrow direction="right" disabled={nextDisabled} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  navigator: {
    width: '100%',
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  button: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  label: { flex: 1 },
  pressed: { opacity: 0.72 },
});

function createThemedStyles(colors: ColorTokens) {
  return StyleSheet.create({
    arrow: {
      width: monthArrowSize,
      height: monthArrowSize,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
      backgroundColor: colors.keypad,
    },
  });
}
