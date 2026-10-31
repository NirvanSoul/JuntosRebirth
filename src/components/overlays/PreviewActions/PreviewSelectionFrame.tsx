import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import type { PreviewSelectionStatus } from '@/components/overlays/PreviewActions/previewSelection';
import { iconSize } from '@/theme/layout';
import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type PreviewSelectionFrameProps = {
  children: ReactNode;
  onToggle: () => void;
  status: PreviewSelectionStatus;
  /** Al eliminar el círculo marcado usa el rojo de la confirmación. */
  tone?: 'cta' | 'destructive';
};

const checkSize = iconSize.md;
const checkGap = spacing.md;
/** La tarjeta encoge un poco para que se note que entró en la selección. */
const selectingScale = 0.97;
const hiddenCheckScale = 0.3;

/**
 * Marco de una tarjeta horizontal en la selección múltiple: le abre a la
 * izquierda un círculo que se marca al tocarla y la encoge ligeramente.
 *
 * Usa transiciones CSS de Reanimated: solo actúan al cambiar de estado, así
 * que fuera de la selección la tarjeta no crea valores animados ni efectos.
 */
export function PreviewSelectionFrame({
  children,
  onToggle,
  status,
  tone = 'cta',
}: PreviewSelectionFrameProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isSelecting = status !== 'off';
  const isSelected = status === 'selected';
  const transition = {
    transitionDuration: useReducedMotion()
      ? 0
      : motion.previewActionsEnterDuration,
    transitionTimingFunction: 'ease-out',
  } as const;

  return (
    <View style={styles.row}>
      <Animated.View
        pointerEvents={isSelecting ? 'auto' : 'none'}
        style={[
          styles.checkSlot,
          {
            ...transition,
            opacity: isSelecting ? 1 : 0,
            transitionProperty: ['width', 'opacity'],
            width: isSelecting ? checkSize + checkGap : 0,
          },
        ]}
      >
        <Animated.View
          style={{
            ...transition,
            transform: [{ scale: isSelecting ? 1 : hiddenCheckScale }],
            transitionProperty: 'transform',
          }}
        >
          <Pressable
            accessibilityElementsHidden
            disabled={status !== 'selected' && status !== 'unselected'}
            hitSlop={spacing.sm}
            importantForAccessibility="no-hide-descendants"
            onPress={onToggle}
            style={[
              styles.check,
              isSelected && styles.checkSelected,
              isSelected && tone === 'destructive' && styles.checkDestructive,
              status === 'disabled' && styles.disabled,
            ]}
            testID={
              !isSelecting
                ? undefined
                : isSelected
                  ? 'preview-selection-checked'
                  : 'preview-selection-check'
            }
          >
            {isSelected ? (
              <Ionicons
                color={colors.onBrand}
                name="checkmark"
                size={iconSize.xs}
              />
            ) : null}
          </Pressable>
        </Animated.View>
      </Animated.View>
      <Animated.View
        style={[
          styles.card,
          {
            ...transition,
            opacity: status === 'disabled' ? 0.4 : 1,
            transform: [{ scale: isSelecting ? selectingScale : 1 }],
            transitionProperty: ['opacity', 'transform'],
          },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    checkSlot: {
      overflow: 'hidden',
    },
    check: {
      width: checkSize,
      height: checkSize,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: colors.textMuted,
      borderRadius: radii.round,
      borderWidth: 2,
    },
    checkSelected: {
      backgroundColor: colors.cta,
      borderColor: colors.cta,
    },
    checkDestructive: {
      backgroundColor: colors.expense,
      borderColor: colors.expense,
    },
    card: {
      flex: 1,
      minWidth: 0,
    },
    disabled: { opacity: 0.4 },
  });
}
