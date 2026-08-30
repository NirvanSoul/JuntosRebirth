import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { Text } from '@/components/ui/Text/Text';
import type { CreateActionType } from '@/navigation/createActions';
import { iconSize } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type QuickCreateMenuProps = {
  /** Acciones que se muestran para enseñar el menú, pero aún no se pueden usar. */
  disabledActionTypes?: readonly CreateActionType[];
  visible: boolean;
  onClose: () => void;
  onSelect: (action: CreateActionType) => void;
};

const actionIconSize = 48;
const actionMinHeight = 76;

function createActions(colors: ColorTokens): readonly {
  type: CreateActionType;
  label: string;
  accessibilityLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  backgroundColor: string;
}[] {
  return [
    {
      type: 'income',
      label: 'Crear ingreso',
      accessibilityLabel: 'Crear ingreso',
      icon: 'arrow-up',
      color: colors.onBrand,
      backgroundColor: colors.incomeSoft,
    },
    {
      type: 'expense',
      label: 'Crear gasto',
      accessibilityLabel: 'Crear gasto',
      icon: 'arrow-down',
      color: colors.onBrand,
      backgroundColor: colors.expenseSoft,
    },
    {
      type: 'category',
      label: 'Crear categoría',
      accessibilityLabel: 'Crear categoría',
      icon: 'pie-chart-outline',
      color: colors.onBrand,
      backgroundColor: colors.categoryAction,
    },
  ];
}

export function QuickCreateMenu({
  disabledActionTypes = [],
  visible,
  onClose,
  onSelect,
}: QuickCreateMenuProps) {
  const { colors, colorScheme, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const actions = createActions(colors);

  return (
    <AppModal onClose={onClose} visible={visible}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text accessibilityRole="header" variant="subheading">
            ¿Qué quieres crear?
          </Text>
          <Text style={styles.subtitle} tone="secondary" variant="footnote">
            Elige una opción para continuar
          </Text>
        </View>
        <ModalCloseButton
          onPress={onClose}
          testID="quick-create-close-button"
        />
      </View>

      <View style={styles.actions}>
        {actions.map((action) => (
          <Pressable
            accessibilityLabel={action.accessibilityLabel}
            accessibilityRole="button"
            accessibilityState={{
              disabled: disabledActionTypes.includes(action.type),
            }}
            disabled={disabledActionTypes.includes(action.type)}
            key={action.type}
            onPress={() => onSelect(action.type)}
            testID={`quick-create-${action.type}`}
            style={({ pressed }) => [
              styles.action,
              colorScheme === 'light' && styles.actionLight,
              disabledActionTypes.includes(action.type) &&
                styles.actionDisabled,
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: action.backgroundColor },
              ]}
              testID={`quick-create-${action.type}-icon-background`}
            >
              <View
                style={
                  action.type === 'income' || action.type === 'expense'
                    ? styles.diagonalArrow
                    : undefined
                }
              >
                <Ionicons
                  color={action.color}
                  name={action.icon}
                  size={iconSize.md}
                  testID={`quick-create-${action.type}-icon`}
                />
              </View>
            </View>
            <View style={styles.actionText}>
              <Text variant="bodyStrong">{action.label}</Text>
            </View>
            <Ionicons
              color={colors.textMuted}
              name="chevron-forward"
              size={iconSize.sm}
            />
          </Pressable>
        ))}
      </View>
    </AppModal>
  );
}

function createStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.lg,
    },
    headerText: {
      flex: 1,
    },
    subtitle: {
      marginTop: spacing.xs,
    },
    actions: {
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
      gap: spacing.md,
    },
    action: {
      minHeight: actionMinHeight,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderRadius: radii.md,
      borderColor: colors.border,
      borderWidth: 1,
      backgroundColor: colors.surfaceMuted,
      padding: spacing.md,
    },
    actionLight: {
      ...shadows.subtle,
      backgroundColor: colors.surface,
    },
    actionDisabled: {
      opacity: 0.3,
    },
    actionIcon: {
      width: actionIconSize,
      height: actionIconSize,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
    },
    diagonalArrow: {
      transform: [{ rotate: '45deg' }],
    },
    actionText: {
      flex: 1,
    },
    pressed: {
      opacity: 0.7,
    },
  });
}
