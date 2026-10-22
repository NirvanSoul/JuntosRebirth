import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text/Text';
import { CategoryPreviewCard } from '@/features/categories/components/CategoryPreviewCard/CategoryPreviewCard';
import type { Category } from '@/features/categories/types';
import { mapWeekdayLabels } from '@/features/map/components/MapWeekdayHeader';
import {
  getMonthSeparatedWeekStart,
  type MonthSeparatedCalendarWeek,
} from '@/features/map/model/calendarPeriods';
import type { MapCalendarDays } from '@/features/map/model/mapCalendarDays';
import { layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useThemedStyles } from '@/theme/useThemedStyles';

const emptyTransactions = [] as const;

type MapWeekRowProps = {
  categoriesById: ReadonlyMap<string, Category>;
  currentDate?: string;
  days: MapCalendarDays;
  hasMonthSeparator: boolean;
  onOpenTransactionDetail?: (transactionId: string) => void;
  onSelectDate: (date: string) => void;
  selectedDate?: string;
  testID: string;
  week: MonthSeparatedCalendarWeek;
};

/**
 * Cada semana solo recibe la fecha seleccionada o de hoy cuando le pertenece,
 * así cambiar de mes o de selección no vuelve a pintar el resto de filas.
 */
export const MapWeekRow = memo(function MapWeekRow({
  categoriesById,
  currentDate,
  days,
  hasMonthSeparator,
  onOpenTransactionDetail,
  onSelectDate,
  selectedDate,
  testID,
  week,
}: MapWeekRowProps) {
  const themedStyles = useThemedStyles(createThemedStyles);
  return (
    <View
      style={[
        themedStyles.weekBlock,
        hasMonthSeparator && styles.monthSeparator,
      ]}
      testID={`${testID}-week-${getMonthSeparatedWeekStart(week)}`}
    >
      <View style={styles.weekRow}>
        {week.map((date, dayIndex) => {
          if (!date) {
            return <View key={`empty-${dayIndex}`} style={styles.dayColumn} />;
          }
          const dayTransactions =
            days.get(date)?.transactions ?? emptyTransactions;
          const selected = selectedDate === date;
          const isCurrentDate = currentDate === date;
          const dayOfMonth = Number(date.slice(8, 10));
          return (
            <View key={date} style={styles.dayColumn}>
              <Pressable
                accessibilityLabel={`${mapWeekdayLabels[dayIndex]} ${dayOfMonth}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onSelectDate(date)}
                style={({ pressed }) => [
                  styles.dayHeader,
                  pressed && styles.pressed,
                ]}
                testID={`${testID}-day-${date}`}
              >
                <View
                  style={[
                    styles.dayNumber,
                    isCurrentDate && !selected && themedStyles.currentDay,
                    selected && themedStyles.selectedDay,
                  ]}
                >
                  <Text
                    align="center"
                    tone={selected ? 'onBrand' : 'primary'}
                    variant="body"
                  >
                    {dayOfMonth}
                  </Text>
                </View>
              </Pressable>
              <View style={styles.movementList}>
                {dayTransactions.map((transaction) => {
                  const category = categoriesById.get(transaction.categoryId);
                  return (
                    <CategoryPreviewCard
                      accessibilityHint="Abre el detalle del movimiento"
                      colorToken={category?.colorToken ?? 'slate'}
                      expenseMinor={0}
                      icon={category?.icon ?? 'receipt'}
                      incomeMinor={0}
                      key={transaction.id}
                      name={
                        transaction.title.trim() ||
                        category?.name ||
                        'Movimiento'
                      }
                      onPress={
                        onOpenTransactionDetail
                          ? () => onOpenTransactionDetail(transaction.id)
                          : undefined
                      }
                      testID={`${testID}-movement-${transaction.id}`}
                      variant="compact"
                    />
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  weekRow: {
    flexDirection: 'row',
    marginTop: spacing.xl,
  },
  dayColumn: {
    flex: 1,
    minWidth: 0,
    gap: spacing.sm,
    paddingHorizontal: spacing.xxs,
  },
  dayHeader: {
    minHeight: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: spacing.sm,
  },
  movementList: { gap: spacing.xs },
  monthSeparator: { paddingTop: spacing.xxxl },
  pressed: { opacity: 0.64 },
});

function createThemedStyles(colors: ColorTokens) {
  return StyleSheet.create({
    weekBlock: {
      backgroundColor: colors.surface,
      borderBottomColor: colors.categoryPreviewBorder,
      borderBottomWidth: StyleSheet.hairlineWidth,
      paddingBottom: spacing.xl,
    },
    currentDay: {
      borderColor: colors.cta,
      borderWidth: 1,
    },
    selectedDay: { backgroundColor: colors.cta },
  });
}
