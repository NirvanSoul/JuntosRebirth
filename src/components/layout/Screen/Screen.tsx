import { type PropsWithChildren, type RefObject, useRef } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { useThemedStyles } from '@/theme/useThemedStyles';
import { layout } from '@/theme/layout';
import type { ColorTokens } from '@/theme/types';
import { spacing } from '@/theme/spacing';

type ScreenProps = PropsWithChildren<{
  contentContainerStyle?: ViewStyle;
  onScrollOffsetChange?: (offsetY: number) => void;
  onScrollDirectionChange?: (direction: 'down' | 'up') => void;
  scrollRef?: RefObject<ScrollView | null>;
  scrollable?: boolean;
  stickyHeaderIndices?: number[];
  testID?: string;
  transparentBackground?: boolean;
}>;

const scrollDirectionThreshold = 12;
const topSafeAreaContentRatio = 0.5;

function createScreenStyles(colors: ColorTokens) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    transparentBackground: {
      backgroundColor: 'transparent',
    },
    content: {
      flexGrow: 1,
      paddingBottom: layout.floatingActionClearance,
    },
  });
}

export function Screen({
  children,
  contentContainerStyle,
  onScrollOffsetChange,
  onScrollDirectionChange,
  scrollRef,
  scrollable = true,
  stickyHeaderIndices,
  testID,
  transparentBackground = false,
}: ScreenProps) {
  const density = useLayoutDensity();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createScreenStyles);
  const lastScrollOffset = useRef(0);
  const accumulatedScrollDistance = useRef(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentOffset = Math.max(event.nativeEvent.contentOffset.y, 0);
    onScrollOffsetChange?.(currentOffset);

    if (!onScrollDirectionChange) {
      return;
    }

    const delta = currentOffset - lastScrollOffset.current;
    lastScrollOffset.current = currentOffset;

    if (currentOffset === 0) {
      accumulatedScrollDistance.current = 0;
      onScrollDirectionChange('up');
      return;
    }

    if (
      accumulatedScrollDistance.current !== 0 &&
      Math.sign(delta) !== Math.sign(accumulatedScrollDistance.current)
    ) {
      accumulatedScrollDistance.current = delta;
    } else {
      accumulatedScrollDistance.current += delta;
    }

    if (
      Math.abs(accumulatedScrollDistance.current) < scrollDirectionThreshold
    ) {
      return;
    }

    onScrollDirectionChange(
      accumulatedScrollDistance.current > 0 ? 'down' : 'up',
    );
    accumulatedScrollDistance.current = 0;
  };

  const contentStyle = [
    styles.content,
    {
      paddingHorizontal: layout.screenGutter[density],
      paddingTop:
        insets.top * topSafeAreaContentRatio +
        layout.minTouchTarget +
        spacing.lg,
    },
    contentContainerStyle,
  ];

  return (
    <SafeAreaView
      edges={['left', 'right']}
      style={[
        styles.safeArea,
        transparentBackground ? styles.transparentBackground : null,
      ]}
      testID={testID}
    >
      {scrollable ? (
        <ScrollView
          contentContainerStyle={contentStyle}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          onScroll={handleScroll}
          ref={scrollRef}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={stickyHeaderIndices}
          testID={testID ? `${testID}-scroll-view` : undefined}
        >
          {children}
        </ScrollView>
      ) : (
        <View
          style={contentStyle}
          testID={testID ? `${testID}-content` : undefined}
        >
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
