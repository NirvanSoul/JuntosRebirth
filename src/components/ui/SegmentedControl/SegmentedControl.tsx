import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Text, type TextTone } from '@/components/ui/Text/Text';
import { iconSize } from '@/theme/layout';
import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type SegmentedControlOption<Value extends string> = {
  icon?: keyof typeof Ionicons.glyphMap;
  iconRotation?: string;
  iconTestID?: string;
  label: string;
  value: Value;
};

type SegmentedControlProps<Value extends string> = {
  indicatorColor?: string;
  onChange: (value: Value) => void;
  options: readonly SegmentedControlOption<Value>[];
  selectedIconColor?: string;
  selectedTextTone?: TextTone;
  selectedValue: Value;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  indicatorTestID?: string;
  unselectedIconColor?: string;
  unselectedTextTone?: TextTone;
};

const controlPadding = spacing.xs;
const segmentHeight = 32;

/** Selector segmentado reutilizable para alternar entre dos opciones. */
export function SegmentedControl<Value extends string>({
  indicatorColor,
  indicatorTestID,
  onChange,
  options,
  selectedIconColor,
  selectedTextTone = 'primary',
  selectedValue,
  style,
  testID,
  unselectedIconColor,
  unselectedTextTone = 'secondary',
}: SegmentedControlProps<Value>) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [controlWidth, setControlWidth] = useState(0);
  const selectedIndex = Math.max(
    options.findIndex((option) => option.value === selectedValue),
    0,
  );
  const segmentWidth = Math.max(
    (controlWidth - controlPadding * 2) / options.length,
    0,
  );
  const indicatorPosition = useSharedValue(selectedIndex * segmentWidth);

  useEffect(() => {
    indicatorPosition.value = withSpring(selectedIndex * segmentWidth, {
      ...motion.chartModeSpring,
      reduceMotion: ReduceMotion.System,
    });
  }, [indicatorPosition, segmentWidth, selectedIndex]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorPosition.value }],
  }));

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(event) => setControlWidth(event.nativeEvent.layout.width)}
      style={[styles.control, style]}
      testID={testID}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.indicator,
          { width: segmentWidth },
          indicatorColor ? { backgroundColor: indicatorColor } : null,
          indicatorStyle,
        ]}
        testID={indicatorTestID}
      />
      {options.map((option) => {
        const selected = option.value === selectedValue;

        return (
          <Pressable
            accessibilityLabel={option.label}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            hitSlop={{ bottom: spacing.sm, top: spacing.sm }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              pressed ? styles.pressed : null,
            ]}
            testID={testID ? `${testID}-${option.value}` : undefined}
          >
            {option.icon ? (
              <View
                style={
                  option.iconRotation
                    ? { transform: [{ rotate: option.iconRotation }] }
                    : null
                }
                testID={option.iconTestID}
              >
                <Ionicons
                  color={
                    selected
                      ? (selectedIconColor ?? colors.textPrimary)
                      : (unselectedIconColor ?? colors.textSecondary)
                  }
                  name={option.icon}
                  size={iconSize.sm}
                />
              </View>
            ) : null}
            <Text
              align="center"
              tone={selected ? selectedTextTone : unselectedTextTone}
              variant="label"
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    control: {
      flexDirection: 'row',
      backgroundColor: colors.keypad,
      borderRadius: radii.round,
      padding: controlPadding,
    },
    indicator: {
      position: 'absolute',
      top: controlPadding,
      bottom: controlPadding,
      left: controlPadding,
      backgroundColor: colors.surface,
      borderRadius: radii.round,
    },
    segment: {
      height: segmentHeight,
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderRadius: radii.round,
      zIndex: 1,
    },
    pressed: { opacity: 0.64 },
  });
}
