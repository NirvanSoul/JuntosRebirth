import { useId, useState } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

type GradientCardProps = ViewProps & {
  colors: readonly [string, string];
  contentStyle?: StyleProp<ViewStyle>;
};

export function GradientCard({
  children,
  colors,
  contentStyle,
  onLayout,
  style,
  ...viewProps
}: GradientCardProps) {
  const gradientId = `gradient-card-${useId().replaceAll(':', '')}`;
  const [gradientSize, setGradientSize] = useState({ height: 0, width: 0 });
  const handleLayout = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;

    setGradientSize((currentSize) =>
      currentSize.height === height && currentSize.width === width
        ? currentSize
        : { height, width },
    );
    onLayout?.(event);
  };
  const gradientHeight = gradientSize.height || '100%';
  const gradientWidth = gradientSize.width || '100%';

  return (
    <View
      {...viewProps}
      onLayout={handleLayout}
      style={[styles.card, { backgroundColor: colors[0] }, style]}
    >
      <Svg
        accessibilityElementsHidden
        height={gradientHeight}
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        preserveAspectRatio="none"
        style={styles.background}
        testID="gradient-card-background"
        width={gradientWidth}
      >
        <Defs>
          <LinearGradient id={gradientId} x1="0%" x2="100%" y1="100%" y2="0%">
            <Stop offset="0" stopColor={colors[0]} />
            <Stop offset="1" stopColor={colors[1]} />
          </LinearGradient>
        </Defs>
        <Rect
          fill={`url(#${gradientId})`}
          height={gradientHeight}
          testID="gradient-card-fill"
          width={gradientWidth}
          x="0"
          y="0"
        />
      </Svg>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  background: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  content: {
    zIndex: 1,
  },
});
