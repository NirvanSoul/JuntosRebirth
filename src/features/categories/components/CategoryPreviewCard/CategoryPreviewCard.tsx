import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { GradientCard } from '@/components/ui/GradientCard/GradientCard';
import { Text } from '@/components/ui/Text/Text';
import { CategoryBudgetProgress } from '@/features/categories/components/CategoryBudgetProgress/CategoryBudgetProgress';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon/CategoryIcon';
import type { CategoryIconName } from '@/features/categories/types';
import { formatCurrency } from '@/lib/currency/formatCurrency';
import {
  categoryColors,
  getCategoryContentContrast,
  type CategoryColorToken,
} from '@/theme/categoryColors';
import { colors } from '@/theme/colors';
import { createDiagonalGradient } from '@/theme/gradients';
import { iconSize } from '@/theme/layout';
import { previewCardLayout } from '@/theme/previewCard';
import { radii } from '@/theme/radii';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';

type CategoryPreviewCardProps = {
  name: string;
  icon: CategoryIconName;
  colorToken: CategoryColorToken;
  budgetMinor?: number;
  incomeMinor: number;
  expenseMinor: number;
  variant?: CategoryPreviewCardVariant;
  onPress?: () => void;
  accessibilityHint?: string;
  testID?: string;
};

const tileScale = 0.9;
const tileWidth = 132 * tileScale;
const tileMinHeight = 164 * tileScale;
const tileIconSize = 52 * tileScale;
const progressSize = 68 * tileScale;
const progressStrokeWidth = 7 * tileScale;
const tileIconGlyphSize = iconSize.xl * tileScale;
export const compactCardMinHeight = 64;
const compactIconSize = 28;
const progressRadius = (progressSize - progressStrokeWidth) / 2;
const progressCircumference = 2 * Math.PI * progressRadius;

type CategoryPreviewCardVariant = 'compact' | 'row' | 'tile';

type CategoryTileProps = Omit<
  CategoryPreviewCardProps,
  'incomeMinor' | 'variant'
>;

function CategoryTile({
  name,
  icon,
  colorToken,
  budgetMinor,
  expenseMinor,
  onPress,
}: CategoryTileProps) {
  const categoryColor = categoryColors[colorToken];
  const contentContrast = getCategoryContentContrast(colorToken);
  const gradientColors = createDiagonalGradient(categoryColor);
  const spent = formatCurrency(expenseMinor, 'EUR', 'es-ES');
  const hasBudget = typeof budgetMinor === 'number' && budgetMinor > 0;
  const progress = hasBudget ? Math.min(expenseMinor / budgetMinor, 1) : 0;

  return (
    <Pressable
      accessibilityHint="Abre el detalle de la categoría"
      accessibilityLabel={`${name}, gastado ${spent}`}
      accessibilityRole="button"
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.cardPressed]}
      testID="category-preview-card"
    >
      <GradientCard
        colors={gradientColors}
        contentStyle={styles.tileContent}
        style={styles.tileSurface}
        testID="category-tile-gradient"
      >
        <Text
          numberOfLines={1}
          tone={contentContrast.tone}
          variant="footnote"
          weight="semibold"
        >
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
              stroke={contentContrast.color}
              strokeWidth={progressStrokeWidth}
              testID="category-budget-track"
            />
            {hasBudget && progress > 0 ? (
              <Circle
                cx={progressSize / 2}
                cy={progressSize / 2}
                fill="none"
                r={progressRadius}
                rotation="-90"
                stroke={contentContrast.color}
                strokeDasharray={`${progressCircumference} ${progressCircumference}`}
                strokeDashoffset={progressCircumference * (1 - progress)}
                strokeLinecap="round"
                strokeWidth={progressStrokeWidth}
                testID="category-budget-value"
                origin={`${progressSize / 2}, ${progressSize / 2}`}
              />
            ) : null}
          </Svg>
          <View style={styles.tileIcon} testID="category-tile-icon">
            <CategoryIcon
              color={contentContrast.color}
              name={icon}
              size={tileIconGlyphSize}
            />
          </View>
        </View>
        <Text
          adjustsFontSizeToFit
          numberOfLines={1}
          tone={contentContrast.tone}
          variant="footnote"
          weight="semibold"
        >
          {spent}
        </Text>
      </GradientCard>
    </Pressable>
  );
}

export function CategoryPreviewCard(props: CategoryPreviewCardProps) {
  const { variant = 'row' } = props;

  if (variant === 'compact') {
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
          styles.compactCard,
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

  if (variant === 'tile') {
    const { budgetMinor, colorToken, expenseMinor, icon, name, onPress } =
      props;

    return (
      <CategoryTile
        budgetMinor={budgetMinor}
        colorToken={colorToken}
        expenseMinor={expenseMinor}
        icon={icon}
        name={name}
        onPress={onPress}
      />
    );
  }

  const { budgetMinor, colorToken, expenseMinor, icon, name, onPress } = props;
  const hasBudget = typeof budgetMinor === 'number' && budgetMinor > 0;
  const spent = formatCurrency(expenseMinor, 'EUR', 'es-ES', {
    omitZeroDecimals: true,
  });
  const available = hasBudget
    ? formatCurrency(Math.max(budgetMinor - expenseMinor, 0), 'EUR', 'es-ES', {
        omitZeroDecimals: true,
      })
    : null;
  const budgetProgress = hasBudget
    ? Math.min(expenseMinor / budgetMinor, 1)
    : 0;

  return (
    <Pressable
      accessibilityHint="Abre el detalle de la categoría"
      accessibilityLabel={
        available ? `${name}, ${spent} gastado, ${available} disponible` : name
      }
      accessibilityRole="button"
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      testID="category-preview-card"
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
          {hasBudget ? (
            <Text
              style={{ color: categoryColors[colorToken] }}
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

const styles = StyleSheet.create({
  card: {
    minHeight: previewCardLayout.minHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    paddingHorizontal: previewCardLayout.paddingHorizontal,
    paddingVertical: previewCardLayout.paddingVertical,
  },
  cardPressed: { opacity: 0.64 },
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
  tile: {
    width: tileWidth,
    minHeight: tileMinHeight,
    borderRadius: radii.lg * tileScale,
    overflow: 'hidden',
  },
  tileSurface: { flex: 1 },
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
  },
  progress: {
    position: 'absolute',
  },
});
