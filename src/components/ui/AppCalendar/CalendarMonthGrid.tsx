import { Pressable, StyleSheet, View } from 'react-native';

import { MonthNavigatorLabelButton } from '@/components/ui/MonthNavigator/MonthNavigator';
import { Text } from '@/components/ui/Text/Text';
import { layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type CalendarMonthGridProps = {
  /** Color del mes elegido; por defecto, el CTA. */
  accentColor?: string;
  /** Meses elegibles como `YYYY-MM`; fuera de ese rango quedan apagados. */
  maxMonth?: string;
  minMonth?: string;
  /** Pulsar el año vuelve al calendario sin cambiar de mes. */
  onClose: () => void;
  onSelectMonth: (month: string) => void;
  /** Mes que muestra el calendario, `YYYY-MM`. */
  selectedMonth: string;
  testID: string;
};

/** Botones de mes por fila: cuatro filas de tres. */
const monthsPerRow = 3;
const monthIndexes = Array.from({ length: 12 }, (_, index) => index);

function formatMonthName(year: number, monthIndex: number): string {
  const name = new Intl.DateTimeFormat('es-ES', { month: 'short' })
    .format(new Date(year, monthIndex, 15))
    .replace('.', '');
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Los doce meses del año del calendario como botones, para saltar a uno sin
 * avanzar mes a mes. Ocupa el lugar del calendario: no abre otro modal.
 */
export function CalendarMonthGrid({
  accentColor,
  maxMonth,
  minMonth,
  onClose,
  onSelectMonth,
  selectedMonth,
  testID,
}: CalendarMonthGridProps) {
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const year = Number(selectedMonth.slice(0, 4));

  return (
    <View style={styles.container} testID={testID}>
      <MonthNavigatorLabelButton
        expanded
        label={String(year)}
        onPress={onClose}
        style={styles.yearButton}
        testID={`${testID}.year`}
      />
      <View style={styles.grid}>
        {monthIndexes.map((monthIndex) => {
          const month = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
          const isSelected = month === selectedMonth;
          const isDisabled =
            (minMonth !== undefined && month < minMonth) ||
            (maxMonth !== undefined && month > maxMonth);
          const label = formatMonthName(year, monthIndex);

          return (
            <Pressable
              accessibilityLabel={label}
              accessibilityRole="button"
              accessibilityState={{
                disabled: isDisabled,
                selected: isSelected,
              }}
              disabled={isDisabled}
              key={month}
              onPress={() => onSelectMonth(month)}
              style={({ pressed }) => [
                styles.month,
                isSelected && {
                  backgroundColor: accentColor ?? colors.cta,
                  borderColor: accentColor ?? colors.cta,
                },
                isDisabled && styles.disabled,
                pressed && styles.pressed,
              ]}
              testID={`${testID}.${month}`}
            >
              <Text
                tone={isSelected ? 'onBrand' : 'primary'}
                variant="label"
                weight={isSelected ? 'bold' : undefined}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    container: { gap: spacing.lg, paddingVertical: spacing.md },
    yearButton: { alignSelf: 'center' },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: spacing.md,
    },
    month: {
      ...shadows.subtle,
      width: `${100 / monthsPerRow - 3}%`,
      minHeight: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radii.round,
      borderWidth: 1,
    },
    disabled: { opacity: 0.4 },
    pressed: { opacity: 0.72 },
  });
}
