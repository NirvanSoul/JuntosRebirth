import Ionicons from '@expo/vector-icons/Ionicons';
import { type PropsWithChildren, useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/Text/Text';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { colors } from '@/theme/colors';
import { iconSize, layout, minTouchTarget } from '@/theme/layout';
import { motion } from '@/theme/motion';
import { previewCardLayout } from '@/theme/previewCard';
import { spacing } from '@/theme/spacing';
import {
  getDisclosureEntering,
  getDisclosureLayoutTransition,
} from '@/theme/transitions';

type ActivityCollapsibleSectionProps = PropsWithChildren<{
  expanded: boolean;
  onToggle: () => void;
  title: string;
  testID?: string;
}>;

type AnimatedDisclosureContentProps = PropsWithChildren<{
  expanded: boolean;
  testID?: string;
}>;

type AnimatedChevronProps = {
  color?: string;
  expanded: boolean;
};

export function getActivityLayoutTransition() {
  return getDisclosureLayoutTransition();
}

export function AnimatedChevron({
  color = colors.textSecondary,
  expanded,
}: AnimatedChevronProps) {
  const rotation = useSharedValue(expanded ? 180 : 0);

  useEffect(() => {
    rotation.value = withSpring(expanded ? 180 : 0, {
      ...motion.disclosureSpring,
      reduceMotion: ReduceMotion.System,
    });
  }, [expanded, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={animatedStyle}
      testID={expanded ? 'disclosure-chevron-up' : 'disclosure-chevron-down'}
    >
      <Ionicons color={color} name="chevron-down" size={iconSize.sm} />
    </Animated.View>
  );
}

export function AnimatedDisclosureContent({
  children,
  expanded,
  testID,
}: AnimatedDisclosureContentProps) {
  if (!expanded) {
    return null;
  }

  return (
    <Animated.View
      entering={getDisclosureEntering()}
      layout={getActivityLayoutTransition()}
      testID={testID}
    >
      {children}
    </Animated.View>
  );
}

export function ActivityCollapsibleSection({
  children,
  expanded,
  onToggle,
  title,
  testID,
}: ActivityCollapsibleSectionProps) {
  const density = useLayoutDensity();
  const screenGutter = layout.screenGutter[density];

  return (
    <Animated.View
      layout={getActivityLayoutTransition()}
      style={[
        styles.section,
        {
          marginHorizontal: -screenGutter,
          paddingHorizontal: screenGutter,
        },
      ]}
      testID={testID}
    >
      <Pressable
        accessibilityHint={`${expanded ? 'Oculta' : 'Muestra'} el contenido de ${title.toLowerCase()}`}
        accessibilityLabel={title}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        hitSlop={spacing.sm}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.header,
          pressed ? styles.headerPressed : null,
        ]}
      >
        <Text accessibilityRole="header" variant="subheading">
          {title}
        </Text>
        <AnimatedChevron expanded={expanded} />
      </Pressable>
      <AnimatedDisclosureContent expanded={expanded}>
        <Animated.View style={styles.content}>{children}</Animated.View>
      </AnimatedDisclosureContent>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: previewCardLayout.borderRadius,
    paddingVertical: spacing.lg,
  },
  header: {
    minHeight: minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerPressed: {
    opacity: 0.64,
  },
  content: {
    marginTop: spacing.md,
  },
});
