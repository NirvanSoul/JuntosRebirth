import Ionicons from '@expo/vector-icons/Ionicons';
import { Portal } from '@gorhom/portal';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeOutUp,
  ReduceMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text/Text';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { iconSize, layout } from '@/theme/layout';
import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

export type SaveConfirmationNotice = {
  id: number;
  message: string;
};

type SaveConfirmationToastProps = {
  notice: SaveConfirmationNotice | null;
  onDismiss: (noticeId: number) => void;
};

const toastEntering = FadeInDown.duration(motion.toastTransitionDuration)
  .easing(Easing.inOut(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const toastExiting = FadeOutUp.duration(motion.toastTransitionDuration)
  .easing(Easing.inOut(Easing.cubic))
  .reduceMotion(ReduceMotion.System);

/**
 * Confirmación global para cambios guardados (p. ej. ajustes).
 *
 * Se monta en el mismo portal que los bottom sheets para permanecer visible
 * incluso después de que el modal que originó el guardado se haya cerrado.
 */
export function SaveConfirmationToast({
  notice,
  onDismiss,
}: SaveConfirmationToastProps) {
  const density = useLayoutDensity();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [isVisible, setVisible] = useState(false);

  useEffect(() => {
    if (!notice) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const hideTimer = setTimeout(
      () => setVisible(false),
      motion.toastVisibleDuration,
    );
    const dismissTimer = setTimeout(
      () => onDismiss(notice.id),
      motion.toastVisibleDuration + motion.toastTransitionDuration,
    );

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(dismissTimer);
    };
  }, [notice, onDismiss]);

  if (!notice) return null;

  return (
    <Portal>
      <View pointerEvents="none" style={styles.overlay}>
        {isVisible ? (
          <Animated.View
            accessible
            accessibilityLabel={notice.message}
            accessibilityLiveRegion="polite"
            entering={toastEntering}
            exiting={toastExiting}
            role="alert"
            style={[
              styles.card,
              {
                left: layout.screenGutter[density],
                right: layout.screenGutter[density],
                top: insets.top + spacing.md,
              },
            ]}
            testID="save-confirmation-toast"
          >
            <Ionicons
              accessibilityElementsHidden
              color={colors.income}
              importantForAccessibility="no-hide-descendants"
              name="checkmark-circle"
              size={iconSize.md}
              testID="save-confirmation-icon"
            />
            <Text style={styles.message} tone="onBrand" variant="label">
              {notice.message}
            </Text>
          </Animated.View>
        ) : null}
      </View>
    </Portal>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 200,
    },
    card: {
      position: 'absolute',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      minHeight: layout.controlHeight.compact,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      backgroundColor: colors.textPrimary,
      elevation: 24,
      shadowColor: colors.textPrimary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 18,
    },
    message: {
      flex: 1,
    },
  });
}
