import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { CategoryBudgetProgress } from '@/features/categories/components/CategoryBudgetProgress/CategoryBudgetProgress';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon/CategoryIcon';
import { CategoryTile } from '@/features/categories/components/CategoryPreviewCard/CategoryTile';
import type { CategoryIconName } from '@/features/categories/types';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { formatCurrency } from '@/lib/currency/formatCurrency';
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
  accessibilityHint?: string;
  testID?: string;
};

type CompactCategoryPreviewCardProps = BaseCategoryPreviewCardProps & {
  variant: 'compact';
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

export const compactCardMinHeight = 64;
const compactIconSize = 28;

export function CategoryPreviewCard(props: CategoryPreviewCardProps) {
  const { colors, shadows } = useTheme();
  const themedStyles = useThemedStyles((palette) =>
    createThemedStyles(palette, shadows),
  );

  if (props.variant === 'compact') {
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
        disabled={!onPress}
        onPress={onPress}
        style={({ pressed }) => [
          themedStyles.compactCard,
          pressed && styles.cardPressed,
        ]}
        testID={testID}
      >
        <View
          style={[
            styles.compactIcon,
            { backgroundColor: categoryColors[colorToken] },
          ]}
        >
          <CategoryIcon color={colors.onBrand} name={icon} size={iconSize.xs} />
        </View>
        <Text
          align="center"
          numberOfLines={2}
          variant="caption"
          weight="semibold"
        >
          {name}
        </Text>
      </Pressable>
    );
  }

  if (props.variant === 'grid' || props.variant === 'tile') {
    return (
      <CategoryTile
        accessibilityHint={props.accessibilityHint}
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
  const isIncomeOnly = incomeMinor > 0 && expenseMinor === 0;
  const hasBudget =
    typeof budgetMinor === 'number' && budgetMinor > 0 && !isIncomeOnly;
  const spent = formatCurrency(
    isIncomeOnly ? incomeMinor : expenseMinor,
    displayCurrency,
    'es-ES',
    { omitZeroDecimals: true },
  );
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
          ? `${name}, ${spent} gastado, ${available} disponible`
          : isIncomeOnly
            ? `${name}, ${spent} ingresado`
            : name
      }
      accessibilityRole="button"
      disabled={!onPress}
      onPress={onPress}
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
          {hasBudget || isIncomeOnly ? (
            <Text
              style={{
                color: isIncomeOnly
                  ? colors.income
                  : categoryColors[colorToken],
              }}
              testID="category-preview-spent-amount"
              variant="caption"
              weight="semibold"
            >
              {spent}
            </Text>
          ) : null}
          <View style={styles.budgetProgress}>
            <CategoryBudgetProgress
              accessibilityText={
                hasBudget
                  ? `${Math.round(budgetProgress * 100)}% utilizado, ${spent} gastado`
                  : isIncomeOnly
                    ? `${spent} ingresado`
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
    compactCard: {
      ...shadows.subtle,
      minHeight: compactCardMinHeight,
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: spacing.xs,
      borderRadius: radii.md,
      borderColor: colors.border,
      borderWidth: 1,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.xxs,
      paddingVertical: spacing.sm,
    },
  });
}

const styles = StyleSheet.create({
  cardPressed: { opacity: 0.64 },
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
