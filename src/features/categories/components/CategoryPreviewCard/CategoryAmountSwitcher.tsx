import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/Text/Text';
import { iconSize } from '@/theme/layout';
import { motion } from '@/theme/motion';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/useTheme';

type CategoryAmountSwitcherProps = {
  expense: string;
  hasExpenses: boolean;
  hasIncome: boolean;
  income: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const categoryAmountDisplayDuration =
  motion.categoryAmountSwitchInterval - motion.categoryAmountTransitionDuration;
const categoryAmountSlideDistance = spacing.md;

export function CategoryAmountSwitcher({
  expense,
  hasExpenses,
  hasIncome,
  income,
  style,
  testID,
}: CategoryAmountSwitcherProps) {
  const { colors } = useTheme();
  const expenseOpacity = useSharedValue<number>(1);
  const incomeOpacity = useSharedValue<number>(0);
  const expenseTranslateX = useSharedValue<number>(0);
  const incomeTranslateX = useSharedValue<number>(categoryAmountSlideDistance);
  const hasBothAmounts = hasExpenses && hasIncome;

  useEffect(() => {
    if (!hasBothAmounts) {
      expenseOpacity.value = hasExpenses ? 1 : 0;
      incomeOpacity.value = hasIncome ? 1 : 0;
      expenseTranslateX.value = 0;
      incomeTranslateX.value = 0;
      return;
    }

    expenseOpacity.value = 1;
    incomeOpacity.value = 0;
    expenseTranslateX.value = 0;
    incomeTranslateX.value = categoryAmountSlideDistance;
    expenseOpacity.value = withRepeat(
      withSequence(
        withDelay(
          categoryAmountDisplayDuration,
          withTiming(0, {
            duration: motion.categoryAmountTransitionDuration,
            easing: Easing.inOut(Easing.ease),
            reduceMotion: ReduceMotion.System,
          }),
        ),
        withDelay(
          categoryAmountDisplayDuration,
          withTiming(1, {
            duration: motion.categoryAmountTransitionDuration,
            easing: Easing.inOut(Easing.ease),
            reduceMotion: ReduceMotion.System,
          }),
        ),
      ),
      -1,
      false,
    );
    incomeOpacity.value = withRepeat(
      withSequence(
        withDelay(
          categoryAmountDisplayDuration,
          withTiming(1, {
            duration: motion.categoryAmountTransitionDuration,
            easing: Easing.inOut(Easing.ease),
            reduceMotion: ReduceMotion.System,
          }),
        ),
        withDelay(
          categoryAmountDisplayDuration,
          withTiming(0, {
            duration: motion.categoryAmountTransitionDuration,
            easing: Easing.inOut(Easing.ease),
            reduceMotion: ReduceMotion.System,
          }),
        ),
      ),
      -1,
      false,
    );
    expenseTranslateX.value = withRepeat(
      withSequence(
        withDelay(
          categoryAmountDisplayDuration,
          withTiming(-categoryAmountSlideDistance, {
            duration: motion.categoryAmountTransitionDuration,
            easing: Easing.inOut(Easing.ease),
            reduceMotion: ReduceMotion.System,
          }),
        ),
        withDelay(
          categoryAmountDisplayDuration,
          withTiming(0, {
            duration: motion.categoryAmountTransitionDuration,
            easing: Easing.inOut(Easing.ease),
            reduceMotion: ReduceMotion.System,
          }),
        ),
      ),
      -1,
      false,
    );
    incomeTranslateX.value = withRepeat(
      withSequence(
        withDelay(
          categoryAmountDisplayDuration,
          withTiming(0, {
            duration: motion.categoryAmountTransitionDuration,
            easing: Easing.inOut(Easing.ease),
            reduceMotion: ReduceMotion.System,
          }),
        ),
        withDelay(
          categoryAmountDisplayDuration,
          withTiming(categoryAmountSlideDistance, {
            duration: motion.categoryAmountTransitionDuration,
            easing: Easing.inOut(Easing.ease),
            reduceMotion: ReduceMotion.System,
          }),
        ),
      ),
      -1,
      false,
    );
  }, [
    expenseOpacity,
    expenseTranslateX,
    hasBothAmounts,
    hasExpenses,
    hasIncome,
    incomeOpacity,
    incomeTranslateX,
  ]);

  const expenseAnimatedStyle = useAnimatedStyle(() => ({
    opacity: expenseOpacity.value,
    transform: [{ translateX: expenseTranslateX.value }],
  }));
  const incomeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: incomeOpacity.value,
    transform: [{ translateX: incomeTranslateX.value }],
  }));
  const visibleType =
    hasExpenses && (!hasIncome || expense.length >= income.length)
      ? 'expense'
      : 'income';
  const visibleAmount = visibleType === 'expense' ? expense : income;

  if (!hasExpenses && !hasIncome) return null;

  return (
    <View style={[styles.container, style]} testID={testID}>
      <Amount amount={visibleAmount} hidden type={visibleType} />
      {hasExpenses ? (
        <Animated.View
          accessibilityElementsHidden={hasBothAmounts}
          importantForAccessibility={
            hasBothAmounts ? 'no-hide-descendants' : 'auto'
          }
          style={[styles.overlay, expenseAnimatedStyle]}
          testID="category-preview-expense-amount"
        >
          <Amount
            amount={expense}
            color={colors.expense}
            testID="category-preview-expense-text"
            type="expense"
          />
        </Animated.View>
      ) : null}
      {hasIncome ? (
        <Animated.View
          accessibilityElementsHidden={hasBothAmounts}
          importantForAccessibility={
            hasBothAmounts ? 'no-hide-descendants' : 'auto'
          }
          style={[styles.overlay, incomeAnimatedStyle]}
          testID="category-preview-income-amount"
        >
          <Amount
            amount={income}
            color={colors.income}
            testID="category-preview-income-text"
            type="income"
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

function Amount({
  amount,
  color,
  hidden = false,
  testID,
  type,
}: {
  amount: string;
  color?: string;
  hidden?: boolean;
  testID?: string;
  type: 'expense' | 'income';
}) {
  return (
    <View accessible={!hidden} style={[styles.amount, hidden && styles.hidden]}>
      <View style={styles.diagonalArrow}>
        <Ionicons
          color={color}
          name={type === 'income' ? 'arrow-up' : 'arrow-down'}
          size={iconSize.xs}
          testID={testID ? `${testID}-arrow` : undefined}
        />
      </View>
      <Text
        numberOfLines={1}
        testID={testID}
        variant="caption"
        weight="semibold"
      >
        {amount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  amount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  diagonalArrow: {
    transform: [{ rotate: '45deg' }],
  },
  hidden: { opacity: 0 },
});
