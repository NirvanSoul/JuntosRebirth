import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { Text } from '@/components/ui/Text/Text';
import type { CreateActionType } from '@/navigation/createActions';
import { colors } from '@/theme/colors';
import { iconSize, layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';

type QuickCreateMenuProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (action: CreateActionType) => void;
};

const actionIconSize = 48;
const actionMinHeight = 76;

const actions: readonly {
  type: CreateActionType;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  backgroundColor: string;
}[] = [
  {
    type: 'income',
    label: 'Ingreso',
    description: 'Dinero que entra',
    icon: 'arrow-down',
    color: colors.onBrand,
    backgroundColor: colors.incomeSoft,
  },
  {
    type: 'expense',
    label: 'Gasto',
    description: 'Dinero que sale',
    icon: 'arrow-up',
    color: colors.onBrand,
    backgroundColor: colors.expenseSoft,
  },
  {
    type: 'category',
    label: 'Categoría',
    description: 'Organiza tus movimientos',
    icon: 'pie-chart-outline',
    color: colors.onBrand,
    backgroundColor: colors.categoryAction,
  },
];

export function QuickCreateMenu({
  visible,
  onClose,
  onSelect,
}: QuickCreateMenuProps) {
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
        <Pressable
          accessibilityLabel="Cerrar"
          accessibilityRole="button"
          hitSlop={spacing.sm}
          onPress={onClose}
          style={({ pressed }) => [
            styles.closeButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            color={colors.textSecondary}
            name="close"
            size={iconSize.md}
          />
        </Pressable>
      </View>

      <View style={styles.actions}>
        {actions.map((action) => (
          <Pressable
            accessibilityLabel={`Crear ${action.label.toLocaleLowerCase('es-ES')}`}
            accessibilityRole="button"
            key={action.type}
            onPress={() => onSelect(action.type)}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          >
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: action.backgroundColor },
              ]}
              testID={`quick-create-${action.type}-icon-background`}
            >
              <Ionicons
                color={action.color}
                name={action.icon}
                size={iconSize.md}
                testID={`quick-create-${action.type}-icon`}
              />
            </View>
            <View style={styles.actionText}>
              <Text variant="bodyStrong">{action.label}</Text>
              <Text style={styles.subtitle} tone="secondary" variant="footnote">
                {action.description}
              </Text>
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

const styles = StyleSheet.create({
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
  closeButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    backgroundColor: colors.surfaceMuted,
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
    padding: spacing.md,
  },
  actionIcon: {
    width: actionIconSize,
    height: actionIconSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
  },
  actionText: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
