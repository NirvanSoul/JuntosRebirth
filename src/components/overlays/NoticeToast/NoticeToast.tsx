import Ionicons from '@expo/vector-icons/Ionicons';
import { Portal } from '@gorhom/portal';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeOutUp,
  ReduceMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, type TextTone } from '@/components/ui/Text/Text';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { iconSize, layout } from '@/theme/layout';
import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

export type ToastTone = 'success' | 'warning' | 'info';

export type ToastNotice = {
  /** Cambia con cada aviso; repetir el mismo texto vuelve a mostrarlo. */
  id: number;
  message: string;
  /** Tramo final del mensaje resaltado en el color del tono. */
  emphasis?: string;
  tone?: ToastTone;
  /** Con acción, la tarjeta captura el toque y permanece más tiempo. */
  action?: { label: string; onPress: () => void };
  durationMs?: number;
};

type NoticeToastProps = {
  notice: ToastNotice | null;
  onDismiss: (noticeId: number) => void;
  testID?: string;
};

const toastEntering = FadeInDown.duration(motion.toastTransitionDuration)
  .easing(Easing.inOut(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const toastExiting = FadeOutUp.duration(motion.toastTransitionDuration)
  .easing(Easing.inOut(Easing.cubic))
  .reduceMotion(ReduceMotion.System);

const toneIcon: Record<ToastTone, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  warning: 'alert-circle',
  info: 'cloud-offline-outline',
};

const toneTextTone: Record<ToastTone, TextTone> = {
  success: 'income',
  warning: 'expense',
  info: 'onBrand',
};

function resolveToneColor(tone: ToastTone, colors: ColorTokens): string {
  switch (tone) {
    case 'success':
      return colors.income;
    case 'warning':
      return colors.expense;
    case 'info':
      return colors.onBrand;
  }
}

/**
 * Aviso global breve: confirmaciones, avisos recuperables y estado sin
 * conexión.
 *
 * Se monta en el mismo portal que los bottom sheets para permanecer visible
 * sobre el modal que originó la acción, incluso si ya se cerró. Sin acción no
 * captura toques; con acción sí, y espera más antes de retirarse.
 */
export function NoticeToast({
  notice,
  onDismiss,
  testID = 'notice-toast',
}: NoticeToastProps) {
  const density = useLayoutDensity();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [isVisible, setVisible] = useState(false);

  useEffect(() => {
    if (!notice) {
      // El componente ya devuelve null sin `notice`, así que esto no afecta
      // el render actual: solo evita arrastrar `isVisible` obsoleto al
      // próximo aviso.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(false);
      return;
    }

    setVisible(true);
    const visibleDuration =
      notice.durationMs ??
      (notice.action
        ? motion.toastActionVisibleDuration
        : motion.toastVisibleDuration);
    const hideTimer = setTimeout(() => setVisible(false), visibleDuration);
    const dismissTimer = setTimeout(
      () => onDismiss(notice.id),
      visibleDuration + motion.toastTransitionDuration,
    );

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(dismissTimer);
    };
  }, [notice, onDismiss]);

  if (!notice) return null;

  const tone = notice.tone ?? 'success';
  const accessibilityLabel = notice.emphasis
    ? `${notice.message}${notice.emphasis}`
    : notice.message;

  return (
    <Portal>
      <View pointerEvents="box-none" style={styles.overlay}>
        {isVisible ? (
          <Animated.View
            accessible={!notice.action}
            accessibilityLabel={notice.action ? undefined : accessibilityLabel}
            accessibilityLiveRegion="polite"
            entering={toastEntering}
            exiting={toastExiting}
            pointerEvents={notice.action ? 'auto' : 'none'}
            role="alert"
            style={[
              styles.card,
              {
                left: layout.screenGutter[density],
                right: layout.screenGutter[density],
                top: insets.top + spacing.md,
              },
            ]}
            testID={testID}
          >
            <Ionicons
              accessibilityElementsHidden
              color={resolveToneColor(tone, colors)}
              importantForAccessibility="no-hide-descendants"
              name={toneIcon[tone]}
              size={iconSize.md}
              testID={`${testID}-icon`}
            />
            <Text
              accessibilityLabel={
                notice.action ? accessibilityLabel : undefined
              }
              style={styles.message}
              tone="onBrand"
              variant="label"
            >
              {notice.message}
              {notice.emphasis ? (
                <Text tone={toneTextTone[tone]} variant="label">
                  {notice.emphasis}
                </Text>
              ) : null}
            </Text>
            {notice.action ? (
              <Pressable
                accessibilityLabel={notice.action.label}
                accessibilityRole="button"
                hitSlop={spacing.sm}
                onPress={notice.action.onPress}
                style={({ pressed }) => [
                  styles.action,
                  pressed ? styles.actionPressed : null,
                ]}
                testID={`${testID}-action`}
              >
                <Text tone="onBrand" variant="label" weight="semibold">
                  {notice.action.label}
                </Text>
              </Pressable>
            ) : null}
          </Animated.View>
        ) : null}
      </View>
    </Portal>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFill,
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
    action: {
      minHeight: layout.minTouchTarget - spacing.md,
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
      borderRadius: radii.sm,
    },
    actionPressed: {
      backgroundColor: colors.overlaySoft,
    },
  });
}
