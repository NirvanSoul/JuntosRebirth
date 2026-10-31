import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { Icon } from 'phosphor-react-native';
import { CalendarDots } from 'phosphor-react-native/src/icons/CalendarDots';
import { House } from 'phosphor-react-native/src/icons/House';
import { Receipt } from 'phosphor-react-native/src/icons/Receipt';
import { Sparkle } from 'phosphor-react-native/src/icons/Sparkle';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
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
  /** Baja la barra y el botón `+` fuera de la pantalla, y los sube al volver. */
  lowered?: boolean;
  onCreatePress: () => void;
  visible?: boolean;
};

type TabPresentation = { icon: Icon; label: string };

type TabLabelKey = 'home' | 'comingSoon' | 'activity' | 'map';

const tabPresentation: Record<
  TabRouteName,
  { icon: Icon; labelKey: TabLabelKey }
> = {
  Home: { labelKey: 'home', icon: House },
  ComingSoon: { labelKey: 'comingSoon', icon: Sparkle },
  Activity: {
    labelKey: 'activity',
    icon: Receipt,
  },
  Map: {
    labelKey: 'map',
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

/** La pestaña activa solo se distingue por el icono relleno, sin fondo. */
function TabItemContent({
  color,
  disabled,
  focused,
  presentation,
  pressed,
  routeName,
  styles,
}: TabItemContentProps) {
  return (
    <View
      style={[
        styles.itemInner,
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
    </View>
  );
}

export function AppTabBar({
  state,
  descriptors,
  navigation,
  createDisabled = false,
  disabledRoutes = [],
  lowered = false,
  onCreatePress,
  visible = true,
}: AppTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const isMenuVisible = visible && !lowered;
  const bottomPadding = Math.max(insets.bottom, spacing.sm);
  // Transición CSS de Reanimated: sin valores animados mientras no cambia.
  const reduceMotion = useReducedMotion();

  return (
    <Animated.View
      accessibilityElementsHidden={!isMenuVisible}
      importantForAccessibility={isMenuVisible ? 'auto' : 'no-hide-descendants'}
      pointerEvents={isMenuVisible ? 'auto' : 'none'}
      style={[
        styles.container,
        {
          paddingBottom: bottomPadding,
          transform: [
            {
              translateY: lowered
                ? layout.floatingActionSize + bottomPadding + spacing.xl
                : 0,
            },
          ],
          transitionDuration: reduceMotion ? 0 : motion.tabBarLowerDuration,
          transitionProperty: 'transform',
          transitionTimingFunction: lowered ? 'ease-in' : 'ease-out',
        },
        !visible && styles.containerHidden,
      ]}
      testID="app-tab-bar"
    >
      <View style={styles.tabs} testID="app-tab-bar-tabs">
        {state.routes.map((route, index) => {
          const { icon, labelKey } =
            tabPresentation[route.name as TabRouteName];
          const presentation: TabPresentation = {
            icon,
            label: t(`navigation.tabs.${labelKey}`),
          };
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
    </Animated.View>
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
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.xxs,
      paddingVertical: spacing.xs,
      borderRadius: radii.round,
    },
    itemInnerPressed: {
      backgroundColor: colors.background,
    },
    itemInnerDisabled: { opacity: 0.4 },
  });
}
