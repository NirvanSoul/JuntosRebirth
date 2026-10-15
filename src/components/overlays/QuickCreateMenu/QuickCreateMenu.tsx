import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { useModalChainedAction } from '@/components/overlays/AppModal/useModalChainedAction';
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
  chainSelectionAfterDismiss?: boolean;
  /** Acciones que se muestran para enseñar el menú, pero aún no se pueden usar. */
  disabledActionTypes?: readonly CreateActionType[];
  /**
   * Añade «Comprar / vender dólares». Solo tiene sentido con la capacidad
   * Venezuela activa; el resto de usuarios no debe ver la acción.
   */
  showCurrencyExchange?: boolean;
  visible: boolean;
  onClose: () => void;
  onSelect: (action: CreateActionType) => void;
};

const actionIconSize = 48;
const actionMinHeight = 76;

type QuickCreateAction = {
  type: CreateActionType;
  label: string;
  accessibilityLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  backgroundColor: string;
  /** Gira el icono 45° para las flechas diagonales del sistema de diseño. */
  diagonalIcon?: boolean;
};

function createActions(
  colors: ColorTokens,
  showCurrencyExchange: boolean,
): readonly QuickCreateAction[] {
  const currencyExchangeAction: QuickCreateAction = {
    type: 'currency-exchange',
    label: 'Comprar / vender dólares',
    accessibilityLabel: 'Comprar o vender dólares',
    icon: 'swap-vertical-outline',
    color: colors.onBrand,
    backgroundColor: colors.cta,
    diagonalIcon: true,
  };

  return [
    {
      type: 'income',
      label: 'Crear ingreso',
      accessibilityLabel: 'Crear ingreso',
      icon: 'arrow-up',
      color: colors.onBrand,
      backgroundColor: colors.incomeSoft,
      diagonalIcon: true,
    },
    {
      type: 'expense',
      label: 'Crear gasto',
      accessibilityLabel: 'Crear gasto',
      icon: 'arrow-down',
      color: colors.onBrand,
      backgroundColor: colors.expenseSoft,
      diagonalIcon: true,
    },
    {
      type: 'category',
      label: 'Crear categoría',
      accessibilityLabel: 'Crear categoría',
      icon: 'pie-chart-outline',
      color: colors.onBrand,
      backgroundColor: colors.categoryAction,
    },
    ...(showCurrencyExchange ? [currencyExchangeAction] : []),
  ];
}

export function QuickCreateMenu({
  chainSelectionAfterDismiss = false,
  disabledActionTypes = [],
  showCurrencyExchange = false,
  visible,
  onClose,
  onSelect,
}: QuickCreateMenuProps) {
  const { colors, colorScheme, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const actions = createActions(colors, showCurrencyExchange);
  const { closeThenRun, handleDismissed } = useModalChainedAction(onClose);
  const selectAction = (action: CreateActionType) => {
    if (chainSelectionAfterDismiss) {
      closeThenRun(() => onSelect(action));
      return;
    }
    onSelect(action);
  };

  return (
    <AppModal
      backgroundVariant="background"
      onClose={onClose}
      onDismissed={chainSelectionAfterDismiss ? handleDismissed : undefined}
      visible={visible}
    >
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
            onPress={() => selectAction(action.type)}
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
                style={action.diagonalIcon ? styles.diagonalArrow : undefined}
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
      backgroundColor: colors.surface,
      padding: spacing.md,
    },
    actionLight: {
      ...shadows.subtle,
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
