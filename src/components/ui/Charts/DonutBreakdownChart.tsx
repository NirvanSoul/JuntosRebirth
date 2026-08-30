import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  LinearTransition,
  ReduceMotion,
} from 'react-native-reanimated';
import Svg from 'react-native-svg';

import { AnimatedArcSegment } from '@/components/ui/Charts/AnimatedArcSegment';
import { chartStrokeWidth } from '@/components/ui/Charts/chartTokens';
import {
  getChartContentEntering,
  getChartContentExiting,
  type MotionDirection,
} from '@/components/ui/Charts/donutChartAnimations';
import { MonthNavigator } from '@/components/ui/MonthNavigator/MonthNavigator';
import { SegmentedControl } from '@/components/ui/SegmentedControl/SegmentedControl';
import { Text } from '@/components/ui/Text/Text';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { formatCurrency } from '@/lib/currency/formatCurrency';
import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useThemedStyles } from '@/theme/useThemedStyles';
import { distributeDonutSegmentLengths } from '@/utils/donutGeometry';

export type DonutBreakdownMode = 'expense' | 'income';

/** Una porción del donut. El importe manda: a más dinero, más arco. */
export type DonutBreakdownSlice = {
  color: string;
  id: string;
  label: string;
  valueMinor: number;
};

type DonutBreakdownChartProps = {
  currency: CurrencyCode;
  /** Sustituye al total cuando el mes y el modo elegidos no tienen importes. */
  emptyMessage: string;
  /** Identifica la variante y prefija sus testID: `category`, `account`. */
  idPrefix: string;
  /** Bloquea la navegación hacia meses futuros. */
  isCurrentMonth: boolean;
  mode: DonutBreakdownMode;
  monthLabel: string;
  onModeChange: (mode: DonutBreakdownMode) => void;
  onMonthChange: (offset: -1 | 1) => void;
  onSlicePress?: (id: string) => void;
  /** Cambia (p. ej. al reenfocar la pantalla) para reiniciar el revelado. */
  resetKey?: number;
  /** Pista de cada badge: «Abre el detalle de la cuenta». */
  slicePressHint?: string;
  /** Sin ordenar: la gráfica descarta los ceros y ordena de mayor a menor. */
  slices: readonly DonutBreakdownSlice[];
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

const chartLayoutTransition = LinearTransition.springify()
  .damping(motion.chartModeSpring.damping)
  .mass(motion.chartModeSpring.mass)
  .stiffness(motion.chartModeSpring.stiffness)
  .reduceMotion(ReduceMotion.System);

/**
 * Donut de reparto: un anillo segmentado por color, el total al centro y una
 * leyenda de badges pulsables con el porcentaje de cada porción. No sabe de
 * dónde salen los importes —categorías, cuentas o lo que venga después—, solo
 * los reparte; quien lo usa le entrega las porciones ya calculadas.
 */
export function DonutBreakdownChart({
  currency,
  emptyMessage,
  idPrefix,
  isCurrentMonth,
  mode,
  monthLabel,
  onModeChange,
  onMonthChange,
  onSlicePress,
  resetKey,
  slicePressHint,
  slices,
}: DonutBreakdownChartProps) {
  const styles = useThemedStyles(createStyles);
  const data = useMemo(() => {
    const items = slices
      .filter((slice) => slice.valueMinor > 0)
      .sort((left, right) => right.valueMinor - left.valueMinor);
    const totalMinor = items.reduce(
      (total, slice) => total + slice.valueMinor,
      0,
    );

    return { items, totalMinor };
  }, [slices]);
  const formattedTotal = formatCurrency(data.totalMinor, currency, 'es-ES');
  const segmentLengths = useMemo(
    () =>
      distributeDonutSegmentLengths(
        data.items.map((slice) => slice.valueMinor),
        chartCircumference,
        minimumSegmentAllocation,
      ),
    [data.items],
  );
  const modeLabel = mode === 'expense' ? 'gastado' : 'ingresado';
  const motionDirection: MotionDirection = mode === 'expense' ? -1 : 1;
  const animationKey = `${mode}-${monthLabel}`;

  let accumulatedLength = 0;

  return (
    <View style={styles.card} testID={`${idPrefix}-donut-chart`}>
      <MonthNavigator
        label={monthLabel}
        nextAccessibilityLabel="Ver mes siguiente"
        nextDisabled={isCurrentMonth}
        onNext={() => onMonthChange(1)}
        onPrevious={() => onMonthChange(-1)}
        previousAccessibilityLabel="Ver mes anterior"
        style={styles.monthNavigator}
      />

      <SegmentedControl
        indicatorTestID={`${idPrefix}-mode-indicator`}
        onChange={onModeChange}
        options={[
          { label: 'Gastos', value: 'expense' },
          { label: 'Ingresos', value: 'income' },
        ]}
        selectedValue={mode}
        style={styles.segmentedControl}
        testID={`${idPrefix}-mode-control`}
      />

      <View
        accessibilityLabel={
          data.items.length === 0
            ? emptyMessage
            : `Total ${modeLabel}: ${formattedTotal}. ${data.items
                .map((slice) => {
                  const percentage = Math.round(
                    (slice.valueMinor / data.totalMinor) * 100,
                  );
                  return `${slice.label}: ${percentage}%`;
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
          testID={`${idPrefix}-donut-svg`}
          width={chartSize}
        >
          {data.items.map((slice, index) => {
            const segmentLength = segmentLengths[index]!;
            const dashLength = Math.max(
              segmentLength - chartStrokeWidth - segmentVisibleGap,
              minimumDashLength,
            );
            const dashOffset = -accumulatedLength;
            accumulatedLength += segmentLength;

            return (
              <AnimatedArcSegment
                animationKey={`${animationKey}-${resetKey ?? 0}`}
                circumference={chartCircumference}
                color={slice.color}
                cx={chartSize / 2}
                cy={chartSize / 2}
                dashLength={dashLength}
                dashOffset={dashOffset}
                index={index}
                key={slice.id}
                radius={chartRadius}
                rotation={-90}
                strokeWidth={chartStrokeWidth}
                testID={`${idPrefix}-donut-segment-${slice.id}`}
              />
            );
          })}
        </Svg>
        <Animated.View
          entering={getChartContentEntering(motionDirection)}
          exiting={getChartContentExiting(motionDirection)}
          key={`${animationKey}-${data.items.length > 0 ? 'total' : 'empty'}`}
          pointerEvents="none"
          style={styles.chartCenter}
          testID={`${idPrefix}-chart-center-content`}
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
          key={`${animationKey}-legend`}
          layout={chartLayoutTransition}
          style={styles.legend}
          testID={`${idPrefix}-chart-legend`}
        >
          {data.items.map((slice, index) => {
            const percentage = Math.round(
              (slice.valueMinor / data.totalMinor) * 100,
            );

            return (
              <Animated.View
                entering={getChartContentEntering(
                  motionDirection,
                  motion.chartContentEnterDelay +
                    index * motion.chartContentStagger,
                )}
                exiting={getChartContentExiting(motionDirection)}
                key={`${animationKey}-${slice.id}`}
                layout={chartLayoutTransition}
                style={styles.legendItemContainer}
                testID={`${idPrefix}-chart-badge-${slice.id}`}
              >
                <Pressable
                  accessibilityHint={slicePressHint}
                  accessibilityLabel={`Abrir detalle de ${slice.label}, ${percentage}%`}
                  accessibilityRole="button"
                  disabled={!onSlicePress}
                  onPress={() => onSlicePress?.(slice.id)}
                  style={({ pressed }) => [
                    styles.legendItem,
                    pressed ? styles.legendItemPressed : null,
                  ]}
                >
                  <View
                    style={[styles.legendDot, { backgroundColor: slice.color }]}
                  />
                  <Text numberOfLines={1} variant="footnote">
                    {slice.label} · {percentage}%
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
    card: {
      alignItems: 'center',
    },
    monthNavigator: {
      marginBottom: spacing.md,
    },
    segmentedControl: {
      width: segmentedControlWidth,
    },
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
    total: {
      width: '100%',
      marginTop: spacing.xs,
      textAlign: 'center',
    },
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
      backgroundColor: colors.surface,
      borderColor: colors.categoryPreviewBorder,
      borderRadius: radii.round,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    legendItemContainer: {
      maxWidth: '100%',
    },
    legendItemPressed: {
      backgroundColor: colors.surfaceMuted,
    },
    legendDot: {
      width: legendDotSize,
      height: legendDotSize,
      borderRadius: radii.round,
    },
  });
}
