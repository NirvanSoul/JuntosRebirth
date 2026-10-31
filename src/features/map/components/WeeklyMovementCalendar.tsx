import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { FlatList, StyleSheet, View, type ListViewToken } from 'react-native';
import {
  compactCardHeight,
  pillCardHeight,
} from '@/features/categories/components/CategoryPreviewCard/CategoryPreviewCard';
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
  previewMode?: 'cards' | 'pills';
  rangeEndDate: string;
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

function getDayColumnHeight(
  cardCount: number,
  previewMode: 'cards' | 'pills',
): number {
  if (cardCount === 0) return dayColumnBaseHeight;
  const visibleCount =
    previewMode === 'pills' ? Math.min(cardCount, 3) : cardCount;
  const overflow = previewMode === 'pills' && cardCount > 3;
  return (
    dayColumnBaseHeight +
    visibleCount *
      (previewMode === 'pills' ? pillCardHeight : compactCardHeight) +
    (visibleCount - 1) * spacing.xs +
    (overflow ? spacing.xs + pillCardHeight : 0)
  );
}

function getWeekRowHeight(
  maxCardCount: number,
  hasMonthSeparator: boolean,
  previewMode: 'cards' | 'pills',
): number {
  return (
    (hasMonthSeparator ? spacing.xxxl : 0) +
    spacing.md +
    getDayColumnHeight(maxCardCount, previewMode) +
    spacing.xl
  );
}

type WeekLayout = { index: number; length: number; offset: number };

/** Conserva la semana y la posición relativa cuando cambia su altura. */
export function mapCalendarOffset(
  offset: number,
  previous: readonly WeekLayout[],
  next: readonly WeekLayout[],
): number {
  if (previous.length === 0 || next.length === 0) return offset;
  let low = 0;
  let high = previous.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (previous[middle]!.offset <= offset) low = middle;
    else high = middle - 1;
  }
  const oldWeek = previous[low]!;
  const newWeek = next[low];
  if (!newWeek) return offset;
  const progress = Math.max(
    0,
    Math.min(1, (offset - oldWeek.offset) / oldWeek.length),
  );
  return newWeek.offset + progress * newWeek.length;
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
        previewMode = 'cards',
        rangeEndDate,
        testID,
        today,
      },
      ref,
    ) {
      const themedStyles = useThemedStyles(createThemedStyles);
      const [initialDate] = useState(currentDate);
      const calendarToday = today ?? initialDate;
      const listRef = useRef<FlatList<MonthSeparatedCalendarWeek>>(null);
      const scrollOffset = useRef<number | null>(null);
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
      // Preparar ambas alturas una sola vez evita recorrer el rango completo
      // durante el cierre de filtros y el cambio de visualización.
      const layoutsByMode = useMemo(() => {
        const layouts: Record<'cards' | 'pills', WeekLayout[]> = {
          cards: [],
          pills: [],
        };
        const offsets = { cards: 0, pills: 0 };
        weeks.forEach((week, index) => {
          const maxCardCount = week.reduce(
            (max, date) =>
              Math.max(max, days.get(date ?? '')?.transactions.length ?? 0),
            0,
          );
          const hasMonthSeparator = startsNewMonthSeparatedWeek(weeks, index);
          for (const mode of ['cards', 'pills'] as const) {
            const length = getWeekRowHeight(
              maxCardCount,
              hasMonthSeparator,
              mode,
            );
            layouts[mode].push({ index, length, offset: offsets[mode] });
            offsets[mode] += length;
          }
        });
        return layouts;
      }, [days, weeks]);
      const weekLayouts = layoutsByMode[previewMode];
      const previousLayout = useRef({
        mode: previewMode,
        layouts: weekLayouts,
      });
      useLayoutEffect(() => {
        const previous = previousLayout.current;
        if (previous.mode !== previewMode) {
          const oldOffset =
            scrollOffset.current ??
            previous.layouts[initialWeekIndex]?.offset ??
            0;
          const nextOffset = mapCalendarOffset(
            oldOffset,
            previous.layouts,
            weekLayouts,
          );
          scrollOffset.current = nextOffset;
          listRef.current?.scrollToOffset({
            offset: nextOffset,
            animated: false,
          });
        }
        previousLayout.current = { mode: previewMode, layouts: weekLayouts };
      }, [initialWeekIndex, previewMode, weekLayouts]);
      const getItemLayout = useCallback(
        (_: unknown, index: number) => weekLayouts[index]!,
        [weekLayouts],
      );
      const onFocusedMonthChangeRef = useRef(onFocusedMonthChange);
      useEffect(() => {
        onFocusedMonthChangeRef.current = onFocusedMonthChange;
      });
      const handleViewableItemsChanged = useCallback(
        ({ viewableItems }: { viewableItems: ListViewToken[] }) => {
          const focusedWeek = viewableItems.find(
            (viewableItem) => viewableItem.isViewable,
          )?.item as MonthSeparatedCalendarWeek | undefined;
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
            previewMode={previewMode}
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
          previewMode,
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
            ListFooterComponent={footer ?? undefined}
            maxToRenderPerBatch={10}
            onViewableItemsChanged={handleViewableItemsChanged}
            onScroll={(event) => {
              scrollOffset.current = event.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
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
