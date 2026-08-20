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

import { Text } from '@/components/ui/Text/Text';
import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useThemedStyles } from '@/theme/useThemedStyles';

type SegmentedControlOption<Value extends string> = {
  label: string;
  value: Value;
};

type SegmentedControlProps<Value extends string> = {
  onChange: (value: Value) => void;
  options: readonly SegmentedControlOption<Value>[];
  selectedValue: Value;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  indicatorTestID?: string;
};

const controlPadding = spacing.xs;
const segmentHeight = 32;

/** Selector segmentado reutilizable para alternar entre dos opciones. */
export function SegmentedControl<Value extends string>({
  indicatorTestID,
  onChange,
  options,
  selectedValue,
  style,
  testID,
}: SegmentedControlProps<Value>) {
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
        style={[styles.indicator, { width: segmentWidth }, indicatorStyle]}
        testID={indicatorTestID}
      />
      {options.map((option) => {
        const selected = option.value === selectedValue;

        return (
          <Pressable
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
            <Text
              align="center"
              tone={selected ? 'primary' : 'secondary'}
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
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
      zIndex: 1,
    },
    pressed: { opacity: 0.64 },
  });
}
