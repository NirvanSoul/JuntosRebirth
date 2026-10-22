import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { FlatList, StyleSheet, View, type ViewToken } from 'react-native';
import { compactCardHeight } from '@/features/categories/components/CategoryPreviewCard/CategoryPreviewCard';
import type { Category } from '@/features/categories/types';
import { MapWeekRow } from '@/features/map/components/MapWeekRow';
import { MapWeekdayHeader } from '@/features/map/components/MapWeekdayHeader';
import {
  getMonthSeparatedWeekStart,
  getMonthSeparatedWeeksInCalendarRange,
  startsNewMonthSeparatedWeek,
  type MonthSeparatedCalendarWeek,
} from '@/features/map/model/calendarPeriods';
import type { MapCalendarDays } from '@/features/map/model/mapCalendarDays';
import { minimumCalendarDate } from '@/lib/date/monthDistance';
import { layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useThemedStyles } from '@/theme/useThemedStyles';

type WeeklyMovementCalendarProps = {
  categories: readonly Category[];
  currentDate: string;
  days: MapCalendarDays;
  footer?: ReactElement | null;
  onFocusedMonthChange?: (month: string, date?: string) => void;
  onOpenTransactionDetail?: (transactionId: string) => void;
  onSelectDate: (date: string) => void;
  rangeEndDate: string;
  selectedDate?: string;
  testID: string;
  today?: string;
};

export type WeeklyMovementCalendarHandle = {
  scrollToDate: (date: string) => void;
  scrollToToday: () => void;
};

export {
  formatWeekMonthLabel,
  getCalendarWeek as getWeekDates,
  getWeeksInCalendarRange,
} from '@/features/map/model/calendarPeriods';

const scrollRetryDelay = 50;

const dayColumnBaseHeight = layout.minTouchTarget + spacing.sm;

function getDayColumnHeight(cardCount: number): number {
  if (cardCount === 0) return dayColumnBaseHeight;
  return (
    dayColumnBaseHeight +
    cardCount * compactCardHeight +
    (cardCount - 1) * spacing.xs
  );
}

function getWeekRowHeight(
  maxCardCount: number,
  hasMonthSeparator: boolean,
): number {
  return (
    (hasMonthSeparator ? spacing.xxxl : 0) +
    spacing.xl +
    getDayColumnHeight(maxCardCount) +
    spacing.xl
  );
}

const viewabilityConfig = { itemVisiblePercentThreshold: 50 };

export const WeeklyMovementCalendar = memo(
  forwardRef<WeeklyMovementCalendarHandle, WeeklyMovementCalendarProps>(
    function WeeklyMovementCalendar(
      {
        categories,
        currentDate,
        days,
        footer,
        onFocusedMonthChange,
        onOpenTransactionDetail,
        onSelectDate,
        rangeEndDate,
        selectedDate,
        testID,
        today,
      },
      ref,
    ) {
      const themedStyles = useThemedStyles(createThemedStyles);
      const [initialDate] = useState(currentDate);
      const calendarToday = today ?? initialDate;
      const listRef = useRef<FlatList<MonthSeparatedCalendarWeek>>(null);
      const pendingScrollIndex = useRef<number | null>(null);
      const scrollRetryTimer = useRef<ReturnType<typeof setTimeout> | null>(
        null,
      );
      const weeks = useMemo(
        () =>
          getMonthSeparatedWeeksInCalendarRange(
            minimumCalendarDate,
            rangeEndDate,
          ),
        [rangeEndDate],
      );
      const initialWeekIndex = useMemo(
        () =>
          Math.max(
            0,
            weeks.findIndex(
              (week) =>
                getMonthSeparatedWeekStart(week)?.slice(0, 7) ===
                initialDate.slice(0, 7),
            ),
          ),
        [initialDate, weeks],
      );
      const weekIndexByDate = useMemo(() => {
        const indexes = new Map<string, number>();
        weeks.forEach((week, index) => {
          week.forEach((date) => {
            if (date) indexes.set(date, index);
          });
        });
        return indexes;
      }, [weeks]);
      const categoriesById = useMemo(
        () => new Map(categories.map((category) => [category.id, category])),
        [categories],
      );
      const weekLayouts = useMemo(() => {
        const layouts: { index: number; length: number; offset: number }[] =
          new Array(weeks.length);
        let offset = 0;
        weeks.forEach((week, index) => {
          const maxCardCount = week.reduce(
            (max, date) =>
              Math.max(max, days.get(date ?? '')?.transactions.length ?? 0),
            0,
          );
          const length = getWeekRowHeight(
            maxCardCount,
            startsNewMonthSeparatedWeek(weeks, index),
          );
          layouts[index] = { index, length, offset };
          offset += length;
        });
        return layouts;
      }, [days, weeks]);
      const getItemLayout = useCallback(
        (_: unknown, index: number) => weekLayouts[index]!,
        [weekLayouts],
      );
      const onFocusedMonthChangeRef = useRef(onFocusedMonthChange);
      useEffect(() => {
        onFocusedMonthChangeRef.current = onFocusedMonthChange;
      });
      const handleViewableItemsChanged = useCallback(
        ({
          viewableItems,
        }: {
          viewableItems: ViewToken<MonthSeparatedCalendarWeek>[];
        }) => {
          const focusedWeek = viewableItems.find(
            (viewableItem) => viewableItem.isViewable,
          )?.item;
          const focusedDate = focusedWeek
            ? getMonthSeparatedWeekStart(focusedWeek)
            : undefined;
          if (focusedDate) {
            onFocusedMonthChangeRef.current?.(
              focusedDate.slice(0, 7),
              focusedDate,
            );
          }
        },
        [],
      );

      const scrollToFullIndex = useCallback(
        (fullIndex: number, animated: boolean) => {
          if (fullIndex < 0) return;
          if (scrollRetryTimer.current) {
            clearTimeout(scrollRetryTimer.current);
            scrollRetryTimer.current = null;
          }

          pendingScrollIndex.current = fullIndex;
          listRef.current?.scrollToIndex({
            animated,
            index: fullIndex,
            viewPosition: 0,
          });
        },
        [],
      );

      const renderWeek = useCallback(
        ({
          index,
          item: week,
        }: {
          index: number;
          item: MonthSeparatedCalendarWeek;
        }) => (
          <MapWeekRow
            categoriesById={categoriesById}
            currentDate={
              calendarToday && week.includes(calendarToday)
                ? calendarToday
                : undefined
            }
            days={days}
            hasMonthSeparator={startsNewMonthSeparatedWeek(weeks, index)}
            onOpenTransactionDetail={onOpenTransactionDetail}
            onSelectDate={onSelectDate}
            selectedDate={
              selectedDate && week.includes(selectedDate)
                ? selectedDate
                : undefined
            }
            testID={testID}
            week={week}
          />
        ),
        [
          calendarToday,
          categoriesById,
          days,
          onOpenTransactionDetail,
          onSelectDate,
          selectedDate,
          testID,
          weeks,
        ],
      );

      useEffect(
        () => () => {
          if (scrollRetryTimer.current) {
            clearTimeout(scrollRetryTimer.current);
          }
        },
        [],
      );

      useImperativeHandle(
        ref,
        () => ({
          scrollToDate: (date) => {
            const index = weekIndexByDate.get(date) ?? -1;
            scrollToFullIndex(index, false);
          },
          scrollToToday: () => {
            const index = weekIndexByDate.get(calendarToday) ?? -1;
            scrollToFullIndex(index, true);
          },
        }),
        [calendarToday, scrollToFullIndex, weekIndexByDate],
      );

      return (
        <View style={styles.container}>
          <MapWeekdayHeader />
          <FlatList
            contentContainerStyle={themedStyles.listContent}
            data={weeks}
            getItemLayout={getItemLayout}
            initialNumToRender={6}
            initialScrollIndex={initialWeekIndex}
            keyExtractor={(week) =>
              getMonthSeparatedWeekStart(week) ?? 'empty-week'
            }
            ListFooterComponent={footer}
            maxToRenderPerBatch={10}
            onViewableItemsChanged={handleViewableItemsChanged}
            removeClippedSubviews={false}
            onScrollToIndexFailed={({ averageItemLength, index }) => {
              const targetIndex = pendingScrollIndex.current ?? index;
              listRef.current?.scrollToOffset({
                animated: false,
                offset: averageItemLength * targetIndex,
              });
              if (scrollRetryTimer.current) {
                clearTimeout(scrollRetryTimer.current);
              }
              scrollRetryTimer.current = setTimeout(() => {
                scrollRetryTimer.current = null;
                listRef.current?.scrollToIndex({
                  animated: false,
                  index: targetIndex,
                  viewPosition: 0,
                });
              }, scrollRetryDelay);
            }}
            ref={listRef}
            renderItem={renderWeek}
            showsVerticalScrollIndicator={false}
            style={themedStyles.list}
            testID={testID}
            updateCellsBatchingPeriod={16}
            viewabilityConfig={viewabilityConfig}
            windowSize={9}
          />
        </View>
      );
    },
  ),
);

const styles = StyleSheet.create({
  container: { flex: 1 },
});

function createThemedStyles(colors: ColorTokens) {
  return StyleSheet.create({
    list: { flex: 1, backgroundColor: colors.surface },
    listContent: {
      backgroundColor: colors.surface,
      paddingBottom: layout.floatingActionClearance,
    },
  });
}
