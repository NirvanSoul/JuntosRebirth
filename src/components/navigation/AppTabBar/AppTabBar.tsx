import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { Icon } from 'phosphor-react-native';
import { CalendarDots } from 'phosphor-react-native/src/icons/CalendarDots';
import { House } from 'phosphor-react-native/src/icons/House';
import { Receipt } from 'phosphor-react-native/src/icons/Receipt';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text/Text';
import { FloatingCreateButton } from '@/components/navigation/FloatingCreateButton/FloatingCreateButton';
import type { MainTabParamList } from '@/navigation/types';
import { iconSize, layout } from '@/theme/layout';
import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type TabRouteName = keyof MainTabParamList;

type AppTabBarProps = BottomTabBarProps & {
  createDisabled?: boolean;
  disabledRoutes?: readonly TabRouteName[];
  onCreatePress: () => void;
  visible?: boolean;
};

type TabPresentation = { icon: Icon; label: string };

const tabPresentation: Record<TabRouteName, TabPresentation> = {
  Home: { label: 'Inicio', icon: House },
  Activity: {
    label: 'Actividad',
    icon: Receipt,
  },
  Map: {
    label: 'Mapa',
    icon: CalendarDots,
  },
};

type NavigationIconProps = {
  color: string;
  focused: boolean;
  presentation: TabPresentation;
};

type TabItemContentProps = NavigationIconProps & {
  disabled: boolean;
  pressed: boolean;
  routeName: TabRouteName;
  selectedBackgroundColor: string;
  styles: ReturnType<typeof createStyles>;
};

function NavigationIcon({ color, focused, presentation }: NavigationIconProps) {
  const IconComponent = presentation.icon;
  const scale = useSharedValue(1);

  useEffect(() => {
    const timingConfig = {
      duration: motion.mainTabSelectionDuration / 2,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    };

    scale.value = focused
      ? withSequence(
          withTiming(1.06, timingConfig),
          withTiming(1, timingConfig),
        )
      : withTiming(1, timingConfig);
  }, [focused, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <IconComponent
        color={color}
        size={iconSize.md}
        weight={focused ? 'fill' : 'regular'}
      />
    </Animated.View>
  );
}

function TabItemContent({
  color,
  disabled,
  focused,
  presentation,
  pressed,
  routeName,
  selectedBackgroundColor,
  styles,
}: TabItemContentProps) {
  const selectionProgress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    selectionProgress.value = withTiming(focused ? 1 : 0, {
      duration: motion.mainTabSelectionDuration,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [focused, selectionProgress]);

  const selectionStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      selectionProgress.value,
      [0, 1],
      ['rgba(0, 0, 0, 0)', selectedBackgroundColor],
    ),
  }));

  return (
    <Animated.View
      style={[
        styles.itemInner,
        selectionStyle,
        disabled && styles.itemInnerDisabled,
        pressed && styles.itemInnerPressed,
      ]}
      testID={`app-tab-item-${routeName}`}
    >
      <NavigationIcon
        color={color}
        focused={focused}
        presentation={presentation}
      />
      <Text style={{ color }} variant="caption" weight="semibold">
        {presentation.label}
      </Text>
    </Animated.View>
  );
}

export function AppTabBar({
  state,
  descriptors,
  navigation,
  createDisabled = false,
  disabledRoutes = [],
  onCreatePress,
  visible = true,
}: AppTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const isMenuVisible = visible;

  return (
    <View
      accessibilityElementsHidden={!isMenuVisible}
      importantForAccessibility={isMenuVisible ? 'auto' : 'no-hide-descendants'}
      pointerEvents={isMenuVisible ? 'auto' : 'none'}
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, spacing.sm) },
        !isMenuVisible && styles.containerHidden,
      ]}
      testID="app-tab-bar"
    >
      <View style={styles.tabs} testID="app-tab-bar-tabs">
        {state.routes.map((route, index) => {
          const presentation = tabPresentation[route.name as TabRouteName];
          const options = descriptors[route.key]?.options;
          const isFocused = state.index === index;
          const isDisabled = disabledRoutes.includes(
            route.name as TabRouteName,
          );
          const color =
            isFocused && !isDisabled ? colors.textPrimary : colors.textMuted;

          const handlePress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const handleLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <Pressable
              accessibilityLabel={
                options?.tabBarAccessibilityLabel ?? presentation.label
              }
              accessibilityRole="tab"
              accessibilityState={{
                disabled: isDisabled,
                selected: isFocused,
              }}
              disabled={isDisabled}
              key={route.key}
              onLongPress={handleLongPress}
              onPress={handlePress}
              style={styles.item}
              testID={options?.tabBarButtonTestID}
            >
              {({ pressed }) => (
                <TabItemContent
                  color={color}
                  disabled={isDisabled}
                  focused={isFocused}
                  presentation={presentation}
                  pressed={pressed}
                  routeName={route.name as TabRouteName}
                  selectedBackgroundColor={colors.background}
                  styles={styles}
                />
              )}
            </Pressable>
          );
        })}
      </View>
      <FloatingCreateButton
        onPress={onCreatePress}
        placement="inline"
        visible={!createDisabled}
      />
    </View>
  );
}

function createStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    container: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      left: 0,
      zIndex: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: 'transparent',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },
    containerHidden: { opacity: 0 },
    tabs: {
      ...shadows.mainMenu,
      minHeight: layout.floatingActionSize,
      flex: 1,
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: radii.round,
      paddingHorizontal: spacing.xs,
    },
    item: {
      flex: 1,
      minHeight: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemInner: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xs,
      borderRadius: radii.round,
    },
    itemInnerPressed: {
      backgroundColor: colors.background,
    },
    itemInnerDisabled: { opacity: 0.4 },
  });
}
