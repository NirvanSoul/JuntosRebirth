import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import {
  formatTimeOfDay,
  maxTransactionReminderTimesPerDay,
  normalizeReminderTimes,
} from '@/features/transactions/utils/transactionReminders';
import { iconSize, layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type ReminderTimesEditorProps = {
  maxTimes?: number;
  onChange: (times: readonly string[]) => void;
  times: readonly string[];
};

/**
 * Lista de horas (chips removibles) más un selector nativo por plataforma
 * para añadir una hora nueva, hasta `maxTimes`. Compartido entre el
 * recordatorio manual de un movimiento y las reglas de notificación por tipo.
 */
export function ReminderTimesEditor({
  maxTimes = maxTransactionReminderTimesPerDay,
  onChange,
  times,
}: ReminderTimesEditorProps) {
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const [isPickerVisible, setPickerVisible] = useState(false);
  const [pickerValue, setPickerValue] = useState(() => new Date());

  const openTimePicker = () => {
    if (times.length >= maxTimes) return;
    setPickerValue(new Date());
    setPickerVisible(true);
  };

  const addTime = (date: Date) => {
    onChange(normalizeReminderTimes([...times, formatTimeOfDay(date)]));
  };

  const removeTime = (time: string) => {
    onChange(times.filter((entry) => entry !== time));
  };

  const handleAndroidChange = (event: DateTimePickerEvent, date?: Date) => {
    setPickerVisible(false);
    if (event.type === 'set' && date) {
      addTime(date);
    }
  };

  return (
    <View style={styles.container}>
      {times.length > 0 ? (
        <View style={styles.timesList}>
          {times.map((time) => (
            <View key={time} style={styles.timeRow}>
              <Ionicons
                color={colors.textMuted}
                name="alarm-outline"
                size={iconSize.sm}
              />
              <Text style={styles.timeLabel} variant="bodyStrong">
                {time}
              </Text>
              <Pressable
                accessibilityLabel={`Quitar recordatorio de las ${time}`}
                accessibilityRole="button"
                hitSlop={spacing.sm}
                onPress={() => removeTime(time)}
                style={({ pressed }) => [
                  styles.removeTimeButton,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  color={colors.textMuted}
                  name="close"
                  size={iconSize.sm}
                />
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <Text tone="secondary" variant="footnote">
          Añade al menos una hora.
        </Text>
      )}

      {times.length < maxTimes ? (
        <Pressable
          accessibilityLabel="Añadir hora de recordatorio"
          accessibilityRole="button"
          onPress={openTimePicker}
          style={({ pressed }) => [
            styles.addTimeButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons color={colors.cta} name="add" size={iconSize.sm} />
          <Text tone="primary" variant="label" weight="bold">
            Añadir hora
          </Text>
        </Pressable>
      ) : (
        <Text tone="secondary" variant="footnote">
          Alcanzaste el máximo de {maxTimes} recordatorios en un mismo día.
        </Text>
      )}

      {isPickerVisible && Platform.OS === 'ios' ? (
        <View style={styles.iosPickerCard}>
          <DateTimePicker
            display="spinner"
            mode="time"
            onChange={(_event, date) => date && setPickerValue(date)}
            testID="reminder-time-picker"
            value={pickerValue}
          />
          <View style={styles.iosPickerActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setPickerVisible(false)}
              style={({ pressed }) => [
                styles.iosPickerCancel,
                pressed && styles.pressed,
              ]}
            >
              <Text tone="secondary" variant="label" weight="bold">
                Cancelar
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                addTime(pickerValue);
                setPickerVisible(false);
              }}
              style={({ pressed }) => [
                styles.iosPickerConfirm,
                pressed && styles.pressed,
              ]}
            >
              <Text tone="onBrand" variant="label" weight="bold">
                Añadir
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      {isPickerVisible && Platform.OS !== 'ios' ? (
        <DateTimePicker
          display="default"
          mode="time"
          onChange={handleAndroidChange}
          testID="reminder-time-picker"
          value={pickerValue}
        />
      ) : null}
    </View>
  );
}

function createStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    container: { gap: spacing.md },
    timesList: { gap: spacing.sm },
    timeRow: {
      minHeight: layout.controlHeight.regular,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      paddingHorizontal: spacing.lg,
    },
    timeLabel: { flex: 1 },
    removeTimeButton: {
      width: layout.minTouchTarget,
      height: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: -spacing.md,
    },
    addTimeButton: {
      ...shadows.subtle,
      minHeight: layout.minTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      backgroundColor: colors.surface,
      borderColor: colors.cta,
      borderRadius: radii.md,
      borderStyle: 'dashed',
      borderWidth: 1,
    },
    iosPickerCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      overflow: 'hidden',
    },
    iosPickerActions: {
      flexDirection: 'row',
      borderTopColor: colors.border,
      borderTopWidth: 1,
    },
    iosPickerCancel: {
      flex: 1,
      minHeight: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iosPickerConfirm: {
      flex: 1,
      minHeight: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cta,
    },
    pressed: { opacity: 0.64 },
  });
}
