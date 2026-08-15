import { type ReactNode, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg from 'react-native-svg';

import { AnimatedArcSegment } from '@/components/ui/Charts/AnimatedArcSegment';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/useTheme';
import { distributeDonutSegmentLengths } from '@/utils/donutGeometry';

type IncomeExpenseArcProps = {
  children?: ReactNode;
  expenseMinor: number;
  incomeMinor: number;
  /** Cambia (p. ej. al reenfocar la pantalla) para reiniciar el revelado. */
  resetKey?: number;
  testID?: string;
};

const arcWidth = 280;
const arcStrokeWidth = 18;
const arcRadius = (arcWidth - arcStrokeWidth) / 2;
const arcHeight = arcRadius + arcStrokeWidth;
const arcCenterY = arcRadius + arcStrokeWidth / 2;
const arcCircumference = 2 * Math.PI * arcRadius;
const arcHalfCircumference = arcCircumference / 2;
const segmentGap = spacing.xs;
const minimumDashLength = 1;
const minimumSegmentAllocation =
  arcStrokeWidth + segmentGap + minimumDashLength;
const contentMaxWidth = 220;
const contentBottomInset = spacing.sm;

type ArcSegment = {
  color: string;
  key: string;
  length: number;
  value: number;
};

/**
 * Arco de dos colores con la proporción de ingresos y gastos del periodo.
 * `children` se dibuja dentro del hueco del arco (anclado a su base), donde
 * normalmente se coloca el balance disponible.
 */
export function IncomeExpenseArc({
  children,
  expenseMinor,
  incomeMinor,
  resetKey,
  testID = 'income-expense-arc',
}: IncomeExpenseArcProps) {
  const { colors } = useTheme();
  const totalMinor = incomeMinor + expenseMinor;

  const segments = useMemo<ArcSegment[]>(() => {
    if (totalMinor <= 0) {
      return [];
    }

    const lengths = distributeDonutSegmentLengths(
      [incomeMinor, expenseMinor],
      arcHalfCircumference,
      minimumSegmentAllocation,
    );

    return [
      {
        color: colors.income,
        key: 'income',
        length: lengths[0]!,
        value: incomeMinor,
      },
      {
        color: colors.expense,
        key: 'expense',
        length: lengths[1]!,
        value: expenseMinor,
      },
    ].filter((segment) => segment.value > 0);
  }, [colors.expense, colors.income, expenseMinor, incomeMinor, totalMinor]);

  if (segments.length === 0) {
    return <>{children}</>;
  }

  const incomePercentage = Math.round((incomeMinor / totalMinor) * 100);
  const expensePercentage = 100 - incomePercentage;

  let accumulatedLength = 0;

  return (
    <View style={styles.container} testID={testID}>
      <View
        accessibilityLabel={`Ingresos ${incomePercentage}%, gastos ${expensePercentage}% de este mes`}
        accessible
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      >
        <Svg
          accessibilityElementsHidden
          height={arcHeight}
          importantForAccessibility="no-hide-descendants"
          testID={`${testID}-svg`}
          width={arcWidth}
        >
          {segments.map((segment, index) => {
            // Solo los segmentos que no son el último reservan hueco para el
            // límite redondeado y el hueco visible con el siguiente segmento:
            // el último debe llegar hasta el extremo abierto del arco para
            // que ambos lados queden a la misma altura.
            const isLastSegment = index === segments.length - 1;
            const dashLength = isLastSegment
              ? segment.length
              : Math.max(
                  segment.length - arcStrokeWidth - segmentGap,
                  minimumDashLength,
                );
            const dashOffset = -accumulatedLength;
            accumulatedLength += segment.length;

            return (
              <AnimatedArcSegment
                animationKey={`${incomeMinor}-${expenseMinor}-${resetKey ?? 0}`}
                circumference={arcCircumference}
                color={segment.color}
                cx={arcWidth / 2}
                cy={arcCenterY}
                dashLength={dashLength}
                dashOffset={dashOffset}
                index={index}
                key={segment.key}
                radius={arcRadius}
                rotation={180}
                strokeWidth={arcStrokeWidth}
                testID={`${testID}-segment-${segment.key}`}
              />
            );
          })}
        </Svg>
      </View>
      <View style={styles.content}>
        <View style={styles.contentInner}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    height: arcHeight,
    width: arcWidth,
  },
  content: {
    alignItems: 'center',
    bottom: contentBottomInset,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  contentInner: {
    alignItems: 'center',
    maxWidth: contentMaxWidth,
  },
});
