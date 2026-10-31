import type { ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  Keyframe,
  ReduceMotion,
  ZoomOut,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlurScrim } from '@/components/overlays/BlurScrim/BlurScrim';
import { DestructiveConfirmationPanel } from '@/components/overlays/DestructiveConfirmationPanel/DestructiveConfirmationPanel';
import type { PreviewAction } from '@/components/overlays/PreviewActions/previewActions';
import {
  getPreviewActionsLayout,
  previewActionButtonSize,
  type PreviewAnchor,
} from '@/components/overlays/PreviewActions/previewActionsLayout';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { iconSize, layout } from '@/theme/layout';
import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type PreviewActionsOverlayProps = {
  actions: readonly PreviewAction[];
  anchor: PreviewAnchor;
  /** Acción `confirm` cuyo panel está a la vista, en lugar de los botones. */
  confirming: Extract<PreviewAction, { kind: 'confirm' }> | null;
  onCancelConfirmation: () => void;
  onClose: () => void;
  onConfirm: () => void;
  onSelect: (action: PreviewAction) => void;
  preview: ReactNode;
};

/** Escala de la tarjeta elevada: se separa del fondo sin cambiar de sitio. */
const liftedScale = 1.04;
/** Escala desde la que brota cada botón, desde el centro de la tarjeta. */
const sproutScale = 0.4;

const fadeIn = FadeIn.duration(motion.previewActionsFadeDuration).reduceMotion(
  ReduceMotion.System,
);
const fadeOut = FadeOut.duration(
  motion.previewActionsFadeDuration,
).reduceMotion(ReduceMotion.System);
const buttonExit = ZoomOut.duration(
  motion.previewActionsFadeDuration,
).reduceMotion(ReduceMotion.System);
const liftEntering = new Keyframe({
  0: { transform: [{ scale: 1 }] },
  100: {
    transform: [{ scale: liftedScale }],
    easing: Easing.out(Easing.cubic),
  },
})
  .duration(motion.previewActionsEnterDuration)
  .reduceMotion(ReduceMotion.System);

/** Cada botón sale del centro de la tarjeta hasta su sitio en el arco. */
function getSproutEntering(dx: number, dy: number, index: number) {
  return new Keyframe({
    0: {
      opacity: 0,
      transform: [
        { translateX: dx },
        { translateY: dy },
        { scale: sproutScale },
      ],
    },
    100: {
      opacity: 1,
      transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }],
      easing: Easing.out(Easing.back(1.6)),
    },
  })
    .duration(motion.previewActionsEnterDuration)
    .delay(index * motion.previewActionsStagger)
    .reduceMotion(ReduceMotion.System);
}

/**
 * Superposición de una pulsación larga: desenfoca la pantalla, deja la tarjeta
 * pulsada a la vista y la rodea de un arco de acciones. Solo pinta: quien la
 * monta decide qué hace cada acción y cuándo se cierra.
 */
export function PreviewActionsOverlay({
  actions,
  anchor,
  confirming,
  onCancelConfirmation,
  onClose,
  onConfirm,
  onSelect,
  preview,
}: PreviewActionsOverlayProps) {
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const gutter = layout.screenGutter[useLayoutDensity()];
  const { buttons, placement } = getPreviewActionsLayout({
    anchor,
    count: actions.length,
    gutter,
    topInset: insets.top,
    window,
  });
  const anchorCenterX = anchor.x + anchor.width / 2;
  const anchorCenterY = anchor.y + anchor.height / 2;

  return (
    <Animated.View
      accessibilityViewIsModal
      entering={fadeIn}
      exiting={fadeOut}
      style={styles.overlay}
      testID="preview-actions-overlay"
    >
      <Pressable
        accessibilityLabel="Cerrar acciones"
        accessibilityRole="button"
        onPress={onClose}
        style={StyleSheet.absoluteFill}
        testID="preview-actions-backdrop"
      >
        <BlurScrim />
      </Pressable>

      <Animated.View
        entering={liftEntering}
        style={[
          styles.preview,
          {
            left: anchor.x,
            top: anchor.y,
            width: anchor.width,
            height: anchor.height,
          },
        ]}
      >
        {/* La sombra va fuera y el recorte dentro: `overflow` la cortaría. */}
        <Pressable
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onPress={onClose}
          style={styles.previewClip}
          testID="preview-actions-preview"
        >
          <View pointerEvents="none">{preview}</View>
        </Pressable>
      </Animated.View>

      {confirming ? (
        <Animated.View
          entering={fadeIn}
          style={[
            styles.confirmation,
            { left: gutter, right: gutter },
            placement === 'above'
              ? { bottom: window.height - anchor.y + spacing.sm }
              : { top: anchor.y + anchor.height },
          ]}
        >
          <DestructiveConfirmationPanel
            description={confirming.confirmation.description}
            onCancel={onCancelConfirmation}
            onConfirm={onConfirm}
            testID="preview-actions-confirmation"
            title={confirming.confirmation.title}
          />
        </Animated.View>
      ) : (
        actions.map((action, index) => {
          const position = buttons[index]!;
          const Icon = action.icon;
          return (
            <Animated.View
              entering={getSproutEntering(
                anchorCenterX - (position.left + previewActionButtonSize / 2),
                anchorCenterY - (position.top + previewActionButtonSize / 2),
                index,
              )}
              exiting={buttonExit}
              key={action.key}
              style={[styles.buttonSlot, position]}
            >
              <Pressable
                accessibilityLabel={action.accessibilityLabel}
                accessibilityRole="button"
                onPress={() => onSelect(action)}
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.pressed,
                ]}
                testID={`preview-action-${action.key}`}
              >
                <Icon
                  color={
                    action.kind === 'confirm'
                      ? colors.expense
                      : colors.textPrimary
                  }
                  size={iconSize.md}
                />
              </Pressable>
            </Animated.View>
          );
        })
      )}
    </Animated.View>
  );
}

function createStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFill,
      // Por encima de la capa de hojas (100) y por debajo de los avisos (200).
      zIndex: 150,
      // En Android ordena la elevación: supera la de las hojas (20).
      elevation: 25,
    },
    preview: {
      ...shadows.raised,
      position: 'absolute',
      borderRadius: radii.md,
      transform: [{ scale: liftedScale }],
    },
    previewClip: {
      flex: 1,
      overflow: 'hidden',
      borderRadius: radii.md,
      backgroundColor: colors.surface,
    },
    confirmation: {
      position: 'absolute',
    },
    buttonSlot: {
      position: 'absolute',
      width: previewActionButtonSize,
      height: previewActionButtonSize,
    },
    button: {
      ...shadows.raised,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: colors.border,
      borderRadius: radii.round,
      borderWidth: 1,
      backgroundColor: colors.surface,
    },
    pressed: { opacity: 0.64 },
  });
}
