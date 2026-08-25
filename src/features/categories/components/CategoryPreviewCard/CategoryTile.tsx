import {
  Pressable,
  StyleSheet,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '@/components/ui/Text/Text';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon/CategoryIcon';
import type { CategoryIconName } from '@/features/categories/types';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { formatCurrency } from '@/lib/currency/formatCurrency';
import {
  categoryColors,
  type CategoryColorToken,
} from '@/theme/categoryColors';
import { iconSize } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

const tileScale = 0.9;
const gridTileRadius = radii.lg * tileScale + 1;
const tileWidth = 132 * tileScale;
const tileMinHeight = 164 * tileScale;
const tileIconSize = 60 * tileScale;
const progressSize = 78 * tileScale;
const progressStrokeWidth = 4.6 * tileScale;
const tileIconGlyphSize = iconSize.xl * tileScale * 1.15;
const progressRadius = (progressSize - progressStrokeWidth) / 2;
const progressCircumference = 2 * Math.PI * progressRadius;

export type CategoryTileProps = {
  accessibilityHint?: string;
  name: string;
  icon: CategoryIconName;
  colorToken: CategoryColorToken;
  displayCurrency: CurrencyCode;
  spaceCurrency?: CurrencyCode;
  budgetMinor?: number;
  incomeMinor: number;
  expenseMinor: number;
  budgetExpenseMinor: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  variant?: 'grid' | 'tile';
};

export function CategoryTile({
  accessibilityHint = 'Abre el detalle de la categoría',
  name,
  icon,
  colorToken,
  displayCurrency,
  budgetMinor,
  incomeMinor,
  expenseMinor,
  budgetExpenseMinor,
  onPress,
  style,
  testID = 'category-preview-card',
  variant = 'tile',
}: CategoryTileProps) {
  const { colors, shadows } = useTheme();
  const themedStyles = useThemedStyles((palette) =>
    createThemedStyles(palette, shadows),
  );
  const categoryColor = categoryColors[colorToken];
  const hasExpenses = expenseMinor > 0;
  const hasIncome = incomeMinor > 0;
  const expense = formatCurrency(expenseMinor, displayCurrency, 'es-ES');
  const income = formatCurrency(incomeMinor, displayCurrency, 'es-ES');
  const hasBudget = typeof budgetMinor === 'number' && budgetMinor > 0;
  const progress = hasBudget
    ? Math.min(budgetExpenseMinor / budgetMinor, 1)
    : 0;

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={
        hasIncome && !hasExpenses
          ? `${name}, ingresado ${income}`
          : hasExpenses && hasIncome
            ? `${name}, gastado ${expense}, ingresado ${income}`
            : `${name}, gastado ${expense}`
      }
      accessibilityRole="button"
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        themedStyles.tile,
        variant === 'grid' ? themedStyles.gridTile : null,
        style,
        pressed && styles.cardPressed,
      ]}
      testID={testID}
    >
      <View style={styles.tileContent} testID="category-tile-surface">
        <Text numberOfLines={1} variant="footnote" weight="medium">
          {name}
        </Text>
        <View style={styles.tileIconArea}>
          <Svg
            accessibilityLabel={
              hasBudget
                ? `Presupuesto utilizado ${Math.round(progress * 100)}%`
                : 'Sin presupuesto asignado'
            }
            height={progressSize}
            style={styles.progress}
            testID="category-budget-ring"
            width={progressSize}
          >
            <Circle
              cx={progressSize / 2}
              cy={progressSize / 2}
              fill="none"
              opacity={0.25}
              r={progressRadius}
              stroke={categoryColor}
              strokeWidth={progressStrokeWidth}
              testID="category-budget-track"
            />
            {hasBudget && progress > 0 ? (
              <Circle
                cx={progressSize / 2}
                cy={progressSize / 2}
                fill="none"
                origin={`${progressSize / 2}, ${progressSize / 2}`}
                r={progressRadius}
                rotation="-90"
                stroke={categoryColor}
                strokeDasharray={`${progressCircumference} ${progressCircumference}`}
                strokeDashoffset={progressCircumference * (1 - progress)}
                strokeLinecap="round"
                strokeWidth={progressStrokeWidth}
                testID="category-budget-value"
              />
            ) : null}
          </Svg>
          <View
            style={[styles.tileIcon, { backgroundColor: categoryColor }]}
            testID="category-tile-icon"
          >
            <CategoryIcon
              color={colors.onBrand}
              name={icon}
              size={tileIconGlyphSize}
            />
          </View>
        </View>
        <View style={styles.amounts}>
          {hasExpenses ? (
            <Text
              adjustsFontSizeToFit
              numberOfLines={1}
              variant="footnote"
              weight="medium"
            >
              {expense}
            </Text>
          ) : null}
          {hasIncome ? (
            <Text
              adjustsFontSizeToFit
              numberOfLines={1}
              style={{ color: colors.income }}
              variant="footnote"
              weight="medium"
            >
              {income}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function createThemedStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    tile: {
      ...shadows.subtle,
      width: tileWidth,
      minHeight: tileMinHeight,
      borderRadius: radii.lg * tileScale,
      backgroundColor: colors.surface,
      overflow: 'visible',
    },
    gridTile: {
      borderColor: colors.border,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: gridTileRadius,
      width: '31.5%',
    },
  });
}

const styles = StyleSheet.create({
  cardPressed: { opacity: 0.64 },
  tileContent: {
    width: '100%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm * tileScale,
    paddingVertical: spacing.md * tileScale,
  },
  tileIconArea: {
    width: progressSize,
    height: progressSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIcon: {
    width: tileIconSize,
    height: tileIconSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
  },
  amounts: { alignItems: 'center', gap: spacing.xxs },
  progress: {
    position: 'absolute',
  },
});
