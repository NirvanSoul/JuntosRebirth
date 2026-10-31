import Ionicons from '@expo/vector-icons/Ionicons';
import { CaretDown } from 'phosphor-react-native/src/icons/CaretDown';
import { CaretUp } from 'phosphor-react-native/src/icons/CaretUp';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/Text/Text';
import type { PeriodComparisonResult } from '@/features/transactions/utils/periodComparison';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { useCurrencySymbolPreference } from '@/state/appPreferences/CurrencySymbolPreferenceProvider';
import { iconSize } from '@/theme/layout';
import { motion } from '@/theme/motion';
import { spacing } from '@/theme/spacing';
import type { TextVariant } from '@/theme/typography';
import { useTheme } from '@/theme/useTheme';

const comparisonHoldDuration =
  motion.summaryComparisonDisplayDuration -
  motion.summaryComparisonTransitionDuration * 2;

/** Importe de la diferencia, sin signo: la flecha ya indica la dirección. */
export function useComparisonAmount(
  comparison: PeriodComparisonResult | undefined,
  currency: CurrencyCode,
): string {
  const { formatCurrency } = useCurrencySymbolPreference();
  return comparison
    ? formatCurrency(Math.abs(comparison.changeMinor), currency, 'es-ES')
    : '';
}

/** «30,00 € menos»: la diferencia exacta, sin depender de un porcentaje. */
export function formatComparisonAmount(
  comparison: PeriodComparisonResult,
  amount: string,
): string {
  if (comparison.direction === 'flat') return 'Sin cambios';
  return `${amount} ${comparison.direction === 'up' ? 'más' : 'menos'}`;
}

export function describeComparison(
  comparison: PeriodComparisonResult,
  amount: string,
): string {
  if (comparison.direction === 'flat') {
    return 'sin cambios respecto al periodo anterior';
  }

  return `${amount} ${comparison.direction === 'up' ? 'más' : 'menos'} que el periodo anterior`;
}

/**
 * Diferencia con una flecha fija a su izquierda: la dirección se entiende sin
 * depender de la animación del icono, que solo la refuerza.
 */
export function ComparisonAmount({
  amount,
  comparison,
  testID,
  variant,
}: {
  amount: string;
  comparison: PeriodComparisonResult;
  testID?: string;
  variant: TextVariant;
}) {
  const { colors } = useTheme();
  const Caret =
    comparison.direction === 'up'
      ? CaretUp
      : comparison.direction === 'down'
        ? CaretDown
        : null;

  return (
    <View style={styles.percent}>
      {Caret ? (
        <Caret
          color={colors.textPrimary}
          size={iconSize.xs}
          testID={testID}
          weight="bold"
        />
      ) : null}
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        numberOfLines={1}
        style={styles.amount}
        variant={variant}
        weight="semibold"
      >
        {formatComparisonAmount(comparison, amount)}
      </Text>
    </View>
  );
}

/**
 * Alterna importe y comparativa en el hilo de UI: 11 s el importe y 5,5 s la
 * comparativa. Un único reloj mantiene sincronizados los tres badges.
 */
export function useComparisonCycle(enabled: boolean) {
  const progress = useSharedValue<number>(0);
  const travel = useSharedValue<number>(0);

  useEffect(() => {
    if (!enabled) {
      progress.set(0);
      travel.set(0);
      return;
    }

    const timing = {
      duration: motion.summaryComparisonTransitionDuration,
      easing: Easing.inOut(Easing.ease),
      reduceMotion: ReduceMotion.System,
    };
    progress.set(
      withRepeat(
        withSequence(
          withDelay(motion.summaryAmountDisplayDuration, withTiming(1, timing)),
          withDelay(comparisonHoldDuration, withTiming(0, timing)),
        ),
        -1,
        false,
      ),
    );
    // Solo avanza mientras se ve la comparativa; durante el importe está
    // quieto y no repinta nada.
    travel.set(
      withRepeat(
        withSequence(
          withDelay(
            motion.summaryAmountDisplayDuration,
            withTiming(1, {
              duration: motion.summaryComparisonDisplayDuration,
              easing: Easing.linear,
              reduceMotion: ReduceMotion.System,
            }),
          ),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      ),
    );

    return () => {
      cancelAnimation(progress);
      cancelAnimation(travel);
    };
  }, [enabled, progress, travel]);

  return { progress, travel };
}

/**
 * Triángulos que cruzan el icono en la dirección del cambio: el que se va
 * sale por un borde mientras el siguiente entra por el opuesto.
 */
export function ComparisonTriangles({
  direction,
  size,
  travel,
}: {
  direction: PeriodComparisonResult['direction'];
  size: number;
  travel: SharedValue<number>;
}) {
  const { colors } = useTheme();
  // Hacia abajo cuando baja; hacia arriba cuando sube.
  const sign = direction === 'up' ? -1 : 1;
  const leadingStyle = useAnimatedStyle(() => {
    const pass = (travel.get() * motion.summaryComparisonTrianglePasses) % 1;
    return { transform: [{ translateY: sign * pass * size }] };
  });
  const trailingStyle = useAnimatedStyle(() => {
    const pass = (travel.get() * motion.summaryComparisonTrianglePasses) % 1;
    return { transform: [{ translateY: sign * (pass - 1) * size }] };
  });

  if (direction === 'flat') {
    return <Ionicons color={colors.onBrand} name="remove" size={iconSize.xs} />;
  }

  const Caret = direction === 'up' ? CaretUp : CaretDown;

  return (
    <>
      <Animated.View style={[styles.triangle, leadingStyle]}>
        <Caret color={colors.onBrand} size={iconSize.xs} weight="bold" />
      </Animated.View>
      <Animated.View style={[styles.triangle, trailingStyle]}>
        <Caret color={colors.onBrand} size={iconSize.xs} weight="bold" />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  percent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  amount: {
    flexShrink: 1,
  },
  triangle: {
    position: 'absolute',
  },
});
