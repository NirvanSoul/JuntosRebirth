import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, type ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/Text/Text';
import { iconSize } from '@/theme/layout';
import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type SpaceMenuRowProps = Pick<
  ComponentProps<typeof Pressable>,
  | 'accessibilityHint'
  | 'accessibilityLabel'
  | 'accessibilityRole'
  | 'accessibilityState'
  | 'onLayout'
  | 'onPress'
> & {
  active: boolean;
  iconName: ComponentProps<typeof Ionicons>['name'];
  iconTestID: string;
  label: string;
  /** Fila con borde y sombra propios, como el acceso para invitar a Juntos. */
  raised?: boolean;
  subtitle?: string | null;
};

const spaceRowHeight = 64,
  spaceIconSize = 36,
  rowBorderWidth = 1;

function hiddenFromAccessibility(hidden: boolean) {
  return hidden
    ? {
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants' as const,
      }
    : {};
}

/**
 * Fila de espacio del menú lateral. El fondo de marca lo pinta
 * `SpaceSelectionPill` por detrás; la fila solo cambia su contenido a los
 * colores sobre marca y retira su propio borde mientras la píldora llega.
 */
export function SpaceMenuRow({
  active,
  iconName,
  iconTestID,
  label,
  raised = false,
  subtitle = null,
  ...pressableProps
}: SpaceMenuRowProps) {
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, {
      duration: motion.spaceSelectionContentDuration,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [active, progress]);

  const activeLayerStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));
  const restingLayerStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
  }));

  const renderContent = (isActiveLayer: boolean) => (
    <>
      <View style={[styles.icon, isActiveLayer && styles.iconActive]}>
        <Ionicons
          color={isActiveLayer ? colors.onBrand : colors.cta}
          name={iconName}
          size={iconSize.sm}
          testID={iconTestID}
        />
      </View>
      <View style={styles.name}>
        <Text
          numberOfLines={1}
          tone={isActiveLayer ? 'onBrand' : 'primary'}
          variant={isActiveLayer ? 'subheading' : 'label'}
          weight="semibold"
        >
          {label}
        </Text>
        {subtitle ? (
          <Text
            tone={isActiveLayer ? 'onBrand' : 'secondary'}
            variant={isActiveLayer ? 'subheading' : 'footnote'}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </>
  );

  return (
    <Pressable
      {...pressableProps}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {raised ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.raisedSurface, restingLayerStyle]}
          testID={`${iconTestID}-surface`}
        />
      ) : null}
      <Animated.View
        {...hiddenFromAccessibility(active)}
        pointerEvents="none"
        style={[
          styles.content,
          restingLayerStyle,
          active && styles.contentOverlay,
        ]}
      >
        {renderContent(false)}
      </Animated.View>
      <Animated.View
        {...hiddenFromAccessibility(!active)}
        pointerEvents="none"
        style={[
          styles.content,
          activeLayerStyle,
          !active && styles.contentOverlay,
        ]}
      >
        {renderContent(true)}
      </Animated.View>
    </Pressable>
  );
}

function createStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    row: {
      minHeight: spaceRowHeight,
      justifyContent: 'center',
      borderRadius: radii.md,
      borderWidth: rowBorderWidth,
      borderColor: 'transparent',
    },
    pressed: { opacity: 0.68 },
    raisedSurface: {
      ...shadows.subtle,
      position: 'absolute',
      top: -rowBorderWidth,
      right: -rowBorderWidth,
      bottom: -rowBorderWidth,
      left: -rowBorderWidth,
      borderRadius: radii.md,
      borderWidth: rowBorderWidth,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
    },
    contentOverlay: StyleSheet.absoluteFill,
    icon: {
      width: spaceIconSize,
      height: spaceIconSize,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
      backgroundColor: colors.surface,
    },
    iconActive: { backgroundColor: 'transparent' },
    name: {
      minWidth: 0,
      flex: 1,
    },
  });
}
