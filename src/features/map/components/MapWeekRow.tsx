import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text/Text';
import { CategoryPreviewCard } from '@/features/categories/components/CategoryPreviewCard/CategoryPreviewCard';
import type { Category } from '@/features/categories/types';
import { mapWeekdayLabels } from '@/features/map/components/MapWeekdayHeader';
import {
  getMonthLabelParts,
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
  previewMode: 'cards' | 'pills';
  onOpenTransactionDetail?: (transactionId: string) => void;
  onSelectDate: (date: string) => void;
  testID: string;
  week: MonthSeparatedCalendarWeek;
};

/**
 * Cada semana solo recibe la fecha de hoy cuando le pertenece.
 */
export const MapWeekRow = memo(function MapWeekRow({
  categoriesById,
  currentDate,
  days,
  hasMonthSeparator,
  onOpenTransactionDetail,
  onSelectDate,
  previewMode,
  testID,
  week,
}: MapWeekRowProps) {
  const themedStyles = useThemedStyles(createThemedStyles);
  const weekStart = getMonthSeparatedWeekStart(week)!;
  const month = getMonthLabelParts(weekStart.slice(0, 7));
  return (
    <View
      style={themedStyles.weekBlock}
      testID={`${testID}-week-${getMonthSeparatedWeekStart(week)}`}
    >
      {hasMonthSeparator ? (
        <View
          style={styles.monthSeparator}
          testID={`${testID}-month-${weekStart.slice(0, 7)}`}
        >
          <Text variant="footnote" tone="secondary" weight="semibold">
            {month.month} {month.year}
          </Text>
        </View>
      ) : null}
      <View style={styles.weekRow}>
        {week.map((date, dayIndex) => {
          if (!date) {
            return <View key={`empty-${dayIndex}`} style={styles.dayColumn} />;
          }
          const dayTransactions =
            days.get(date)?.transactions ?? emptyTransactions;
          const isCurrentDate = currentDate === date;
          const dayOfMonth = Number(date.slice(8, 10));
          return (
            <View key={date} style={styles.dayColumn}>
              <Pressable
                accessibilityLabel={`${mapWeekdayLabels[dayIndex]} ${dayOfMonth}`}
                accessibilityRole="button"
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
                    isCurrentDate && themedStyles.currentDay,
                  ]}
                >
                  <Text
                    align="center"
                    tone={isCurrentDate ? 'onBrand' : 'primary'}
                    variant="body"
                    weight="regular"
                  >
                    {dayOfMonth}
                  </Text>
                </View>
              </Pressable>
              <View style={styles.movementList}>
                {(previewMode === 'pills'
                  ? dayTransactions.slice(0, 3)
                  : dayTransactions
                ).map((transaction) => {
                  const category = categoriesById.get(transaction.categoryId);
                  return (
                    <CategoryPreviewCard
                      accessibilityHint="Abre el detalle del movimiento"
                      actionTarget={
                        previewMode === 'cards'
                          ? {
                              kind: 'transaction',
                              id: transaction.id,
                            }
                          : undefined
                      }
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
                      variant={previewMode === 'pills' ? 'pill' : 'compact'}
                    />
                  );
                })}
                {previewMode === 'pills' && dayTransactions.length > 3 ? (
                  <View style={styles.overflow}>
                    <Text
                      align="center"
                      variant="caption"
                      tone="secondary"
                      testID={`${testID}-overflow-${date}`}
                    >
                      +{dayTransactions.length - 3}
                    </Text>
                  </View>
                ) : null}
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
    marginTop: spacing.md,
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
  overflow: { height: 24, justifyContent: 'center', alignItems: 'center' },
  monthSeparator: {
    height: spacing.xxxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    currentDay: { backgroundColor: colors.cta },
  });
}
