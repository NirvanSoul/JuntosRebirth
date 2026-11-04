import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { createStyles } from '@/features/transactions/components/TransactionDetailModal/TransactionDetailModal.styles';
import { TransactionTimePickerModal } from '@/features/transactions/components/TransactionTimePickerModal/TransactionTimePickerModal';
import { useDepsChanged } from '@/hooks/useDepsChanged';
import { formatTimeOfDayForDisplay } from '@/lib/date/timeOfDay';
import { iconSize } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type TransactionDetailTimeRowProps = {
  occurredTime?: string;
  onChange: (occurredTime: string | null) => void;
  /** Movimiento que muestra el detalle; cambiarlo cierra el selector. */
  transactionId: string;
};

/**
 * Fila «Hora» del detalle: el único lugar donde se ve y se edita la hora de
 * un movimiento. Abre el selector nativo encima del detalle y guarda sin
 * pasar por el formulario.
 */
export function TransactionDetailTimeRow({
  occurredTime,
  onChange,
  transactionId,
}: TransactionDetailTimeRowProps) {
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const [isPickerVisible, setPickerVisible] = useState(false);

  if (useDepsChanged([transactionId]) && isPickerVisible) {
    setPickerVisible(false);
  }

  const formattedTime = occurredTime
    ? formatTimeOfDayForDisplay(occurredTime)
    : null;

  return (
    <>
      <Pressable
        accessibilityLabel={
          formattedTime
            ? `Cambiar hora: ${formattedTime}`
            : 'Agregar una hora a este movimiento'
        }
        accessibilityRole="button"
        onPress={() => setPickerVisible(true)}
        style={({ pressed }) => [styles.detailRow, pressed && styles.pressed]}
        testID="transaction-detail-time-row"
      >
        <Ionicons
          color={colors.textMuted}
          name="time-outline"
          size={iconSize.sm}
        />
        <View style={styles.detailCopy}>
          <Text tone="secondary" variant="caption">
            Hora
          </Text>
          {formattedTime ? (
            <Text variant="label">{formattedTime}</Text>
          ) : (
            <Text tone="secondary" variant="label">
              Agregar hora
            </Text>
          )}
        </View>
        <Ionicons
          color={colors.textMuted}
          name="chevron-forward"
          size={iconSize.sm}
        />
      </Pressable>
      <TransactionTimePickerModal
        occurredTime={occurredTime}
        onClose={() => setPickerVisible(false)}
        onSelect={(nextTime) => {
          setPickerVisible(false);
          if (nextTime !== (occurredTime ?? null)) onChange(nextTime);
        }}
        visible={isPickerVisible}
      />
    </>
  );
}
