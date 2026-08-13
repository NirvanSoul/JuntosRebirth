import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/Text/Text';
import { layout } from '@/theme/layout';
import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import type { ColorTokens } from '@/theme/types';
import { useThemedStyles } from '@/theme/useThemedStyles';

type ImportProgressActionProps = {
  onPress: () => void;
  selectedCount: number;
  totalCount: number;
};

/** CTA que convierte la selección de la revisión en un progreso visible. */
export function ImportProgressAction({
  onPress,
  selectedCount,
  totalCount,
}: ImportProgressActionProps) {
  const styles = useThemedStyles(createStyles);
  const progress = useSharedValue(
    totalCount > 0 ? selectedCount / totalCount : 0,
  );
  const value = totalCount > 0 ? selectedCount / totalCount : 0;
  const disabled = selectedCount === 0;

  useEffect(() => {
    progress.value = withTiming(value, {
      duration: motion.disclosureRevealDuration,
      reduceMotion: ReduceMotion.System,
    });
  }, [progress, value]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, progress.value)) * 100}%`,
  }));

  return (
    <Pressable
      accessibilityLabel={`Importar ${selectedCount} movimientos`}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      testID="import-confirm"
    >
      <Animated.View style={[styles.fill, fillStyle]} />
      <View pointerEvents="none" style={styles.content}>
        <Text
          tone={disabled ? 'muted' : 'onBrand'}
          variant="bodyStrong"
          weight="semibold"
        >
          Importar {selectedCount}
        </Text>
      </View>
    </Pressable>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    button: {
      minHeight: layout.actionHeight.regular,
      overflow: 'hidden',
      borderRadius: radii.md,
      backgroundColor: colors.keypad,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.34,
      shadowRadius: 6,
      elevation: 4,
    },
    fill: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      backgroundColor: colors.cta,
    },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    pressed: { opacity: 0.82 },
  });
}
