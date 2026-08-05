import { CaretDoubleDown } from 'phosphor-react-native/src/icons/CaretDoubleDown';
import { CaretDoubleUp } from 'phosphor-react-native/src/icons/CaretDoubleUp';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { MarkedDates } from 'react-native-calendars/src/types';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@/components/layout/Screen/Screen';
import {
  AppCalendar,
  type AppCalendarHandle,
} from '@/components/ui/AppCalendar/AppCalendar';
import { Text } from '@/components/ui/Text/Text';
import type { Category } from '@/features/categories/types';
import { MapDayModal } from '@/features/map/components/MapDayModal';
import {
  WeeklyMovementCalendar,
  type WeeklyMovementCalendarHandle,
} from '@/features/map/components/WeeklyMovementCalendar';
import type { SessionTransaction } from '@/features/transactions/types';
import { projectRecurringTransactions } from '@/features/transactions/utils/transactionRecurrence';
import {
  getCalendarWeek,
  getMonthLabelParts,
} from '@/features/map/model/calendarPeriods';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import {
  getMonthDistance,
  maximumCalendarDate,
} from '@/lib/date/monthDistance';
import { colors } from '@/theme/colors';
import { iconSize, layout } from '@/theme/layout';
import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';

type MapScreenProps = {
  categories?: readonly Category[];
  onAddTransaction?: (date: string) => void;
  onOpenTransactionDetail?: (transactionId: string) => void;
  today?: string;
  transactions?: readonly SessionTransaction[];
};

type CalendarView = 'monthly' | 'weekly';

export type MapScreenHandle = {
  resetToToday: () => void;
};

function getLocalDate(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatLocalDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function getProjectionRange(monthKey: string): {
  endOn: string;
  startOn: string;
} {
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));

  return {
    startOn: formatLocalDate(new Date(year, month - 2, 1, 12)),
    endOn: formatLocalDate(new Date(year, month + 1, 0, 12)),
  };
}

const distantMonthThreshold = 6;
const inactiveCalendarSyncInterval = 100;
const calendarResetFocusGuardDuration = 1000;
const returnButtonVerticalAdjustment = spacing.xxl;

const returnButtonEntering = FadeIn.duration(
  motion.floatingButtonVisibilityDuration,
)
  .easing(Easing.inOut(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const returnButtonExiting = FadeOut.duration(
  motion.floatingButtonVisibilityDuration,
)
  .easing(Easing.inOut(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
export const MapScreen = forwardRef<MapScreenHandle, MapScreenProps>(
  function MapScreen(
    {
      categories = [],
      onAddTransaction,
      onOpenTransactionDetail,
      today = getLocalDate(),
      transactions = [],
    },
    ref,
  ) {
    const density = useLayoutDensity();
    const insets = useSafeAreaInsets();
    const calendarRef = useRef<AppCalendarHandle>(null);
    const weeklyCalendarRef = useRef<WeeklyMovementCalendarHandle>(null);
    const currentMonth = today.slice(0, 7);
    const [focusedMonth, setFocusedMonth] = useState(currentMonth);
    const [calendarView, setCalendarView] = useState<CalendarView>('weekly');
    const calendarViewRef = useRef<CalendarView>('weekly');
    const activeFocusedDateRef = useRef(today);
    const monthlyFocusedDateRef = useRef(today);
    const weeklyFocusedDateRef = useRef(today);
    const pendingCalendarSyncRef = useRef<{
      date: string;
      sourceView: CalendarView;
    } | null>(null);
    const calendarSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );
    const lastCalendarSyncTimeRef = useRef(0);
    const calendarResetFrameRef = useRef<number | null>(null);
    const calendarResetGuardTimerRef = useRef<ReturnType<
      typeof setTimeout
    > | null>(null);
    const calendarResetPendingViewsRef = useRef<Set<CalendarView>>(new Set());
    const isCalendarResettingRef = useRef(false);
    const [calendarResetKey, setCalendarResetKey] = useState(0);
    const [isCalendarResetting, setCalendarResetting] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [isDayModalVisible, setDayModalVisible] = useState(false);
    const calendarViewProgress = useSharedValue(1);
    const calendarResetOpacity = useSharedValue(1);
    const calendarResetStyle = useAnimatedStyle(() => ({
      opacity: calendarResetOpacity.value,
    }));
    const monthlyCalendarStyle = useAnimatedStyle(() => ({
      opacity: 1 - calendarViewProgress.value,
      transform: [{ translateY: calendarViewProgress.value * -spacing.sm }],
    }));
    const weeklyCalendarStyle = useAnimatedStyle(() => ({
      opacity: calendarViewProgress.value,
      transform: [
        { translateY: (1 - calendarViewProgress.value) * spacing.sm },
      ],
    }));
    const visibleTransactions = useMemo(() => {
      const range = getProjectionRange(focusedMonth);
      return projectRecurringTransactions({ transactions, ...range });
    }, [focusedMonth, transactions]);
    const markedDates = useMemo<MarkedDates>(() => {
      const dates: MarkedDates = {};
      for (const transaction of visibleTransactions) {
        const currentDots = dates[transaction.occurredOn]?.dots ?? [];
        const dot =
          transaction.type === 'expense'
            ? { key: 'expense', color: colors.expense }
            : { key: 'income', color: colors.income };
        if (!currentDots.some(({ key }) => key === dot.key)) {
          dates[transaction.occurredOn] = { dots: [...currentDots, dot] };
        }
      }
      return dates;
    }, [visibleTransactions]);
    const selectedTransactions = useMemo(
      () =>
        selectedDate
          ? visibleTransactions.filter(
              (transaction) => transaction.occurredOn === selectedDate,
            )
          : [],
      [selectedDate, visibleTransactions],
    );
    const focusedMonthLabel = getMonthLabelParts(focusedMonth);
    const monthDistance = getMonthDistance(currentMonth, focusedMonth);
    const returnDirection =
      Math.abs(monthDistance) >= distantMonthThreshold
        ? monthDistance > 0
          ? 'up'
          : 'down'
        : null;

    const syncInactiveCalendar = useCallback(
      (sourceView: CalendarView, date: string) => {
        if (sourceView === 'monthly') {
          const targetWeek = getCalendarWeek(date)[0];
          const visibleWeek = getCalendarWeek(weeklyFocusedDateRef.current)[0];
          if (targetWeek === visibleWeek) return;
          weeklyCalendarRef.current?.scrollToDate(date);
          return;
        }

        if (monthlyFocusedDateRef.current.slice(0, 7) === date.slice(0, 7)) {
          return;
        }
        calendarRef.current?.scrollToDate(date);
      },
      [],
    );
    const cancelPendingCalendarSync = useCallback(() => {
      pendingCalendarSyncRef.current = null;
      if (calendarSyncTimerRef.current) {
        clearTimeout(calendarSyncTimerRef.current);
        calendarSyncTimerRef.current = null;
      }
    }, []);
    const scheduleInactiveCalendarSync = useCallback(
      (sourceView: CalendarView, date: string) => {
        pendingCalendarSyncRef.current = { date, sourceView };
        if (calendarSyncTimerRef.current) return;

        const elapsed = Date.now() - lastCalendarSyncTimeRef.current;
        const delay = Math.max(0, inactiveCalendarSyncInterval - elapsed);
        calendarSyncTimerRef.current = setTimeout(() => {
          calendarSyncTimerRef.current = null;
          const request = pendingCalendarSyncRef.current;
          pendingCalendarSyncRef.current = null;
          if (!request || calendarViewRef.current !== request.sourceView)
            return;

          lastCalendarSyncTimeRef.current = Date.now();
          syncInactiveCalendar(request.sourceView, request.date);
        }, delay);
      },
      [syncInactiveCalendar],
    );

    useEffect(
      () => () => {
        cancelPendingCalendarSync();
        if (calendarResetFrameRef.current !== null) {
          cancelAnimationFrame(calendarResetFrameRef.current);
        }
        if (calendarResetGuardTimerRef.current) {
          clearTimeout(calendarResetGuardTimerRef.current);
        }
      },
      [cancelPendingCalendarSync],
    );

    const isResetMountCallback = useCallback((view: CalendarView) => {
      return calendarResetPendingViewsRef.current.has(view);
    }, []);

    const handleMonthlyFocusedMonthChange = useCallback(
      (month: string, date?: string) => {
        const nextFocusedDate = date ?? `${month}-01`;
        if (isResetMountCallback('monthly')) return;
        monthlyFocusedDateRef.current = nextFocusedDate;
        if (calendarViewRef.current !== 'monthly') return;
        activeFocusedDateRef.current = nextFocusedDate;
        setFocusedMonth(month);
        scheduleInactiveCalendarSync('monthly', nextFocusedDate);
      },
      [isResetMountCallback, scheduleInactiveCalendarSync],
    );
    const handleWeeklyFocusedMonthChange = useCallback(
      (month: string, date?: string) => {
        const nextFocusedDate = date ?? `${month}-01`;
        if (isResetMountCallback('weekly')) return;
        weeklyFocusedDateRef.current = nextFocusedDate;
        if (calendarViewRef.current !== 'weekly') return;
        activeFocusedDateRef.current = nextFocusedDate;
        setFocusedMonth(month);
        scheduleInactiveCalendarSync('weekly', nextFocusedDate);
      },
      [isResetMountCallback, scheduleInactiveCalendarSync],
    );
    const handleSelectDate = useCallback((date: string) => {
      activeFocusedDateRef.current = date;
      setSelectedDate(date);
      setDayModalVisible(true);
    }, []);

    const handleCalendarViewToggle = useCallback(() => {
      const nextView = calendarView === 'monthly' ? 'weekly' : 'monthly';
      const targetDate = activeFocusedDateRef.current;
      cancelPendingCalendarSync();
      calendarViewRef.current = nextView;
      setCalendarView(nextView);
      calendarViewProgress.value = withTiming(nextView === 'weekly' ? 1 : 0, {
        duration: motion.calendarViewTransitionDuration,
        easing: Easing.inOut(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      });
      syncInactiveCalendar(calendarView, targetDate);
    }, [
      calendarView,
      calendarViewProgress,
      cancelPendingCalendarSync,
      syncInactiveCalendar,
    ]);
    const finishCalendarReset = useCallback(() => {
      isCalendarResettingRef.current = false;
      setCalendarResetting(false);
    }, []);
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
      activeFocusedDateRef.current = today;
      monthlyFocusedDateRef.current = today;
      weeklyFocusedDateRef.current = today;
      calendarResetPendingViewsRef.current = new Set(['monthly', 'weekly']);
      if (calendarResetGuardTimerRef.current) {
        clearTimeout(calendarResetGuardTimerRef.current);
      }
      calendarResetGuardTimerRef.current = setTimeout(() => {
        calendarResetGuardTimerRef.current = null;
        calendarResetPendingViewsRef.current.clear();
      }, calendarResetFocusGuardDuration);
      setSelectedDate(null);
      setFocusedMonth(currentMonth);
      setCalendarResetKey((current) => current + 1);
      revealResetCalendar();
    }, [currentMonth, revealResetCalendar, today]);
    const handleReturnToToday = useCallback(() => {
      if (isCalendarResettingRef.current) return;
      isCalendarResettingRef.current = true;
      setCalendarResetting(true);
      cancelPendingCalendarSync();
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
    }, [calendarResetOpacity, cancelPendingCalendarSync, resetCalendarToToday]);
    const resetToToday = useCallback(() => {
      const isMonthlyOnCurrentMonth =
        monthlyFocusedDateRef.current.slice(0, 7) === currentMonth;
      const isWeeklyOnCurrentWeek =
        getCalendarWeek(weeklyFocusedDateRef.current)[0] ===
        getCalendarWeek(today)[0];
      if (isMonthlyOnCurrentMonth && isWeeklyOnCurrentWeek) return;
      resetCalendarToToday();
    }, [currentMonth, resetCalendarToToday, today]);
    useImperativeHandle(ref, () => ({ resetToToday }), [resetToToday]);

    return (
      <>
        <Screen
          contentContainerStyle={styles.screen}
          scrollable={false}
          testID="map-screen"
        >
          <View
            style={[
              styles.intro,
              { paddingHorizontal: layout.screenGutter[density] },
            ]}
            testID="map-header"
          >
            <Text accessibilityRole="header" variant="heading">
              Mapa
            </Text>
            <Text tone="secondary" variant="body">
              Mira tus movimientos de forma mensual o semanal, toca un día para
              ver los detalles.
            </Text>
            <View style={styles.controlsRow}>
              <View style={styles.monthTab} testID="map-month-tab">
                <Text variant="bodyStrong">
                  {focusedMonthLabel.month}{' '}
                  <Text tone="secondary" variant="bodyStrong" weight="light">
                    {focusedMonthLabel.year}
                  </Text>
                </Text>
              </View>
              <Pressable
                accessibilityHint={`Cambia a la vista ${
                  calendarView === 'monthly' ? 'semanal' : 'mensual'
                }`}
                accessibilityLabel={`Vista ${
                  calendarView === 'monthly' ? 'Mensual' : 'Semanal'
                }`}
                accessibilityRole="button"
                hitSlop={spacing.sm}
                onPress={handleCalendarViewToggle}
                style={({ pressed }) => [
                  styles.viewToggle,
                  pressed && styles.viewTogglePressed,
                ]}
                testID="map-calendar-view-toggle"
              >
                <Text variant="caption" weight="semibold">
                  {calendarView === 'monthly' ? 'Mensual' : 'Semanal'}
                </Text>
              </Pressable>
            </View>
          </View>

          <Animated.View
            pointerEvents={isCalendarResetting ? 'none' : 'auto'}
            style={[styles.calendarViewport, calendarResetStyle]}
            testID="map-calendar-viewport"
          >
            <Animated.View
              accessibilityElementsHidden={calendarView !== 'monthly'}
              importantForAccessibility={
                calendarView === 'monthly' ? 'auto' : 'no-hide-descendants'
              }
              pointerEvents={calendarView === 'monthly' ? 'auto' : 'none'}
              style={[
                styles.calendarLayer,
                monthlyCalendarStyle,
                calendarView === 'monthly'
                  ? styles.activeCalendarLayer
                  : styles.cachedCalendarLayer,
              ]}
              testID="map-calendar-view-monthly"
            >
              <AppCalendar
                key={`monthly-${calendarResetKey}`}
                ref={calendarRef}
                currentDate={today}
                markedDates={markedDates}
                mode="scroll"
                onFocusedMonthChange={handleMonthlyFocusedMonthChange}
                onSelectDate={handleSelectDate}
                rangeEndDate={maximumCalendarDate}
                selectedDate={selectedDate ?? undefined}
                testID="map-calendar"
              />
            </Animated.View>
            <Animated.View
              accessibilityElementsHidden={calendarView !== 'weekly'}
              importantForAccessibility={
                calendarView === 'weekly' ? 'auto' : 'no-hide-descendants'
              }
              pointerEvents={calendarView === 'weekly' ? 'auto' : 'none'}
              style={[
                styles.calendarLayer,
                weeklyCalendarStyle,
                calendarView === 'weekly'
                  ? styles.activeCalendarLayer
                  : styles.cachedCalendarLayer,
              ]}
              testID="map-calendar-view-weekly"
            >
              <WeeklyMovementCalendar
                key={`weekly-${calendarResetKey}`}
                categories={categories}
                currentDate={today}
                onFocusedMonthChange={handleWeeklyFocusedMonthChange}
                onOpenTransactionDetail={onOpenTransactionDetail}
                onSelectDate={handleSelectDate}
                ref={weeklyCalendarRef}
                selectedDate={selectedDate ?? undefined}
                testID="map-weekly-calendar"
                today={today}
                transactions={visibleTransactions}
              />
            </Animated.View>
          </Animated.View>

          {returnDirection ? (
            <Animated.View
              entering={returnButtonEntering}
              exiting={returnButtonExiting}
              style={[
                styles.returnButtonPosition,
                {
                  bottom:
                    insets.bottom +
                    layout.floatingActionTabOffset -
                    returnButtonVerticalAdjustment,
                },
              ]}
              testID="map-return-today-container"
            >
              <Pressable
                accessibilityHint="Desplaza el calendario hasta el mes actual"
                accessibilityLabel="Volver a hoy"
                accessibilityRole="button"
                disabled={isCalendarResetting}
                onPress={handleReturnToToday}
                style={({ pressed }) => [
                  styles.returnButton,
                  pressed && styles.returnButtonPressed,
                ]}
                testID="map-return-today-button"
              >
                {returnDirection === 'up' ? (
                  <CaretDoubleUp
                    color={colors.textPrimary}
                    size={iconSize.sm}
                    testID="map-return-direction-up"
                    weight="bold"
                  />
                ) : (
                  <CaretDoubleDown
                    color={colors.textPrimary}
                    size={iconSize.sm}
                    testID="map-return-direction-down"
                    weight="bold"
                  />
                )}
                <Text variant="footnote" weight="semibold">
                  Volver a hoy
                </Text>
              </Pressable>
            </Animated.View>
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
  intro: {
    gap: spacing.xs,
    paddingTop: spacing.huge,
  },
  controlsRow: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  monthTab: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  viewToggle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  viewTogglePressed: { opacity: 0.68 },
  calendarViewport: { flex: 1, position: 'relative' },
  calendarLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface,
  },
  activeCalendarLayer: { zIndex: 1 },
  cachedCalendarLayer: { zIndex: 0 },
  returnButtonPosition: {
    zIndex: 9,
    position: 'absolute',
    right: spacing.xl + layout.floatingActionSize + spacing.md,
    height: layout.floatingActionSize,
    justifyContent: 'center',
  },
  returnButton: {
    ...shadows.subtle,
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.round,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
  },
  returnButtonPressed: { opacity: 0.68 },
});
