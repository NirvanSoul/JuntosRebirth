import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { Icon } from 'phosphor-react-native';
import { CalendarDots } from 'phosphor-react-native/src/icons/CalendarDots';
import { House } from 'phosphor-react-native/src/icons/House';
import { Receipt } from 'phosphor-react-native/src/icons/Receipt';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text/Text';
import type { MainTabParamList } from '@/navigation/types';
import { iconSize, layout } from '@/theme/layout';
import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type TabRouteName = keyof MainTabParamList;

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

function NavigationIcon({ color, focused, presentation }: NavigationIconProps) {
  const IconComponent = presentation.icon;
  const scale = useSharedValue(focused ? 1 : 0.9);

  useEffect(() => {
    scale.value = withSpring(focused ? 1 : 0.9, {
      ...motion.tabIconSelectSpring,
      reduceMotion: ReduceMotion.System,
    });
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

export function AppTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, spacing.sm) },
      ]}
      testID="app-tab-bar"
    >
      {state.routes.map((route, index) => {
        const presentation = tabPresentation[route.name as TabRouteName];
        const options = descriptors[route.key]?.options;
        const isFocused = state.index === index;
        const color = isFocused ? colors.textPrimary : colors.textMuted;

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
            accessibilityState={{ selected: isFocused }}
            key={route.key}
            onLongPress={handleLongPress}
            onPress={handlePress}
            style={styles.item}
            testID={options?.tabBarButtonTestID}
          >
            {({ pressed }) => (
              <View
                style={[
                  styles.itemInner,
                  isFocused && styles.itemInnerSelected,
                  pressed && styles.itemInnerPressed,
                ]}
                testID={`app-tab-item-${route.name}`}
              >
                <NavigationIcon
                  color={color}
                  focused={isFocused}
                  presentation={presentation}
                />
                <Text style={{ color }} variant="caption" weight="semibold">
                  {presentation.label}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    container: {
      ...shadows.mainMenu,
      minHeight: 66,
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.sm,
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
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.sm,
    },
    itemInnerPressed: {
      backgroundColor: colors.background,
    },
    itemInnerSelected: {
      backgroundColor: colors.background,
    },
  });
}
