import { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type TextLayoutEventData,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/Text/Text';
import { motion } from '@/theme/motion';
import { spacing } from '@/theme/spacing';
import { maxFontScale, typography } from '@/theme/typography';

type CompactPreviewMarqueeTextProps = {
  children: string;
};

const marqueeGap = spacing.md;
export const compactPreviewMarqueeHeight = Math.ceil(
  typography.caption.lineHeight * maxFontScale.caption,
);

export function CompactPreviewMarqueeText({
  children,
}: CompactPreviewMarqueeTextProps) {
  const reduceMotion = useReducedMotion();
  const [viewportWidth, setViewportWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const translateX = useSharedValue(0);
  const shouldScroll =
    !reduceMotion && viewportWidth > 0 && textWidth > viewportWidth;
  const itemWidth = Math.ceil(textWidth);
  const loopDistance = itemWidth + marqueeGap;

  useEffect(() => {
    cancelAnimation(translateX);
    translateX.value = 0;

    if (!shouldScroll) return;

    const duration = Math.max(
      motion.compactPreviewMarqueeMinimumDuration,
      Math.round(
        (loopDistance / motion.compactPreviewMarqueePixelsPerSecond) * 1000,
      ),
    );
    translateX.value = withRepeat(
      withSequence(
        withDelay(
          motion.compactPreviewMarqueeDelay,
          withTiming(-loopDistance, {
            duration,
            easing: Easing.linear,
            reduceMotion: ReduceMotion.System,
          }),
          ReduceMotion.System,
        ),
        withTiming(0, { duration: 0, reduceMotion: ReduceMotion.System }),
      ),
      -1,
      false,
      undefined,
      ReduceMotion.System,
    );

    return () => cancelAnimation(translateX);
  }, [loopDistance, shouldScroll, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  const handleViewportLayout = useCallback((event: LayoutChangeEvent) => {
    setViewportWidth(event.nativeEvent.layout.width);
  }, []);
  const handleTextLayout = useCallback(
    (event: NativeSyntheticEvent<TextLayoutEventData>) => {
      setTextWidth(event.nativeEvent.lines[0]?.width ?? 0);
    },
    [],
  );

  if (reduceMotion) {
    return (
      <Text
        align="center"
        ellipsizeMode="tail"
        numberOfLines={1}
        testID="compact-preview-marquee-static-text"
        variant="caption"
        weight="semibold"
      >
        {children}
      </Text>
    );
  }

  const itemStyle = shouldScroll && itemWidth > 0 ? { width: itemWidth } : null;

  return (
    <View
      onLayout={handleViewportLayout}
      style={styles.viewport}
      testID="compact-preview-marquee-viewport"
    >
      <Animated.View
        style={[
          styles.track,
          shouldScroll ? styles.scrollingTrack : styles.staticTrack,
          animatedStyle,
        ]}
        testID="compact-preview-marquee-track"
      >
        <Text
          accessible={false}
          numberOfLines={1}
          style={[styles.trackText, itemStyle]}
          testID="compact-preview-marquee-text"
          variant="caption"
          weight="semibold"
        >
          {children}
        </Text>
        {shouldScroll ? (
          <Text
            accessible={false}
            numberOfLines={1}
            style={[styles.trackText, styles.repeatedText, itemStyle]}
            testID="compact-preview-marquee-copy"
            variant="caption"
            weight="semibold"
          >
            {children}
          </Text>
        ) : null}
      </Animated.View>
      <Text
        accessibilityElementsHidden
        accessible={false}
        importantForAccessibility="no"
        numberOfLines={1}
        onTextLayout={handleTextLayout}
        style={styles.measurementText}
        testID="compact-preview-marquee-measurement"
        variant="caption"
        weight="semibold"
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    width: '100%',
    height: compactPreviewMarqueeHeight,
    overflow: 'hidden',
  },
  track: {
    flexDirection: 'row',
  },
  staticTrack: {
    alignSelf: 'center',
  },
  scrollingTrack: {
    alignSelf: 'flex-start',
  },
  trackText: {
    flexShrink: 0,
  },
  repeatedText: {
    marginLeft: marqueeGap,
  },
  measurementText: {
    position: 'absolute',
    width: 10_000,
    opacity: 0,
  },
});
