import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type ViewToken,
} from 'react-native';
import { Text } from '@/components/ui/Text/Text';
import {
  CategoryPreviewCard,
  compactCardMinHeight,
} from '@/features/categories/components/CategoryPreviewCard/CategoryPreviewCard';
import type { Category } from '@/features/categories/types';
import type { SessionTransaction } from '@/features/transactions/types';
import {
  getCalendarWeek,
  getWeeksInCalendarRange,
  parseCalendarDate,
  shouldShowWeekMonthLabel,
} from '@/features/map/model/calendarPeriods';
import {
  maximumCalendarDate,
  minimumCalendarDate,
} from '@/lib/date/monthDistance';
import { colors } from '@/theme/colors';
import { layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';

type WeeklyMovementCalendarProps = {
  categories: readonly Category[];
  currentDate: string;
  onFocusedMonthChange?: (month: string, date?: string) => void;
  onOpenTransactionDetail?: (transactionId: string) => void;
  onSelectDate: (date: string) => void;
  selectedDate?: string;
  testID: string;
  today?: string;
  transactions: readonly SessionTransaction[];
};

export type WeeklyMovementCalendarHandle = {
  scrollToDate: (date: string) => void;
  scrollToToday: () => void;
};

const weekdayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Lun-Dom es fijo fuera de la lista, igual que en la vista mensual de
// AppCalendar: un hermano normal por encima del `FlatList`, no un overlay
// sincronizado con el scroll. Los días vuelven a repetirse cada semana; solo
// el nombre del día ya no lo hace.
function WeekdayHeaderRow() {
  return (
    <View style={styles.weekdayHeaderRow}>
      {weekdayLabels.map((label) => (
        <View key={label} style={styles.weekdayHeaderColumn}>
          <Text
            align="center"
            style={styles.weekdayHeaderLabel}
            tone="secondary"
            variant="footnote"
          >
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export {
  formatWeekMonthLabel,
  getCalendarWeek as getWeekDates,
  getWeeksInCalendarRange,
} from '@/features/map/model/calendarPeriods';

const scrollRetryDelay = 50;

// Igual que `calendarMonthHeight` en AppCalendar, pero aquí la altura de cada
// fila varía según cuántos movimientos tiene su día más cargado: sin
// `getItemLayout`, FlatList solo puede *adivinar* la posición de una semana a
// partir del alto medio de lo que ya renderizó, y con filas tan dispares (una
// semana vacía vs. una con varios movimientos) ese promedio se desvía tanto
// que el scroll termina saltando a cualquier punto de la lista (típicamente
// el tope, enero de 2024). Calculamos el alto real a partir de los mismos
// tokens que usa el render, así el cálculo nunca se desincroniza del layout.
const dayColumnBaseHeight = layout.minTouchTarget + spacing.sm;

function getDayColumnHeight(cardCount: number): number {
  if (cardCount === 0) return dayColumnBaseHeight;
  return (
    dayColumnBaseHeight +
    cardCount * compactCardMinHeight +
    (cardCount - 1) * spacing.xs
  );
}

function getWeekRowHeight(maxCardCount: number): number {
  return spacing.xl + getDayColumnHeight(maxCardCount) + spacing.xl;
}

// Una semana que cruza de mes se ancla al mes que introduce (sus últimos
// días), no al jueves: así la semana de transición ya cuenta como el mes
// actual en vez de arrastrar el mes anterior.
function getWeekMonthAnchorDate(week: readonly string[]): string {
  const crossesMonth = week[0]!.slice(0, 7) !== week[6]!.slice(0, 7);
  return crossesMonth ? week[6]! : week[3]!;
}

function getMonthIntroductionWeekIndex(
  weeks: readonly (readonly string[])[],
  date: string,
): number {
  const currentWeekIndex = weeks.findIndex((week) => week.includes(date));
  if (currentWeekIndex < 0) return 0;

  for (let index = currentWeekIndex; index >= 0; index -= 1) {
    if (shouldShowWeekMonthLabel(weeks, index)) return index;
  }

  return currentWeekIndex;
}

export const WeeklyMovementCalendar = memo(
  forwardRef<WeeklyMovementCalendarHandle, WeeklyMovementCalendarProps>(
    function WeeklyMovementCalendar(
      {
        categories,
        currentDate,
        onFocusedMonthChange,
        onOpenTransactionDetail,
        onSelectDate,
        selectedDate,
        testID,
        today,
        transactions,
      },
      ref,
    ) {
      const initialDate = useRef(currentDate).current;
      const calendarToday = today ?? initialDate;
      const listRef = useRef<FlatList<readonly string[]>>(null);
      const pendingScrollIndex = useRef<number | null>(null);
      const scrollRetryTimer = useRef<ReturnType<typeof setTimeout> | null>(
        null,
      );
      // Todo el rango pasado (acotado por minimumCalendarDate, unos pocos
      // años) se mantiene siempre en `data`, igual que en AppCalendar: así no
      // hace falta ninguna carga en caliente al desplazarse hacia meses
      // anteriores, que era lo que causaba el glitch (cada lote cargado
      // disparaba un cambio de estado que reflowaba la lista entera).
      const weeks = useMemo(
        () => getWeeksInCalendarRange(minimumCalendarDate, maximumCalendarDate),
        [],
      );
      const initialWeekIndex = useMemo(
        () => getMonthIntroductionWeekIndex(weeks, initialDate),
        [initialDate, weeks],
      );
      const weekIndexByStart = useMemo(
        () => new Map(weeks.map((week, index) => [week[0]!, index])),
        [weeks],
      );
      const categoriesById = useMemo(
        () => new Map(categories.map((category) => [category.id, category])),
        [categories],
      );
      const transactionsByDate = useMemo(() => {
        const grouped = new Map<string, SessionTransaction[]>();
        for (const transaction of transactions) {
          const dayTransactions = grouped.get(transaction.occurredOn) ?? [];
          dayTransactions.push(transaction);
          grouped.set(transaction.occurredOn, dayTransactions);
        }
        return grouped;
      }, [transactions]);
      const weekLayouts = useMemo(() => {
        const layouts: { index: number; length: number; offset: number }[] =
          new Array(weeks.length);
        let offset = 0;
        weeks.forEach((week, index) => {
          const maxCardCount = week.reduce(
            (max, date) =>
              Math.max(max, transactionsByDate.get(date)?.length ?? 0),
            0,
          );
          const length = getWeekRowHeight(maxCardCount);
          layouts[index] = { index, length, offset };
          offset += length;
        });
        return layouts;
      }, [weeks, transactionsByDate]);
      const getItemLayout = useCallback(
        (_: unknown, index: number) => weekLayouts[index]!,
        [weekLayouts],
      );
      const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 });
      const onFocusedMonthChangeRef = useRef(onFocusedMonthChange);
      onFocusedMonthChangeRef.current = onFocusedMonthChange;
      const handleViewableItemsChanged = useCallback(
        ({
          viewableItems,
        }: {
          viewableItems: ViewToken<readonly string[]>[];
        }) => {
          const focusedWeek = viewableItems.find(
            (viewableItem) => viewableItem.isViewable,
          )?.item;
          const focusedDate = focusedWeek
            ? getWeekMonthAnchorDate(focusedWeek)
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
            const index = weekIndexByStart.get(getCalendarWeek(date)[0]!) ?? -1;
            scrollToFullIndex(index, false);
          },
          scrollToToday: () => {
            const index =
              weekIndexByStart.get(getCalendarWeek(calendarToday)[0]!) ?? -1;
            scrollToFullIndex(index, true);
          },
        }),
        [calendarToday, scrollToFullIndex, weekIndexByStart],
      );

      return (
        <View style={styles.container}>
          <WeekdayHeaderRow />
          <FlatList
            contentContainerStyle={styles.listContent}
            data={weeks}
            getItemLayout={getItemLayout}
            initialNumToRender={6}
            initialScrollIndex={initialWeekIndex}
            keyExtractor={(week) => week[0]!}
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
            renderItem={({ item: week }) => {
              return (
                <View
                  style={styles.weekBlock}
                  testID={`${testID}-week-${week[0]}`}
                >
                  <View style={styles.weekRow}>
                    {week.map((date, dayIndex) => {
                      const dayTransactions =
                        transactionsByDate.get(date) ?? [];
                      const selected = selectedDate === date;
                      const isCurrentDate = calendarToday === date;
                      return (
                        <View key={date} style={styles.dayColumn}>
                          <Pressable
                            accessibilityLabel={`${weekdayLabels[dayIndex]} ${parseCalendarDate(date).getDate()}`}
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
                                isCurrentDate && !selected && styles.currentDay,
                                selected && styles.selectedDay,
                              ]}
                            >
                              <Text
                                align="center"
                                tone={selected ? 'onBrand' : 'primary'}
                                variant="body"
                              >
                                {parseCalendarDate(date).getDate()}
                              </Text>
                            </View>
                          </Pressable>
                          <View style={styles.movementList}>
                            {dayTransactions.map((transaction) => {
                              const category = categoriesById.get(
                                transaction.categoryId,
                              );
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
                                      ? () =>
                                          onOpenTransactionDetail(
                                            transaction.id,
                                          )
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
            }}
            showsVerticalScrollIndicator={false}
            style={styles.list}
            testID={testID}
            updateCellsBatchingPeriod={16}
            viewabilityConfig={viewabilityConfig.current}
            windowSize={9}
          />
        </View>
      );
    },
  ),
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  weekdayHeaderRow: {
    flexDirection: 'row',
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
  },
  weekdayHeaderColumn: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.xxs,
  },
  weekdayHeaderLabel: { marginBottom: spacing.lg },
  list: { flex: 1, backgroundColor: colors.surface },
  listContent: {
    backgroundColor: colors.surface,
    paddingBottom: layout.floatingActionClearance,
  },
  weekBlock: {
    backgroundColor: colors.surface,
    paddingBottom: spacing.xl,
  },
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
  currentDay: {
    borderColor: colors.cta,
    borderWidth: 1,
  },
  selectedDay: { backgroundColor: colors.cta },
  movementList: { gap: spacing.xs },
  pressed: { opacity: 0.64 },
});
