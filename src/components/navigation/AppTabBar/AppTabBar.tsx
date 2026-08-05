import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { Icon } from 'phosphor-react-native';
import { CalendarDots } from 'phosphor-react-native/src/icons/CalendarDots';
import { House } from 'phosphor-react-native/src/icons/House';
import { Receipt } from 'phosphor-react-native/src/icons/Receipt';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text/Text';
import type { MainTabParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { iconSize, layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';

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

  return (
    <IconComponent
      color={color}
      size={iconSize.md}
      weight={focused ? 'fill' : 'regular'}
    />
  );
}

export function AppTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

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
            style={({ pressed }) => [
              styles.item,
              isFocused && styles.itemSelected,
              pressed && styles.itemPressed,
            ]}
            testID={options?.tabBarButtonTestID}
          >
            <NavigationIcon
              color={color}
              focused={isFocused}
              presentation={presentation}
            />
            <Text style={{ color }} variant="caption" weight="semibold">
              {presentation.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
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
    gap: spacing.xs,
    borderRadius: radii.sm,
  },
  itemPressed: {
    backgroundColor: colors.background,
  },
  itemSelected: {
    backgroundColor: colors.background,
  },
});
