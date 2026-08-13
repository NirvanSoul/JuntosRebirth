import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import {
  Image,
  type ImageSourcePropType,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { Text } from '@/components/ui/Text/Text';
import { iconSize, layout } from '@/theme/layout';
import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type ActiveSpaceHeaderProps = {
  onSpacePress: () => void;
  spaceName: string;
  /** Bandera de la moneda activa en Inicio. Solo se pasa cuando el usuario
   * tiene más de una moneda activa y está viendo esa pestaña. */
  currencyFlag?: string;
  onCurrencyPress?: () => void;
  profileImageSource?: ImageSourcePropType;
  visible?: boolean;
};

const avatarSize = 36;
const AnimatedSafeAreaView = Animated.createAnimatedComponent(SafeAreaView);

export function ActiveSpaceHeader({
  onSpacePress,
  spaceName,
  currencyFlag,
  onCurrencyPress,
  profileImageSource,
  visible = true,
}: ActiveSpaceHeaderProps) {
  const density = useLayoutDensity();
  const { width } = useWindowDimensions();
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const visibilityProgress = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    visibilityProgress.value = withTiming(visible ? 1 : 0, {
      duration: motion.stickyHeaderTransitionDuration,
      easing: Easing.inOut(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [visibilityProgress, visible]);

  const visibilityStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - visibilityProgress.value) * -width }],
  }));

  return (
    <AnimatedSafeAreaView
      accessibilityElementsHidden={!visible}
      edges={['top', 'left', 'right']}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      pointerEvents={visible ? 'auto' : 'none'}
      style={[styles.safeArea, visibilityStyle]}
      testID="persistent-app-header"
    >
      <View
        style={[
          styles.header,
          { paddingHorizontal: layout.screenGutter[density] },
        ]}
      >
        <Pressable
          accessibilityHint="Abre el menú para cambiar o crear un espacio"
          accessibilityLabel={`Espacio ${spaceName}`}
          accessibilityRole="button"
          onPress={onSpacePress}
          style={({ pressed }) => [
            styles.spaceButton,
            pressed ? styles.spaceButtonPressed : null,
          ]}
        >
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.avatar}
            testID="active-space-avatar"
          >
            {profileImageSource ? (
              <Image source={profileImageSource} style={styles.profileImage} />
            ) : (
              <Ionicons color={colors.brand} name="person" size={iconSize.sm} />
            )}
          </View>
          <Text numberOfLines={1} variant="label" weight="semibold">
            {spaceName}
          </Text>
          <Ionicons
            color={colors.textSecondary}
            name="chevron-forward"
            size={iconSize.xs}
          />
        </Pressable>

        {currencyFlag ? (
          <Pressable
            accessibilityHint="Cambia la moneda seleccionada"
            accessibilityLabel={`Moneda seleccionada: ${currencyFlag}`}
            accessibilityRole="button"
            onPress={onCurrencyPress}
            style={({ pressed }) => [
              styles.currencyButton,
              pressed ? styles.spaceButtonPressed : null,
            ]}
            testID="home-currency-flag-button"
          >
            <Text style={styles.currencyFlag}>{currencyFlag}</Text>
          </Pressable>
        ) : null}
      </View>
    </AnimatedSafeAreaView>
  );
}

function createStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    safeArea: {
      position: 'absolute',
      top: 0,
      right: 0,
      left: 0,
      zIndex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: spacing.sm,
      paddingTop: spacing.sm,
    },
    spaceButton: {
      ...shadows.subtle,
      maxWidth: '100%',
      flexShrink: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: layout.minTouchTarget,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.round,
      paddingLeft: spacing.sm,
      paddingRight: spacing.lg,
    },
    spaceButtonPressed: {
      opacity: 0.72,
    },
    avatar: {
      width: avatarSize,
      height: avatarSize,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
      backgroundColor: colors.brandSoft,
    },
    profileImage: {
      width: '100%',
      height: '100%',
      borderRadius: radii.round,
    },
    currencyButton: {
      ...shadows.subtle,
      elevation: 4,
      shadowOpacity: 0.12,
      width: layout.minTouchTarget,
      height: layout.minTouchTarget,
      flexShrink: 0,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: spacing.sm,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.round,
    },
    currencyFlag: {
      fontSize: 20,
      lineHeight: 24,
      includeFontPadding: false,
      textAlign: 'center',
      textAlignVertical: 'center',
    },
  });
}
