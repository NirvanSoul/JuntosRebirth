import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@/components/layout/Screen/Screen';
import type { Category } from '@/features/categories/types';
import {
  TransactionPeriodModal,
  type TransactionPeriodModalType,
} from '@/features/dashboard/components/TransactionPeriodModal/TransactionPeriodModal';
import { MapCalendarHeader } from '@/features/map/components/MapCalendarHeader';
import { MapCalendarLoadMore } from '@/features/map/components/MapCalendarLoadMore';
import { MapDayModal } from '@/features/map/components/MapDayModal';
import { MapMonthSummary } from '@/features/map/components/MapMonthSummary';
import { MapReturnToToday } from '@/features/map/components/MapReturnToToday';
import {
  WeeklyMovementCalendar,
  type WeeklyMovementCalendarHandle,
} from '@/features/map/components/WeeklyMovementCalendar';
import type {
  SessionTransaction,
  TransactionType,
} from '@/features/transactions/types';
import { projectRecurringTransactions } from '@/features/transactions/utils/transactionRecurrence';
import { summarizeTransactionTotals } from '@/features/transactions/utils/transactionSummary';
import {
  getInitialMapCalendarRangeEnd,
  getNextMapCalendarRangeEnd,
} from '@/features/map/model/calendarRange';
import { indexMapCalendarDays } from '@/features/map/model/mapCalendarDays';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import {
  getMonthDistance,
  getMonthStartAtOffset,
  maximumCalendarDate,
  minimumCalendarDate,
} from '@/lib/date/monthDistance';
import { getLocalTodayKey, toLocalDateKey } from '@/lib/date/localDate';
import { type CurrencyCode } from '@/lib/currency/currencyCatalog';
import { layout } from '@/theme/layout';
import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/useTheme';

type MapScreenProps = {
  categories?: readonly Category[];
  currency: CurrencyCode;
  onAddTransaction?: (date: string, type?: TransactionType) => void;
  onOpenTransactionDetail?: (transactionId: string) => void;
  today?: string;
  transactions?: readonly SessionTransaction[];
};

export type MapScreenHandle = {
  resetToToday: () => void;
};

function getProjectionRange(monthKey: string): {
  endOn: string;
  startOn: string;
} {
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));

  return {
    startOn: toLocalDateKey(new Date(year, month - 2, 1, 12)),
    endOn: toLocalDateKey(new Date(year, month + 1, 0, 12)),
  };
}

const distantMonthThreshold = 6;
const calendarResetFocusGuardDuration = 1000;

export const MapScreen = forwardRef<MapScreenHandle, MapScreenProps>(
  function MapScreen(
    {
      categories = [],
      currency,
      onAddTransaction,
      onOpenTransactionDetail,
      today = getLocalTodayKey(),
      transactions = [],
    },
    ref,
  ) {
    const density = useLayoutDensity();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const calendarRef = useRef<WeeklyMovementCalendarHandle>(null);
    const currentMonth = today.slice(0, 7);
    const [focusedMonth, setFocusedMonth] = useState(currentMonth);
    const [calendarRangeEndDate, setCalendarRangeEndDate] = useState(() =>
      getInitialMapCalendarRangeEnd(today),
    );
    const focusedDateRef = useRef(today);
    const calendarResetFrameRef = useRef<number | null>(null);
    const calendarResetGuardTimerRef = useRef<ReturnType<
      typeof setTimeout
    > | null>(null);
    const isCalendarResetMountPendingRef = useRef(false);
    const isCalendarResettingRef = useRef(false);
    const [isCalendarResetting, setCalendarResetting] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [isDayModalVisible, setDayModalVisible] = useState(false);
    const [periodModalType, setPeriodModalType] =
      useState<TransactionPeriodModalType | null>(null);
    const calendarResetOpacity = useSharedValue(1);
    const calendarNavigationTranslateY = useSharedValue(0);
    const calendarResetStyle = useAnimatedStyle(() => ({
      opacity: calendarResetOpacity.value,
      transform: [{ translateY: calendarNavigationTranslateY.value }],
    }));
    const visibleTransactions = useMemo(() => {
      const range = getProjectionRange(focusedMonth);
      return projectRecurringTransactions({ transactions, ...range });
    }, [focusedMonth, transactions]);
    const calendarDays = useMemo(
      () => indexMapCalendarDays(visibleTransactions),
      [visibleTransactions],
    );
    const selectedTransactions = useMemo(
      () =>
        selectedDate
          ? (calendarDays.get(selectedDate)?.transactions ?? [])
          : [],
      [calendarDays, selectedDate],
    );
    const focusedMonthTotals = useMemo(
      () =>
        summarizeTransactionTotals(
          visibleTransactions.filter(
            (transaction) =>
              transaction.currency === currency &&
              transaction.occurredOn.startsWith(`${focusedMonth}-`),
          ),
        ),
      [currency, focusedMonth, visibleTransactions],
    );
    const focusedMonthDate = useMemo(
      () =>
        new Date(
          Number(focusedMonth.slice(0, 4)),
          Number(focusedMonth.slice(5, 7)) - 1,
          1,
          12,
        ),
      [focusedMonth],
    );
    const monthDistance = getMonthDistance(currentMonth, focusedMonth);
    const returnDirection =
      Math.abs(monthDistance) >= distantMonthThreshold
        ? monthDistance > 0
          ? 'up'
          : 'down'
        : null;

    useEffect(
      () => () => {
        if (calendarResetFrameRef.current !== null) {
          cancelAnimationFrame(calendarResetFrameRef.current);
        }
        if (calendarResetGuardTimerRef.current) {
          clearTimeout(calendarResetGuardTimerRef.current);
        }
      },
      [],
    );

    const handleFocusedMonthChange = useCallback(
      (month: string, date?: string) => {
        const nextFocusedDate = date ?? `${month}-01`;
        if (isCalendarResetMountPendingRef.current) return;
        focusedDateRef.current = nextFocusedDate;
        setFocusedMonth(month);
      },
      [],
    );
    const handleSelectDate = useCallback((date: string) => {
      setSelectedDate(date);
      setDayModalVisible(true);
    }, []);
    const finishCalendarReset = useCallback(() => {
      isCalendarResettingRef.current = false;
      setCalendarResetting(false);
    }, []);

    const completeMonthNavigation = useCallback(
      (targetDate: string) => {
        focusedDateRef.current = targetDate;
        setFocusedMonth(targetDate.slice(0, 7));
        calendarRef.current?.scrollToDate(targetDate);
        calendarNavigationTranslateY.value = spacing.sm;
        calendarResetOpacity.value = withTiming(
          1,
          {
            duration: motion.calendarMonthNavigationFadeInDuration,
            easing: Easing.inOut(Easing.cubic),
            reduceMotion: ReduceMotion.System,
          },
          (finished) => {
            if (finished) runOnJS(finishCalendarReset)();
          },
        );
        calendarNavigationTranslateY.value = withTiming(0, {
          duration: motion.calendarMonthNavigationFadeInDuration,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        });
      },
      [calendarNavigationTranslateY, calendarResetOpacity, finishCalendarReset],
    );
    const handleMonthNavigation = useCallback(
      (offset: -1 | 1) => {
        const targetDate = getMonthStartAtOffset(`${focusedMonth}-01`, offset);
        if (
          isCalendarResettingRef.current ||
          targetDate < minimumCalendarDate ||
          targetDate > calendarRangeEndDate
        ) {
          return;
        }

        isCalendarResettingRef.current = true;
        setCalendarResetting(true);
        calendarResetOpacity.value = withTiming(
          0,
          {
            duration: motion.calendarMonthNavigationFadeOutDuration,
            easing: Easing.inOut(Easing.cubic),
            reduceMotion: ReduceMotion.System,
          },
          (finished) => {
            if (finished) runOnJS(completeMonthNavigation)(targetDate);
          },
        );
      },
      [
        calendarRangeEndDate,
        calendarResetOpacity,
        completeMonthNavigation,
        focusedMonth,
      ],
    );

    const handleLoadMoreCalendar = useCallback(() => {
      setCalendarRangeEndDate((currentRangeEnd) =>
        getNextMapCalendarRangeEnd(currentRangeEnd),
      );
    }, []);
    const calendarLoadMore =
      calendarRangeEndDate < maximumCalendarDate ? (
        <MapCalendarLoadMore onPress={handleLoadMoreCalendar} />
      ) : null;

    const revealResetCalendar = useCallback(() => {
      calendarResetFrameRef.current = requestAnimationFrame(() => {
        calendarResetFrameRef.current = null;
        calendarResetOpacity.value = withTiming(
          1,
          {
            duration: motion.calendarResetFadeInDuration,
            easing: Easing.inOut(Easing.cubic),
            reduceMotion: ReduceMotion.System,
          },
          (finished) => {
            if (finished) runOnJS(finishCalendarReset)();
          },
        );
      });
    }, [calendarResetOpacity, finishCalendarReset]);
    const resetCalendarToToday = useCallback(() => {
      focusedDateRef.current = today;
      isCalendarResetMountPendingRef.current = true;
      if (calendarResetGuardTimerRef.current) {
        clearTimeout(calendarResetGuardTimerRef.current);
      }
      calendarResetGuardTimerRef.current = setTimeout(() => {
        calendarResetGuardTimerRef.current = null;
        isCalendarResetMountPendingRef.current = false;
      }, calendarResetFocusGuardDuration);
      setSelectedDate(null);
      setFocusedMonth(currentMonth);
      calendarRef.current?.scrollToDate(today);
      revealResetCalendar();
    }, [currentMonth, revealResetCalendar, today]);
    const handleReturnToToday = useCallback(() => {
      if (isCalendarResettingRef.current) return;
      isCalendarResettingRef.current = true;
      setCalendarResetting(true);
      calendarResetOpacity.value = withTiming(
        0,
        {
          duration: motion.calendarResetFadeOutDuration,
          easing: Easing.inOut(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        },
        (finished) => {
          if (finished) runOnJS(resetCalendarToToday)();
        },
      );
    }, [calendarResetOpacity, resetCalendarToToday]);
    const resetToToday = useCallback(() => {
      const isOnCurrentMonth =
        focusedDateRef.current.slice(0, 7) === currentMonth;
      if (isOnCurrentMonth) return;
      resetCalendarToToday();
    }, [currentMonth, resetCalendarToToday]);
    useImperativeHandle(ref, () => ({ resetToToday }), [resetToToday]);

    return (
      <>
        <Screen
          contentContainerStyle={styles.screen}
          scrollable={false}
          testID="map-screen"
        >
          <MapCalendarHeader
            focusedMonth={focusedMonth}
            gutter={layout.screenGutter[density]}
            onChangeMonth={handleMonthNavigation}
            rangeEndDate={calendarRangeEndDate}
          />

          <MapMonthSummary
            currency={currency}
            gutter={layout.screenGutter[density]}
            onBalancePress={() => setPeriodModalType('balance')}
            onExpensePress={() => setPeriodModalType('expense')}
            onIncomePress={() => setPeriodModalType('income')}
            totals={focusedMonthTotals}
          />

          <Animated.View
            pointerEvents={isCalendarResetting ? 'none' : 'auto'}
            style={[
              styles.calendarViewport,
              { backgroundColor: colors.surface },
              calendarResetStyle,
            ]}
            testID="map-calendar-viewport"
          >
            <WeeklyMovementCalendar
              ref={calendarRef}
              categories={categories}
              currentDate={today}
              days={calendarDays}
              footer={calendarLoadMore}
              onFocusedMonthChange={handleFocusedMonthChange}
              onOpenTransactionDetail={onOpenTransactionDetail}
              onSelectDate={handleSelectDate}
              rangeEndDate={calendarRangeEndDate}
              selectedDate={selectedDate ?? undefined}
              testID="map-weekly-calendar"
              today={today}
            />
          </Animated.View>

          {returnDirection ? (
            <MapReturnToToday
              bottom={insets.bottom + layout.floatingActionSize + spacing.md}
              direction={returnDirection}
              disabled={isCalendarResetting}
              onPress={handleReturnToToday}
            />
          ) : null}
        </Screen>

        <MapDayModal
          categories={categories}
          date={selectedDate}
          onAddTransaction={(date) => onAddTransaction?.(date)}
          onClose={() => setDayModalVisible(false)}
          onOpenTransactionDetail={onOpenTransactionDetail}
          transactions={selectedTransactions}
          visible={isDayModalVisible}
        />

        {periodModalType ? (
          <TransactionPeriodModal
            categories={categories}
            initialCurrency={currency}
            initialDate={focusedMonthDate}
            onAdd={() => {
              const transactionType = periodModalType;
              setPeriodModalType(null);
              onAddTransaction?.(
                `${focusedMonth}-01`,
                transactionType === 'balance' ? undefined : transactionType,
              );
            }}
            onClose={() => setPeriodModalType(null)}
            onOpenTransactionDetail={(transactionId) => {
              setPeriodModalType(null);
              onOpenTransactionDetail?.(transactionId);
            }}
            transactions={transactions}
            type={periodModalType}
            visible
          />
        ) : null}
      </>
    );
  },
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: spacing.none,
    paddingBottom: spacing.none,
  },
  calendarViewport: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
  },
});
