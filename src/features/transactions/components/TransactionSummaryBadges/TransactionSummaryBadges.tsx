import Ionicons from '@expo/vector-icons/Ionicons';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/Text/Text';
import {
  ComparisonAmount,
  ComparisonTriangles,
  describeComparison,
  useComparisonAmount,
  useComparisonCycle,
} from '@/features/transactions/components/TransactionSummaryBadges/SummaryComparisonCycle';
import { PeriodComparisonIndicator } from '@/features/transactions/components/PeriodComparisonIndicator/PeriodComparisonIndicator';
import type { PeriodComparisonResult } from '@/features/transactions/utils/periodComparison';
import {
  defaultCurrencyCode,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import { useCurrencySymbolPreference } from '@/state/appPreferences/CurrencySymbolPreferenceProvider';
import { iconSize } from '@/theme/layout';
import { previewCardLayout } from '@/theme/previewCard';
import { spacing } from '@/theme/spacing';
import { getStartupEntering } from '@/theme/transitions';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type ComparisonPlacement = 'amount' | 'title';

type TransactionSummaryBadgesProps = {
  animateEntrance?: boolean;
  accessibilityContext: string;
  balanceComparison?: PeriodComparisonResult;
  balanceMinor?: number;
  bordered?: boolean;
  compact?: boolean;
  /**
   * Dónde se muestra el % de cambio: junto al título, o alternando con el
   * importe (por defecto) para no alterar la forma del badge.
   */
  comparisonPlacement?: ComparisonPlacement;
  currency?: CurrencyCode;
  expenseComparison?: PeriodComparisonResult;
  expenseMinor: number;
  incomeComparison?: PeriodComparisonResult;
  incomeMinor: number;
  onBalancePress?: () => void;
  onExpensePress?: () => void;
  onIncomePress?: () => void;
  style?: StyleProp<ViewStyle>;
  testIDPrefix: string;
};

type MetricBadgeProps = {
  entranceIndex?: number;
  accessibilityLabel: string;
  amount: string;
  bordered: boolean;
  compact: boolean;
  comparison?: PeriodComparisonResult;
  comparisonPlacement: ComparisonPlacement;
  currency: CurrencyCode;
  /** 0 muestra el importe, 1 la comparativa. Compartido por los badges. */
  comparisonProgress: SharedValue<number>;
  /** Recorrido lineal 0→1 de los triángulos durante la comparativa. */
  comparisonTravel: SharedValue<number>;
  icon: 'balance' | 'expense' | 'income';
  label: string;
  onPress?: () => void;
  testIDPrefix: string;
};

const amountSlideDistance = spacing.xs;

function MetricBadge({
  entranceIndex,
  accessibilityLabel,
  amount,
  bordered,
  compact,
  comparison,
  comparisonPlacement,
  comparisonProgress,
  comparisonTravel,
  currency,
  icon,
  label,
  onPress,
  testIDPrefix,
}: MetricBadgeProps) {
  const { colors, shadows } = useTheme();
  const changeAmount = useComparisonAmount(comparison, currency);
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const isBalance = icon === 'balance';
  const isIncome = icon === 'income';
  const iconName = isBalance
    ? 'swap-vertical-outline'
    : isIncome
      ? 'arrow-up'
      : 'arrow-down';
  const alternatesWithAmount =
    comparison !== undefined && comparisonPlacement === 'amount';
  const iconDiameter = compact ? iconSize.sm : iconSize.md;
  const amountStyle = useAnimatedStyle(() => {
    const progress = alternatesWithAmount ? comparisonProgress.get() : 0;
    return {
      opacity: 1 - progress,
      transform: [{ translateY: -progress * amountSlideDistance }],
    };
  });
  // El icono solo se funde: su `transform` ya lleva el giro de 45°.
  const iconStyle = useAnimatedStyle(() => ({
    opacity: alternatesWithAmount ? 1 - comparisonProgress.get() : 1,
  }));
  const comparisonStyle = useAnimatedStyle(() => {
    const progress = alternatesWithAmount ? comparisonProgress.get() : 0;
    return {
      opacity: progress,
      transform: [{ translateY: (1 - progress) * amountSlideDistance }],
    };
  });
  const amountVariant = compact ? 'footnote' : 'bodyStrong';

  // `Pressable` recibe el estilo como función; un componente animado no la
  // resolvería, así que la entrada anima el contenedor.
  return (
    <Animated.View
      entering={
        entranceIndex === undefined
          ? undefined
          : getStartupEntering(entranceIndex)
      }
      style={styles.badgeSlot}
    >
      <Pressable
        accessibilityLabel={
          comparison
            ? `${accessibilityLabel}, ${describeComparison(comparison, changeAmount)}`
            : accessibilityLabel
        }
        accessibilityRole={onPress ? 'button' : undefined}
        accessible
        disabled={!onPress}
        onPress={onPress}
        style={({ pressed }) => [
          styles.badge,
          compact ? styles.compactBadge : null,
          bordered ? styles.borderedBadge : null,
          pressed ? styles.pressed : null,
        ]}
        testID={`${testIDPrefix}-${icon}-badge`}
      >
        <View
          style={[
            styles.icon,
            compact ? styles.compactIcon : null,
            isBalance
              ? styles.balanceIcon
              : isIncome
                ? styles.incomeIcon
                : styles.expenseIcon,
          ]}
          testID={`${testIDPrefix}-${icon}-icon-background`}
        >
          <Animated.View
            style={[styles.diagonalArrow, iconStyle]}
            testID={`${testIDPrefix}-${icon}-icon`}
          >
            <Ionicons
              color={colors.onBrand}
              name={iconName}
              size={iconSize.xs}
              testID={`${testIDPrefix}-${icon}-glyph`}
            />
          </Animated.View>
          {alternatesWithAmount ? (
            <Animated.View
              style={[styles.iconOverlay, comparisonStyle]}
              testID={`${testIDPrefix}-${icon}-comparison-icon`}
            >
              <ComparisonTriangles
                direction={comparison.direction}
                size={iconDiameter}
                travel={comparisonTravel}
              />
            </Animated.View>
          ) : null}
        </View>
        <View style={styles.metricText}>
          <View style={styles.labelRow}>
            <Text
              numberOfLines={1}
              testID={`${testIDPrefix}-${icon}-label`}
              tone="secondary"
              variant="footnote"
              weight="regular"
            >
              {label}
            </Text>
            {comparison && comparisonPlacement === 'title' ? (
              <PeriodComparisonIndicator
                comparison={comparison}
                compact
                currency={currency}
                testID={`${testIDPrefix}-${icon}-comparison`}
                tone={icon}
              />
            ) : null}
          </View>
          <View>
            <Animated.View style={amountStyle}>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.72}
                numberOfLines={1}
                testID={`${testIDPrefix}-${icon}-amount`}
                variant={amountVariant}
                weight="semibold"
              >
                {amount}
              </Text>
            </Animated.View>
            {alternatesWithAmount ? (
              <Animated.View
                style={[styles.amountOverlay, comparisonStyle]}
                testID={`${testIDPrefix}-${icon}-comparison`}
              >
                <ComparisonAmount
                  amount={changeAmount}
                  comparison={comparison}
                  testID={`${testIDPrefix}-${icon}-comparison-arrow`}
                  variant={amountVariant}
                />
              </Animated.View>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function TransactionSummaryBadges({
  animateEntrance = false,
  accessibilityContext,
  balanceComparison,
  balanceMinor,
  bordered = false,
  compact = false,
  comparisonPlacement = 'amount',
  currency = defaultCurrencyCode,
  expenseComparison,
  expenseMinor,
  incomeComparison,
  incomeMinor,
  onBalancePress,
  onExpensePress,
  onIncomePress,
  style,
  testIDPrefix,
}: TransactionSummaryBadgesProps) {
  const { formatCurrency } = useCurrencySymbolPreference();
  const { shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const income = formatCurrency(incomeMinor, currency, 'es-ES');
  const expense = formatCurrency(expenseMinor, currency, 'es-ES');
  const balance =
    balanceMinor === undefined
      ? null
      : formatCurrency(balanceMinor, currency, 'es-ES');
  const comparisonCycle = useComparisonCycle(
    comparisonPlacement === 'amount' &&
      Boolean(incomeComparison ?? expenseComparison ?? balanceComparison),
  );
  const sharedBadgeProps = {
    bordered,
    compact,
    comparisonPlacement,
    comparisonProgress: comparisonCycle.progress,
    comparisonTravel: comparisonCycle.travel,
    currency,
    testIDPrefix,
  };

  return (
    <View testID={`${testIDPrefix}-summary-group`}>
      <View style={[styles.badges, style]} testID={`${testIDPrefix}-summary`}>
        <MetricBadge
          accessibilityLabel={`Ingresos ${accessibilityContext}: ${income}`}
          amount={income}
          {...sharedBadgeProps}
          comparison={incomeComparison}
          entranceIndex={animateEntrance ? 1 : undefined}
          icon="income"
          label="Ingresos"
          onPress={onIncomePress}
        />
        <MetricBadge
          accessibilityLabel={`Gastos ${accessibilityContext}: ${expense}`}
          amount={expense}
          {...sharedBadgeProps}
          comparison={expenseComparison}
          entranceIndex={animateEntrance ? 2 : undefined}
          icon="expense"
          label="Gastos"
          onPress={onExpensePress}
        />
        {balance === null ? null : (
          <MetricBadge
            accessibilityLabel={`Balance ${accessibilityContext}: ${balance}`}
            amount={balance}
            {...sharedBadgeProps}
            comparison={balanceComparison}
            entranceIndex={animateEntrance ? 3 : undefined}
            icon="balance"
            label="Balance"
            onPress={onBalancePress}
          />
        )}
      </View>
    </View>
  );
}

function createStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    badges: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    badgeSlot: {
      minWidth: 0,
      flex: 1,
    },
    badge: {
      ...shadows.subtle,
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: previewCardLayout.borderRadius,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    compactBadge: {
      paddingHorizontal: spacing.sm,
    },
    borderedBadge: {
      borderColor: colors.border,
      borderWidth: 1,
    },
    metricText: {
      minWidth: 0,
      flex: 1,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
    },
    amountOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
    },
    icon: {
      width: iconSize.md,
      height: iconSize.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: previewCardLayout.directionIconRadius,
      overflow: 'hidden',
    },
    iconOverlay: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    compactIcon: {
      width: iconSize.sm,
      height: iconSize.sm,
    },
    incomeIcon: {
      backgroundColor: colors.incomeSoft,
    },
    expenseIcon: {
      backgroundColor: colors.expenseSoft,
    },
    balanceIcon: {
      backgroundColor: colors.cta,
    },
    diagonalArrow: {
      transform: [{ rotate: '45deg' }],
    },
    pressed: { opacity: 0.72 },
  });
}
