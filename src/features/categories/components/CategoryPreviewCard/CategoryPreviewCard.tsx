import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';

import {
  type PreviewActionTarget,
  usePreviewActionsTrigger,
} from '@/components/overlays/PreviewActions/previewActions';
import { Text } from '@/components/ui/Text/Text';
import { CategoryBudgetProgress } from '@/features/categories/components/CategoryBudgetProgress/CategoryBudgetProgress';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon/CategoryIcon';
import { CategoryAmountSwitcher } from '@/features/categories/components/CategoryPreviewCard/CategoryAmountSwitcher';
import { CompactPreviewMarqueeText } from '@/features/categories/components/CategoryPreviewCard/CompactPreviewMarqueeText';
import { CategoryTile } from '@/features/categories/components/CategoryPreviewCard/CategoryTile';
import type { CategoryIconName } from '@/features/categories/types';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { useCurrencySymbolPreference } from '@/state/appPreferences/CurrencySymbolPreferenceProvider';
import {
  categoryColors,
  type CategoryColorToken,
} from '@/theme/categoryColors';
import { iconSize } from '@/theme/layout';
import { previewCardLayout } from '@/theme/previewCard';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type BaseCategoryPreviewCardProps = {
  name: string;
  icon: CategoryIconName;
  colorToken: CategoryColorToken;
  onPress?: () => void;
  /** Elemento sobre el que actúan las acciones de la pulsación larga. */
  actionTarget?: PreviewActionTarget;
  accessibilityHint?: string;
  testID?: string;
};

type CompactCategoryPreviewCardProps = BaseCategoryPreviewCardProps &
  ({ variant: 'compact' } | { variant: 'pill' }) & {
    displayCurrency?: CurrencyCode;
    spaceCurrency?: CurrencyCode;
    budgetMinor?: number;
    incomeMinor?: number;
    expenseMinor?: number;
    budgetExpenseMinor?: number;
  };

type DetailedCategoryPreviewCardProps = BaseCategoryPreviewCardProps & {
  variant?: 'grid' | 'row' | 'tile';
  displayCurrency: CurrencyCode;
  spaceCurrency: CurrencyCode;
  budgetMinor?: number;
  incomeMinor: number;
  expenseMinor: number;
  budgetExpenseMinor: number;
  style?: StyleProp<ViewStyle>;
};

export type CategoryPreviewCardProps =
  CompactCategoryPreviewCardProps | DetailedCategoryPreviewCardProps;

const compactIconSize = 28;
export const compactCardHeight = 74;
export const pillCardHeight = 24;

export function CategoryPreviewCard(props: CategoryPreviewCardProps) {
  const { formatCurrency } = useCurrencySymbolPreference();
  const { colors, shadows } = useTheme();
  const themedStyles = useThemedStyles((palette) =>
    createThemedStyles(palette, shadows),
  );
  const isTile = props.variant === 'grid' || props.variant === 'tile';
  // Las baldosas gestionan su propia pulsación larga en `CategoryTile`.
  const previewActions = usePreviewActionsTrigger(
    isTile ? undefined : props.actionTarget,
    () => <CategoryPreviewCard {...props} />,
  );

  if (props.variant === 'compact' || props.variant === 'pill') {
    const isPill = props.variant === 'pill';
    const {
      accessibilityHint = 'Abre el detalle',
      colorToken,
      icon,
      name,
      onPress,
      testID = 'category-preview-card-compact',
    } = props;

    return (
      <Pressable
        accessibilityHint={accessibilityHint}
        accessibilityLabel={name}
        accessibilityRole="button"
        disabled={!onPress && !previewActions}
        onPress={onPress}
        {...previewActions}
        style={({ pressed }) => [
          isPill ? themedStyles.pillCard : themedStyles.compactCard,
          pressed && styles.cardPressed,
        ]}
        testID={testID}
      >
        <View
          style={[
            isPill ? styles.pillIcon : styles.compactIcon,
            { backgroundColor: categoryColors[colorToken] },
          ]}
        >
          <CategoryIcon
            color={colors.onBrand}
            name={icon}
            size={isPill ? 12 : iconSize.xs}
          />
        </View>
        <View style={isPill ? styles.pillText : styles.compactText}>
          <CompactPreviewMarqueeText>{name}</CompactPreviewMarqueeText>
        </View>
      </Pressable>
    );
  }

  if (props.variant === 'grid' || props.variant === 'tile') {
    return (
      <CategoryTile
        accessibilityHint={props.accessibilityHint}
        actionTarget={props.actionTarget}
        budgetExpenseMinor={props.budgetExpenseMinor}
        budgetMinor={props.budgetMinor}
        colorToken={props.colorToken}
        displayCurrency={props.displayCurrency}
        expenseMinor={props.expenseMinor}
        icon={props.icon}
        incomeMinor={props.incomeMinor}
        name={props.name}
        onPress={props.onPress}
        spaceCurrency={props.spaceCurrency}
        style={props.style}
        testID={props.testID}
        variant={props.variant}
      />
    );
  }

  const {
    accessibilityHint,
    budgetMinor,
    colorToken,
    displayCurrency,
    spaceCurrency,
    expenseMinor,
    budgetExpenseMinor,
    icon,
    incomeMinor,
    name,
    onPress,
    testID = 'category-preview-card',
  } = props;
  const hasExpenses = expenseMinor > 0;
  const hasIncome = incomeMinor > 0;
  const isIncomeOnly = hasIncome && !hasExpenses;
  const hasBudget =
    typeof budgetMinor === 'number' && budgetMinor > 0 && !isIncomeOnly;
  const expense = formatCurrency(expenseMinor, displayCurrency, 'es-ES', {
    omitZeroDecimals: true,
  });
  const income = formatCurrency(incomeMinor, displayCurrency, 'es-ES', {
    omitZeroDecimals: true,
  });
  const available = hasBudget
    ? formatCurrency(
        Math.max(budgetMinor - budgetExpenseMinor, 0),
        spaceCurrency,
        'es-ES',
        {
          omitZeroDecimals: true,
        },
      )
    : null;
  const budgetProgress = hasBudget
    ? Math.min(budgetExpenseMinor / budgetMinor, 1)
    : 0;

  return (
    <Pressable
      accessibilityHint={accessibilityHint ?? 'Abre el detalle de la categoría'}
      accessibilityLabel={
        available
          ? `${name}, ${hasExpenses ? `${expense} gastado, ` : ''}${hasIncome ? `${income} ingresado, ` : ''}${available} disponible`
          : hasExpenses || hasIncome
            ? `${name}, ${hasExpenses ? `${expense} gastado` : ''}${hasExpenses && hasIncome ? ', ' : ''}${hasIncome ? `${income} ingresado` : ''}`
            : name
      }
      accessibilityRole="button"
      disabled={!onPress && !previewActions}
      onPress={onPress}
      {...previewActions}
      style={({ pressed }) => [
        themedStyles.card,
        pressed && styles.cardPressed,
      ]}
      testID={testID}
    >
      <View
        style={[styles.icon, { backgroundColor: categoryColors[colorToken] }]}
      >
        <CategoryIcon
          color={colors.onBrand}
          name={icon}
          size={previewCardLayout.glyphSize}
        />
      </View>
      <View style={styles.content}>
        <Text numberOfLines={1} variant="label" weight="semibold">
          {name}
        </Text>
        <View
          style={styles.budgetSummary}
          testID="category-preview-budget-summary"
        >
          <CategoryAmountSwitcher
            expense={expense}
            hasExpenses={hasExpenses}
            hasIncome={hasIncome}
            income={income}
            testID="category-preview-amount-switcher"
          />
          <View style={styles.budgetProgress}>
            <CategoryBudgetProgress
              accessibilityText={
                hasBudget
                  ? `${Math.round(budgetProgress * 100)}% utilizado, ${expense} gastado`
                  : isIncomeOnly
                    ? `${income} ingresado`
                    : 'Sin presupuesto asignado'
              }
              color={categoryColors[colorToken]}
              progress={budgetProgress}
              size="compact"
              testID="category-preview-budget-progress"
            />
          </View>
          {available ? (
            <Text
              numberOfLines={1}
              testID="category-preview-available-amount"
              tone="secondary"
              variant="caption"
              weight="semibold"
            >
              {available}
            </Text>
          ) : null}
        </View>
      </View>
      <Ionicons
        accessibilityElementsHidden
        color={colors.textMuted}
        importantForAccessibility="no"
        name="chevron-forward"
        size={iconSize.xs}
        testID="category-preview-chevron"
      />
    </Pressable>
  );
}

function createThemedStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    card: {
      minHeight: previewCardLayout.minHeight,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      paddingHorizontal: previewCardLayout.paddingHorizontal,
      paddingVertical: previewCardLayout.paddingVertical,
    },
    pillCard: {
      height: pillCardHeight,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      borderRadius: radii.round,
      borderColor: colors.border,
      borderWidth: 1,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.xxs,
    },
    compactCard: {
      ...shadows.subtle,
      height: compactCardHeight,
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: spacing.xs,
      borderRadius: radii.md,
      borderColor: colors.border,
      borderWidth: 1,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.xxs,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm - spacing.xxs,
    },
  });
}

const styles = StyleSheet.create({
  cardPressed: { opacity: 0.64 },
  pillText: { flex: 1, minWidth: 0 },
  compactText: { width: '100%' },
  pillIcon: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
  },
  compactIcon: {
    width: compactIconSize,
    height: compactIconSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  icon: {
    width: previewCardLayout.iconSize,
    height: previewCardLayout.iconSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: previewCardLayout.iconRadius,
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: spacing.sm,
  },
  budgetSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
  },
  budgetProgress: {
    flex: 1,
    minWidth: 0,
  },
});
