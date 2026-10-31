import Ionicons from '@expo/vector-icons/Ionicons';
import { Portal } from '@gorhom/portal';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  FadeOutDown,
  FadeOutUp,
  ReduceMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, type TextTone } from '@/components/ui/Text/Text';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { triggerHaptic } from '@/lib/haptics/haptics';
import { iconSize, layout } from '@/theme/layout';
import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

export type ToastTone = 'success' | 'warning' | 'info';

export type ToastPlacement = 'top' | 'bottom';

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
  /** Abajo flota sobre el menú principal; por defecto, arriba. */
  placement?: ToastPlacement;
  /** Sustituye al icono del tono, por ejemplo con el de una categoría. */
  leading?: ReactNode;
  /** Hace tocable toda la tarjeta; al tocarla se retira y ejecuta esto. */
  onPress?: () => void;
  /** Describe a lectores de pantalla qué abre `onPress`. */
  pressHint?: string;
  /**
   * Estado mantenido (por ejemplo, sin conexión): no se retira solo, tocarlo
   * lo oculta y queda por debajo de los avisos breves que coincidan con él.
   */
  persistent?: boolean;
};

type NoticeToastProps = {
  notice: ToastNotice | null;
  onDismiss: (noticeId: number) => void;
  testID?: string;
};

/**
 * Host del portal de los avisos. `BottomSheetModalProvider` registra su propio
 * host con un nombre generado, así que el host por defecto (`root`) no existe y
 * un `Portal` sin destino no se pintaría nunca.
 */
export const noticeToastHostName = 'notice-toast';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Cada tarjeta entra desde su borde de pantalla y sale hacia él.
const toastTransitions = {
  top: {
    entering: FadeInDown.duration(motion.toastTransitionDuration)
      .easing(Easing.inOut(Easing.cubic))
      .reduceMotion(ReduceMotion.System),
    exiting: FadeOutUp.duration(motion.toastTransitionDuration)
      .easing(Easing.inOut(Easing.cubic))
      .reduceMotion(ReduceMotion.System),
  },
  bottom: {
    entering: FadeInUp.duration(motion.toastTransitionDuration)
      .easing(Easing.inOut(Easing.cubic))
      .reduceMotion(ReduceMotion.System),
    exiting: FadeOutDown.duration(motion.toastTransitionDuration)
      .easing(Easing.inOut(Easing.cubic))
      .reduceMotion(ReduceMotion.System),
  },
} as const;

const toneIcon: Record<ToastTone, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  warning: 'alert-circle',
  info: 'cloud-offline-outline',
};

const toneTextTone: Record<ToastTone, TextTone> = {
  success: 'income',
  warning: 'expense',
  info: 'onInverse',
};

function resolveToneColor(tone: ToastTone, colors: ColorTokens): string {
  switch (tone) {
    case 'success':
      return colors.income;
    case 'warning':
      return colors.expense;
    case 'info':
      return colors.onInverse;
  }
}

/**
 * Aviso global breve: confirmaciones, avisos recuperables y estado sin
 * conexión.
 *
 * Se monta en su propio host (`noticeToastHostName`, colocado en la raíz junto
 * a las hojas) para permanecer visible sobre el modal que originó la acción,
 * incluso si ya se cerró. Sin acción ni
 * `onPress` no captura toques; con acción espera más antes de retirarse, y con
 * `onPress` toda la tarjeta se puede tocar.
 *
 * Cada aviso nuevo vibra de forma sutil al aparecer, para dar peso a la
 * confirmación de lo que se acaba de hacer.
 */
export function NoticeToast({
  notice,
  onDismiss,
  testID = 'notice-toast',
}: NoticeToastProps) {
  const styles = useThemedStyles(createStyles);
  if (!notice) return null;

  return (
    <Portal hostName={noticeToastHostName}>
      <View
        pointerEvents="box-none"
        style={[
          styles.overlay,
          notice.persistent ? styles.persistentOverlay : null,
        ]}
      >
        <NoticeToastCard
          key={notice.id}
          notice={notice}
          onDismiss={onDismiss}
          testID={testID}
        />
      </View>
    </Portal>
  );
}

/**
 * La tarjeta y sus temporizadores viven dentro del portal, en el árbol de la
 * raíz. Las pestañas se congelan al perder el foco (`freezeOnBlur`): si el
 * estado viviera en la pantalla que lanzó el aviso, retirarlo no se pintaría
 * hasta volver a ella y la tarjeta seguiría flotando en las demás.
 *
 * Va con `key` por aviso: cada aviso nuevo vuelve a montarla, vibra una vez y
 * reinicia sus tiempos.
 */
function NoticeToastCard({
  notice,
  onDismiss,
  testID,
}: {
  notice: ToastNotice;
  onDismiss: (noticeId: number) => void;
  testID: string;
}) {
  const density = useLayoutDensity();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [isVisible, setVisible] = useState(true);

  useEffect(() => {
    triggerHaptic('noticeShow');
  }, []);

  useEffect(() => {
    if (notice.persistent) return;
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

  const tone = notice.tone ?? 'success';
  const isPressable = Boolean(notice.onPress || notice.persistent);
  const placement = notice.placement ?? 'top';
  const accessibilityLabel = notice.emphasis
    ? `${notice.message}${notice.emphasis}`
    : notice.message;

  return (
    <>
      {isVisible ? (
        <AnimatedPressable
          accessibilityHint={isPressable ? notice.pressHint : undefined}
          accessible={!notice.action}
          accessibilityLabel={notice.action ? undefined : accessibilityLabel}
          accessibilityLiveRegion="polite"
          disabled={!isPressable}
          entering={toastTransitions[placement].entering}
          exiting={toastTransitions[placement].exiting}
          onPress={() => {
            onDismiss(notice.id);
            notice.onPress?.();
          }}
          pointerEvents={notice.action || isPressable ? 'auto' : 'none'}
          role={isPressable ? 'button' : 'alert'}
          style={[
            styles.card,
            {
              left: layout.screenGutter[density],
              right: layout.screenGutter[density],
            },
            placement === 'top'
              ? { top: insets.top + spacing.md }
              : {
                  // Por encima del menú flotante principal.
                  bottom:
                    Math.max(insets.bottom, spacing.sm) +
                    layout.floatingActionSize +
                    spacing.md,
                },
          ]}
          testID={testID}
        >
          {notice.leading ?? (
            <Ionicons
              accessibilityElementsHidden
              color={resolveToneColor(tone, colors)}
              importantForAccessibility="no-hide-descendants"
              name={toneIcon[tone]}
              size={iconSize.md}
              testID={`${testID}-icon`}
            />
          )}
          <Text
            accessibilityLabel={notice.action ? accessibilityLabel : undefined}
            style={styles.message}
            tone="onInverse"
            variant="label"
          >
            {notice.message}
            {notice.emphasis ? (
              <Text tone={toneTextTone[tone]} variant="label">
                {notice.emphasis}
              </Text>
            ) : null}
          </Text>
          {notice.onPress ? (
            <Ionicons
              accessibilityElementsHidden
              color={colors.onInverse}
              importantForAccessibility="no-hide-descendants"
              name="chevron-forward"
              size={iconSize.sm}
              testID={`${testID}-chevron`}
            />
          ) : null}
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
              <Text tone="onInverse" variant="label" weight="semibold">
                {notice.action.label}
              </Text>
            </Pressable>
          ) : null}
        </AnimatedPressable>
      ) : null}
    </>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFill,
      zIndex: 200,
      // En Android ordena la elevación: debe superar la de la capa de hojas.
      elevation: 30,
    },
    persistentOverlay: {
      zIndex: 199,
      elevation: 29,
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
      boxShadow: '0 8px 36px rgba(0, 0, 0, 0.2)',
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
