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
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type MonthDirection = 'left' | 'right';
const monthArrowSize = 40;

type MonthNavigatorProps = {
  label: string;
  /** Hace pulsable el texto central, p. ej. para desplegar opciones de periodo. */
  labelAccessibilityHint?: string;
  labelExpanded?: boolean;
  onLabelPress?: () => void;
  nextAccessibilityLabel: string;
  nextDisabled?: boolean;
  onNext: () => void;
  onPrevious: () => void;
  previousAccessibilityLabel: string;
  previousDisabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
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
  labelAccessibilityHint,
  labelExpanded,
  onLabelPress,
  nextAccessibilityLabel,
  nextDisabled = false,
  onNext,
  onPrevious,
  previousAccessibilityLabel,
  previousDisabled = false,
  style,
  testID,
}: MonthNavigatorProps) {
  const themedStyles = useThemedStyles(createThemedStyles);

  return (
    <View style={[styles.navigator, style]} testID={testID}>
      <Pressable
        accessibilityLabel={previousAccessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: previousDisabled }}
        disabled={previousDisabled}
        onPress={onPrevious}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <MonthNavigatorArrow direction="left" disabled={previousDisabled} />
      </Pressable>
      {onLabelPress ? (
        <Pressable
          accessibilityHint={labelAccessibilityHint}
          accessibilityLabel={label}
          accessibilityRole="button"
          accessibilityState={{ expanded: labelExpanded }}
          onPress={onLabelPress}
          // Mismo fondo que las flechas: sin él, nada indica que el periodo
          // también se puede pulsar.
          style={({ pressed }) => [
            styles.label,
            themedStyles.labelButton,
            pressed && styles.pressed,
          ]}
        >
          <MonthNavigatorLabel label={label} />
        </Pressable>
      ) : (
        <View style={styles.label}>
          <MonthNavigatorLabel label={label} />
        </View>
      )}
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
    labelButton: {
      height: monthArrowSize,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      borderRadius: radii.round,
      backgroundColor: colors.keypad,
    },
  });
}
