import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  type EntryExitAnimationFunction,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg from 'react-native-svg';

import { AnimatedArcSegment } from '@/components/ui/Charts/AnimatedArcSegment';
import { chartStrokeWidth } from '@/components/ui/Charts/chartTokens';
import { MonthNavigator } from '@/components/ui/MonthNavigator/MonthNavigator';
import { Text } from '@/components/ui/Text/Text';
import type { Category } from '@/features/categories/types';
import {
  formatMonthKey,
  getCurrentMonthKey,
  listTransactionsByMonth,
  shiftMonthKey,
  summarizeCategories,
} from '@/features/categories/utils/categorySummary';
import type { SessionTransaction } from '@/features/transactions/types';
import {
  defaultCurrencyCode,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import { formatCurrency } from '@/lib/currency/formatCurrency';
import { categoryColors } from '@/theme/categoryColors';
import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useThemedStyles } from '@/theme/useThemedStyles';
import { distributeDonutSegmentLengths } from '@/utils/donutGeometry';

type ChartMode = 'expense' | 'income';

type CategoryDonutChartProps = {
  categories: readonly Category[];
  currency?: CurrencyCode;
  onOpenCategoryDetail?: (categoryId: string) => void;
  /** Cambia (p. ej. al reenfocar la pantalla) para reiniciar el revelado. */
  resetKey?: number;
  transactions: readonly SessionTransaction[];
};

const chartSize = 236;
const chartRadius = (chartSize - chartStrokeWidth) / 2;
const chartCircumference = 2 * Math.PI * chartRadius;
const segmentVisibleGap = spacing.md;
const minimumDashLength = 1;
const minimumSegmentAllocation =
  chartStrokeWidth + segmentVisibleGap + minimumDashLength;
const legendDotSize = 10;
const segmentedControlWidth = 216;
const segmentVisualHeight = 32;
const segmentControlPadding = spacing.xs;
const segmentIndicatorWidth =
  (segmentedControlWidth - segmentControlPadding * 2) / 2;

type MotionDirection = -1 | 1;

const chartSpringConfig = {
  damping: motion.chartModeSpring.damping,
  mass: motion.chartModeSpring.mass,
  stiffness: motion.chartModeSpring.stiffness,
  reduceMotion: ReduceMotion.System,
};
const chartTimingConfig = {
  duration: motion.chartContentExitDuration,
  easing: Easing.inOut(Easing.cubic),
  reduceMotion: ReduceMotion.System,
};

export function getChartContentEntering(
  direction: MotionDirection,
  delay: number = motion.chartContentEnterDelay,
): EntryExitAnimationFunction {
  return () => {
    'worklet';
    const delayedSpring = (value: number) =>
      withDelay(
        delay,
        withSpring(value, chartSpringConfig),
        ReduceMotion.System,
      );
    const delayedOpacity = withDelay(
      delay,
      withTiming(1, {
        duration: motion.chartContentFadeDuration,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }),
      ReduceMotion.System,
    );

    return {
      initialValues: {
        opacity: 0,
        transform: [
          { translateX: direction * motion.chartContentTravel },
          { translateY: spacing.md },
        ],
      },
      animations: {
        opacity: delayedOpacity,
        transform: [
          { translateX: delayedSpring(0) },
          { translateY: delayedSpring(0) },
        ],
      },
    };
  };
}

export function getChartContentExiting(
  direction: MotionDirection,
): EntryExitAnimationFunction {
  return () => {
    'worklet';
    return {
      initialValues: {
        opacity: 1,
        transform: [{ translateX: 0 }, { translateY: 0 }],
      },
      animations: {
        opacity: withTiming(0, chartTimingConfig),
        transform: [
          {
            translateX: withTiming(
              direction * motion.chartContentTravel,
              chartTimingConfig,
            ),
          },
          { translateY: withTiming(-spacing.sm, chartTimingConfig) },
        ],
      },
    };
  };
}

const chartLayoutTransition = LinearTransition.springify()
  .damping(motion.chartModeSpring.damping)
  .mass(motion.chartModeSpring.mass)
  .stiffness(motion.chartModeSpring.stiffness)
  .reduceMotion(ReduceMotion.System);

export function CategoryDonutChart({
  categories,
  currency = defaultCurrencyCode,
  onOpenCategoryDetail,
  resetKey,
  transactions,
}: CategoryDonutChartProps) {
  const styles = useThemedStyles(createStyles);
  const [mode, setMode] = useState<ChartMode>('expense');
  const currentMonthKey = getCurrentMonthKey();
  const [monthKey, setMonthKey] = useState(currentMonthKey);
  const monthCategories = useMemo(
    () =>
      summarizeCategories(
        categories,
        listTransactionsByMonth(transactions, monthKey),
      ),
    [categories, monthKey, transactions],
  );
  const data = useMemo(() => {
    const valueKey = mode === 'expense' ? 'expenseMinor' : 'incomeMinor';
    const items = monthCategories
      .map((category) => ({
        ...category,
        valueMinor: category[valueKey],
      }))
      .filter((category) => category.valueMinor > 0)
      .sort((left, right) => right.valueMinor - left.valueMinor);
    const totalMinor = items.reduce(
      (total, category) => total + category.valueMinor,
      0,
    );

    return { items, totalMinor };
  }, [mode, monthCategories]);
  const formattedTotal = formatCurrency(data.totalMinor, currency, 'es-ES');
  const segmentLengths = useMemo(
    () =>
      distributeDonutSegmentLengths(
        data.items.map((category) => category.valueMinor),
        chartCircumference,
        minimumSegmentAllocation,
      ),
    [data.items],
  );
  const modeLabel = mode === 'expense' ? 'gastado' : 'ingresado';
  const motionDirection: MotionDirection = mode === 'expense' ? -1 : 1;
  const emptyMessage = `Para ver ${
    mode === 'expense' ? 'gastos' : 'ingresos'
  } por categoría, registra un ${
    mode === 'expense' ? 'gasto' : 'ingreso'
  } y asócialo a una categoría.`;

  let accumulatedLength = 0;

  const modeIndicatorPosition = useSharedValue(
    mode === 'expense' ? 0 : segmentIndicatorWidth,
  );

  useEffect(() => {
    modeIndicatorPosition.value = withSpring(
      mode === 'expense' ? 0 : segmentIndicatorWidth,
      {
        ...motion.chartModeSpring,
        reduceMotion: ReduceMotion.System,
      },
    );
  }, [mode, modeIndicatorPosition]);

  const modeIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: modeIndicatorPosition.value }],
  }));

  return (
    <View style={styles.card} testID="category-donut-chart">
      <MonthNavigator
        label={formatMonthKey(monthKey)}
        nextAccessibilityLabel="Ver mes siguiente"
        nextDisabled={monthKey === currentMonthKey}
        onNext={() => setMonthKey((current) => shiftMonthKey(current, 1))}
        onPrevious={() => setMonthKey((current) => shiftMonthKey(current, -1))}
        previousAccessibilityLabel="Ver mes anterior"
        style={styles.monthNavigator}
      />

      <View
        accessibilityRole="tablist"
        style={styles.segmentedControl}
        testID="category-mode-control"
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.segmentIndicator, modeIndicatorStyle]}
          testID="category-mode-indicator"
        />
        {(['expense', 'income'] as const).map((option) => {
          const selected = mode === option;
          const label = option === 'expense' ? 'Gastos' : 'Ingresos';

          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              hitSlop={{ bottom: spacing.sm, top: spacing.sm }}
              key={option}
              onPress={() => setMode(option)}
              style={({ pressed }) => [
                styles.segment,
                pressed ? styles.segmentPressed : null,
              ]}
            >
              <Text
                align="center"
                tone={selected ? 'primary' : 'secondary'}
                variant="label"
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View
        accessibilityLabel={
          data.items.length === 0
            ? emptyMessage
            : `Total ${modeLabel}: ${formattedTotal}. ${data.items
                .map((category) => {
                  const percentage = Math.round(
                    (category.valueMinor / data.totalMinor) * 100,
                  );
                  return `${category.name}: ${percentage}%`;
                })
                .join(', ')}`
        }
        accessible
        style={styles.chartArea}
      >
        <Svg
          accessibilityElementsHidden
          height={chartSize}
          importantForAccessibility="no-hide-descendants"
          testID="category-donut-svg"
          width={chartSize}
        >
          {data.items.map((category, index) => {
            const segmentLength = segmentLengths[index]!;
            const dashLength = Math.max(
              segmentLength - chartStrokeWidth - segmentVisibleGap,
              minimumDashLength,
            );
            const dashOffset = -accumulatedLength;
            accumulatedLength += segmentLength;

            return (
              <AnimatedArcSegment
                animationKey={`${mode}-${monthKey}-${resetKey ?? 0}`}
                circumference={chartCircumference}
                color={categoryColors[category.colorToken]}
                cx={chartSize / 2}
                cy={chartSize / 2}
                dashLength={dashLength}
                dashOffset={dashOffset}
                index={index}
                key={category.id}
                radius={chartRadius}
                rotation={-90}
                strokeWidth={chartStrokeWidth}
                testID={`category-donut-segment-${category.id}`}
              />
            );
          })}
        </Svg>
        <Animated.View
          entering={getChartContentEntering(motionDirection)}
          exiting={getChartContentExiting(motionDirection)}
          key={`${mode}-${monthKey}-${data.items.length > 0 ? 'total' : 'empty'}`}
          pointerEvents="none"
          style={styles.chartCenter}
          testID="category-chart-center-content"
        >
          {data.items.length > 0 ? (
            <>
              <Text tone="secondary" variant="footnote">
                Total {modeLabel}
              </Text>
              <Text
                adjustsFontSizeToFit
                numberOfLines={1}
                style={styles.total}
                variant="heading"
              >
                {formattedTotal}
              </Text>
            </>
          ) : (
            <Text align="center" tone="secondary" variant="footnote">
              {emptyMessage}
            </Text>
          )}
        </Animated.View>
      </View>

      {data.items.length > 0 && (
        <Animated.View
          entering={getChartContentEntering(motionDirection)}
          exiting={getChartContentExiting(motionDirection)}
          key={`${mode}-${monthKey}-legend`}
          layout={chartLayoutTransition}
          style={styles.legend}
          testID="category-chart-legend"
        >
          {data.items.map((category, index) => {
            const percentage = Math.round(
              (category.valueMinor / data.totalMinor) * 100,
            );

            return (
              <Animated.View
                entering={getChartContentEntering(
                  motionDirection,
                  motion.chartContentEnterDelay +
                    index * motion.chartContentStagger,
                )}
                exiting={getChartContentExiting(motionDirection)}
                key={`${mode}-${monthKey}-${category.id}`}
                layout={chartLayoutTransition}
                style={styles.legendItemContainer}
                testID={`category-chart-badge-${category.id}`}
              >
                <Pressable
                  accessibilityHint="Abre el detalle de la categoría"
                  accessibilityLabel={`Abrir detalle de ${category.name}, ${percentage}%`}
                  accessibilityRole="button"
                  disabled={!onOpenCategoryDetail}
                  onPress={() => onOpenCategoryDetail?.(category.id)}
                  style={({ pressed }) => [
                    styles.legendItem,
                    pressed ? styles.legendItemPressed : null,
                  ]}
                >
                  <View
                    style={[
                      styles.legendDot,
                      {
                        backgroundColor: categoryColors[category.colorToken],
                      },
                    ]}
                  />
                  <Text numberOfLines={1} variant="footnote">
                    {category.name} · {percentage}%
                  </Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </Animated.View>
      )}
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    card: { alignItems: 'center' },
    monthNavigator: { marginBottom: spacing.md },
    segmentedControl: {
      width: segmentedControlWidth,
      flexDirection: 'row',
      backgroundColor: colors.keypad,
      borderRadius: radii.round,
      padding: segmentControlPadding,
    },
    segmentIndicator: {
      position: 'absolute',
      top: segmentControlPadding,
      bottom: segmentControlPadding,
      left: segmentControlPadding,
      width: segmentIndicatorWidth,
      backgroundColor: colors.surface,
      borderRadius: radii.round,
    },
    segment: {
      height: segmentVisualHeight,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
      zIndex: 1,
    },
    segmentPressed: { opacity: 0.64 },
    chartArea: {
      width: chartSize,
      height: chartSize,
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: spacing.lg,
    },
    chartCenter: {
      position: 'absolute',
      width: chartSize - chartStrokeWidth * 3,
      alignItems: 'center',
    },
    total: { width: '100%', marginTop: spacing.xs, textAlign: 'center' },
    legend: {
      width: '100%',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.background,
      borderRadius: radii.round,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    legendItemContainer: { maxWidth: '100%' },
    legendItemPressed: { backgroundColor: colors.surfaceMuted },
    legendDot: {
      width: legendDotSize,
      height: legendDotSize,
      borderRadius: radii.round,
    },
  });
}
