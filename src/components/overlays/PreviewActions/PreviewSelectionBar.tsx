import Ionicons from '@expo/vector-icons/Ionicons';
import { type ComponentType } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ReduceMotion,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DestructiveConfirmationPanel } from '@/components/overlays/DestructiveConfirmationPanel/DestructiveConfirmationPanel';
import type { PreviewSelectionMode } from '@/components/overlays/PreviewActions/previewSelection';
import { Text } from '@/components/ui/Text/Text';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { iconSize, layout } from '@/theme/layout';
import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type PreviewSelectionBarProps = {
  /** Confirmación de borrado a la vista, en lugar de la barra. */
  confirmation: { title: string; description: string } | null;
  count: number;
  icon: ComponentType<{ color: string; size: number }>;
  mode: PreviewSelectionMode;
  onCancel: () => void;
  onCancelConfirmation: () => void;
  onConfirm: () => void;
  onSubmit: () => void;
  /** Sin acción para lo marcado (nada marcado, por ejemplo) no se envía. */
  submitDisabled: boolean;
};

const barHeight = 56;
const slideIn = SlideInDown.duration(
  motion.previewActionsEnterDuration,
).reduceMotion(ReduceMotion.System);
const slideOut = SlideOutDown.duration(
  motion.previewActionsFadeDuration,
).reduceMotion(ReduceMotion.System);
const fadeIn = FadeIn.duration(motion.previewActionsFadeDuration).reduceMotion(
  ReduceMotion.System,
);
const fadeOut = FadeOut.duration(
  motion.previewActionsFadeDuration,
).reduceMotion(ReduceMotion.System);

/**
 * Barra inferior de la selección múltiple: cuenta lo marcado y lanza la acción
 * elegida en la pulsación larga sobre todo ello. No tapa las tarjetas: se
 * siguen pudiendo marcar y desplazar mientras está a la vista.
 */
export function PreviewSelectionBar({
  confirmation,
  count,
  icon: Icon,
  mode,
  onCancel,
  onCancelConfirmation,
  onConfirm,
  onSubmit,
  submitDisabled,
}: PreviewSelectionBarProps) {
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const insets = useSafeAreaInsets();
  const gutter = layout.screenGutter[useLayoutDensity()];
  const actionLabel = mode === 'delete' ? 'Eliminar' : 'Copiar';
  // Mismo color que los círculos marcados: morado al copiar, rojo al eliminar.
  const actionColor = submitDisabled ? colors.textMuted : colors.onBrand;
  const actionBackground = submitDisabled
    ? colors.keypad
    : mode === 'delete'
      ? colors.expense
      : colors.cta;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        { bottom: insets.bottom + spacing.md, left: gutter, right: gutter },
      ]}
      testID="preview-selection-bar"
    >
      {confirmation ? (
        <Animated.View entering={fadeIn} exiting={fadeOut}>
          <DestructiveConfirmationPanel
            confirmLabel={count > 1 ? `Eliminar ${count}` : 'Eliminar'}
            description={confirmation.description}
            onCancel={onCancelConfirmation}
            onConfirm={onConfirm}
            testID="preview-selection-confirmation"
            title={confirmation.title}
          />
        </Animated.View>
      ) : (
        <Animated.View entering={slideIn} exiting={slideOut} style={styles.bar}>
          <Pressable
            accessibilityLabel="Cancelar selección"
            accessibilityRole="button"
            hitSlop={spacing.xs}
            onPress={onCancel}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.pressed,
            ]}
            testID="preview-selection-cancel"
          >
            <Ionicons
              color={colors.textPrimary}
              name="close"
              size={iconSize.sm}
            />
          </Pressable>
          <Text
            accessibilityLiveRegion="polite"
            numberOfLines={1}
            style={styles.count}
            variant="label"
            weight="semibold"
          >
            {count === 1 ? '1 seleccionado' : `${count} seleccionados`}
          </Text>
          <Pressable
            accessibilityLabel={`${actionLabel} ${count === 1 ? 'movimiento' : 'movimientos'}`}
            accessibilityRole="button"
            accessibilityState={{ disabled: submitDisabled }}
            disabled={submitDisabled}
            onPress={onSubmit}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: actionBackground },
              pressed && styles.pressed,
            ]}
            testID={`preview-selection-${mode}`}
          >
            <Icon color={actionColor} size={iconSize.sm} />
            <Text
              style={{ color: actionColor }}
              variant="label"
              weight="semibold"
            >
              {actionLabel}
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

function createStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    container: {
      position: 'absolute',
      // Como la superposición de acciones: sobre las hojas, bajo los avisos.
      zIndex: 150,
      elevation: 25,
    },
    bar: {
      ...shadows.raised,
      height: barHeight,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderColor: colors.categoryPreviewBorder,
      borderRadius: radii.round,
      borderWidth: StyleSheet.hairlineWidth,
      backgroundColor: colors.surface,
    },
    closeButton: {
      width: barHeight - spacing.md,
      height: barHeight - spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
      backgroundColor: colors.keypad,
    },
    count: { flex: 1 },
    actionButton: {
      height: barHeight - spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: radii.round,
      backgroundColor: colors.keypad,
    },
    pressed: { opacity: 0.64 },
  });
}
