import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useThemedStyles } from '@/theme/useThemedStyles';

type DestructiveConfirmationPanelProps = {
  cancelLabel?: string;
  confirmLabel?: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  testID?: string;
  title: string;
  /** `destructive` (por defecto) para eliminar datos; `neutral` para confirmaciones sin pérdida de datos, como continuar pese a un aviso. */
  tone?: 'destructive' | 'neutral';
};

/** Confirmación uniforme para acciones que eliminan datos del usuario o requieren su aprobación explícita. */
export function DestructiveConfirmationPanel({
  cancelLabel = 'Cancelar',
  confirmLabel = 'Eliminar',
  description,
  onCancel,
  onConfirm,
  testID,
  title,
  tone = 'destructive',
}: DestructiveConfirmationPanelProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View
      style={[styles.container, tone === 'neutral' && styles.containerNeutral]}
      testID={testID}
    >
      <Text variant="subheading">{title}</Text>
      <Text tone="secondary" variant="footnote">
        {description}
      </Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={onCancel}
          style={styles.cancelButton}
        >
          <Text variant="label">{cancelLabel}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onConfirm}
          style={
            tone === 'neutral' ? styles.confirmButton : styles.deleteButton
          }
        >
          <Text tone="onBrand" variant="label">
            {confirmLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: {
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderColor: colors.expense,
      borderRadius: radii.md,
      borderWidth: 1,
      marginTop: spacing.lg,
      padding: spacing.lg,
    },
    containerNeutral: {
      borderColor: colors.border,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.sm,
    },
    cancelButton: {
      minHeight: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: colors.border,
      borderRadius: radii.round,
      borderWidth: 1,
      paddingHorizontal: spacing.lg,
    },
    deleteButton: {
      minHeight: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.expense,
      borderRadius: radii.round,
      paddingHorizontal: spacing.xl,
    },
    confirmButton: {
      minHeight: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.brand,
      borderRadius: radii.round,
      paddingHorizontal: spacing.xl,
    },
  });
}
