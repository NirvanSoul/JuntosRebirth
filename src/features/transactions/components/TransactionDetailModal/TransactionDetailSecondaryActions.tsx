import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { iconSize } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import { createStyles } from './TransactionDetailModal.styles';

type TransactionDetailSecondaryActionsProps = {
  hasReminder: boolean;
  hasShareTargets: boolean;
  onPressCopy: () => void;
  onPressReminder: () => void;
};

export function TransactionDetailSecondaryActions({
  hasReminder,
  hasShareTargets,
  onPressCopy,
  onPressReminder,
}: TransactionDetailSecondaryActionsProps) {
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));

  return (
    <View style={styles.actionsRow}>
      <Pressable
        accessibilityLabel={
          hasReminder ? 'Editar recordatorio' : 'Programar recordatorio'
        }
        accessibilityRole="button"
        onPress={onPressReminder}
        style={({ pressed }) => [
          styles.secondaryAction,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons
          color={colors.textMuted}
          name="alarm-outline"
          size={iconSize.md}
          testID="transaction-action-icon-alarm-outline"
        />
        <Text align="center" variant="footnote" weight="semibold">
          {hasReminder ? 'Editar recordatorio' : 'Recordar'}
        </Text>
      </Pressable>
      {hasShareTargets ? (
        <Pressable
          accessibilityLabel="Copiar en otro espacio"
          accessibilityRole="button"
          onPress={onPressCopy}
          style={({ pressed }) => [
            styles.secondaryAction,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            color={colors.textMuted}
            name="copy-outline"
            size={iconSize.md}
            testID="transaction-action-icon-copy-outline"
          />
          <Text align="center" variant="footnote" weight="semibold">
            Copiar en otro espacio
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
