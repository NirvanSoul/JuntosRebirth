import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { SelectableOption } from '@/components/ui/SelectableOption/SelectableOption';
import { Text } from '@/components/ui/Text/Text';
import {
  budgetIntervalDaysRange,
  type BudgetPeriod,
  type BudgetSchedule,
} from '@/features/categories/types';
import { formatNumericLocalDate, getLocalTodayKey } from '@/lib/date/localDate';
import { triggerHaptic } from '@/lib/haptics/haptics';
import { iconSize, layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type CategoryBudgetScheduleFieldsProps = {
  /** Inicio del personalizado al elegirlo; por defecto, hoy. */
  defaultAnchorOn?: string;
  onChange: (schedule: BudgetSchedule) => void;
  onPickAnchor: () => void;
  schedule: BudgetSchedule;
};

const periodOptions: readonly { label: string; value: BudgetPeriod }[] = [
  { value: 'month', label: 'Mensual' },
  { value: 'week', label: 'Semanal' },
  { value: 'fortnight', label: 'Quincenal' },
  { value: 'custom', label: 'Personalizado' },
];
const defaultIntervalDays = 10;
const periodOptionHeight = 44;

/** Alto que ocupan los campos, para el `contentHeight` del modal. */
export function getBudgetScheduleFieldsHeight(schedule: BudgetSchedule) {
  return (
    periodOptionHeight +
    spacing.lg +
    (schedule.period === 'custom' ? layout.minTouchTarget + spacing.lg : 0)
  );
}

/**
 * Periodicidad del presupuesto: mensual, semanal, quincenal o cada N días
 * desde una fecha de inicio.
 */
export function CategoryBudgetScheduleFields({
  defaultAnchorOn,
  onChange,
  onPickAnchor,
  schedule,
}: CategoryBudgetScheduleFieldsProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const selectPeriod = (period: BudgetPeriod) => {
    if (period === schedule.period) return;
    onChange(
      period === 'custom'
        ? {
            period,
            intervalDays: defaultIntervalDays,
            anchorOn: defaultAnchorOn ?? getLocalTodayKey(),
          }
        : { period },
    );
  };
  const changeIntervalDays = (offset: -1 | 1) => {
    if (schedule.period !== 'custom') return;
    triggerHaptic('keypadPress');
    onChange({
      ...schedule,
      intervalDays: Math.min(
        Math.max(schedule.intervalDays + offset, budgetIntervalDaysRange.min),
        budgetIntervalDaysRange.max,
      ),
    });
  };

  return (
    <>
      <View
        accessibilityRole="radiogroup"
        style={styles.periods}
        testID="category-budget-periods"
      >
        {periodOptions.map((option) => (
          <SelectableOption
            accessibilityLabel={`Periodicidad: ${option.label}`}
            compact
            indicator={false}
            key={option.value}
            label={option.label}
            onPress={() => selectPeriod(option.value)}
            role="radio"
            selected={schedule.period === option.value}
            style={styles.period}
            testID={`category-budget-period-${option.value}`}
          />
        ))}
      </View>

      {schedule.period === 'custom' ? (
        <View style={styles.customRow} testID="category-budget-custom">
          <View style={styles.stepper}>
            <Pressable
              accessibilityLabel="Menos días"
              accessibilityRole="button"
              disabled={schedule.intervalDays <= budgetIntervalDaysRange.min}
              hitSlop={spacing.xs}
              onPress={() => changeIntervalDays(-1)}
              style={styles.stepperButton}
              testID="category-budget-interval-decrease"
            >
              <Ionicons
                color={colors.textPrimary}
                name="remove"
                size={iconSize.md}
              />
            </Pressable>
            <Text
              testID="category-budget-interval"
              variant="label"
              weight="medium"
            >
              Cada {schedule.intervalDays} días
            </Text>
            <Pressable
              accessibilityLabel="Más días"
              accessibilityRole="button"
              disabled={schedule.intervalDays >= budgetIntervalDaysRange.max}
              hitSlop={spacing.xs}
              onPress={() => changeIntervalDays(1)}
              style={styles.stepperButton}
              testID="category-budget-interval-increase"
            >
              <Ionicons
                color={colors.textPrimary}
                name="add"
                size={iconSize.md}
              />
            </Pressable>
          </View>
          <Pressable
            accessibilityLabel={`Empieza el ${formatNumericLocalDate(schedule.anchorOn)}`}
            accessibilityRole="button"
            onPress={onPickAnchor}
            style={styles.anchorButton}
            testID="category-budget-anchor"
          >
            <Text tone="secondary" variant="caption">
              Desde
            </Text>
            <Text variant="label" weight="medium">
              {formatNumericLocalDate(schedule.anchorOn)}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    periods: { flexDirection: 'row', gap: spacing.xs },
    period: { flex: 1, minHeight: periodOptionHeight },
    customRow: {
      minHeight: layout.minTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    stepper: {
      flex: 1,
      minHeight: layout.minTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      paddingHorizontal: spacing.xs,
    },
    stepperButton: {
      width: layout.minTouchTarget - spacing.sm,
      height: layout.minTouchTarget - spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    anchorButton: {
      minHeight: layout.minTouchTarget,
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
    },
  });
}
