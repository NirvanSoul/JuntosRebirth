import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { List } from 'phosphor-react-native/src/icons/List';
import { SquaresFour } from 'phosphor-react-native/src/icons/SquaresFour';
import Animated from 'react-native-reanimated';

import { EmptyState } from '@/components/feedback/EmptyState/EmptyState';
import { Text } from '@/components/ui/Text/Text';
import { getActivityLayoutTransition } from '@/features/activity/components/ActivityCollapsibleSection';
import { CategoryPreviewCard } from '@/features/categories/components/CategoryPreviewCard/CategoryPreviewCard';
import type { CategorySummary } from '@/features/categories/utils/categorySummary';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { iconSize, layout } from '@/theme/layout';
import { previewCardLayout } from '@/theme/previewCard';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type ActivityCategoryDetailProps = {
  budgetExpenseByCategoryId: ReadonlyMap<string, number>;
  categories: readonly CategorySummary[];
  categoryView: 'grid' | 'list';
  currency: CurrencyCode;
  onCreateCategory?: () => void;
  onCategoryViewChange?: (view: 'grid' | 'list') => void;
  onOpenCategoryDetail?: (categoryId: string, currency: CurrencyCode) => void;
  spaceCurrency: CurrencyCode;
};

export function ActivityCategoryDetail({
  budgetExpenseByCategoryId,
  categories,
  categoryView,
  currency,
  onCreateCategory,
  onCategoryViewChange,
  onOpenCategoryDetail,
  spaceCurrency,
}: ActivityCategoryDetailProps) {
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const [isGridVisible, setGridVisible] = useState(categoryView === 'grid');

  useEffect(() => {
    setGridVisible(categoryView === 'grid');
  }, [categoryView]);

  const toggleCategoryView = () => {
    setGridVisible((visible) => {
      const next = !visible;
      onCategoryViewChange?.(next ? 'grid' : 'list');
      return next;
    });
  };

  return (
    <Animated.View
      layout={getActivityLayoutTransition()}
      testID="activity-category-detail"
    >
      <View style={styles.header}>
        <Text accessibilityRole="header" variant="label">
          Detalle por categoría
        </Text>
        <Pressable
          accessibilityHint="Cambia cómo se muestran las categorías"
          accessibilityLabel={
            isGridVisible
              ? 'Cambiar a vista de lista'
              : 'Cambiar a vista de cuadrícula'
          }
          accessibilityRole="button"
          hitSlop={spacing.sm}
          onPress={toggleCategoryView}
          style={({ pressed }) => [
            styles.viewToggle,
            pressed ? styles.viewTogglePressed : null,
          ]}
          testID="activity-category-view-toggle"
        >
          {isGridVisible ? (
            <List color={colors.textSecondary} size={iconSize.sm} />
          ) : (
            <SquaresFour color={colors.textSecondary} size={iconSize.sm} />
          )}
        </Pressable>
      </View>
      {categories.length > 0 ? (
        <View
          style={isGridVisible ? styles.grid : styles.groupShadow}
          testID="activity-category-preview-group"
        >
          <View
            style={isGridVisible ? styles.gridContent : styles.group}
            testID="activity-category-preview-list"
          >
            {categories.map(({ id, ...category }, index) =>
              isGridVisible ? (
                <CategoryPreviewCard
                  {...category}
                  budgetExpenseMinor={budgetExpenseByCategoryId.get(id) ?? 0}
                  displayCurrency={currency}
                  key={id}
                  onPress={() => onOpenCategoryDetail?.(id, currency)}
                  spaceCurrency={spaceCurrency}
                  variant="grid"
                />
              ) : (
                <View key={id}>
                  <CategoryPreviewCard
                    {...category}
                    budgetExpenseMinor={budgetExpenseByCategoryId.get(id) ?? 0}
                    displayCurrency={currency}
                    onPress={() => onOpenCategoryDetail?.(id, currency)}
                    spaceCurrency={spaceCurrency}
                    variant="row"
                  />
                  {index < categories.length - 1 ? (
                    <View
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                      style={styles.separator}
                      testID="activity-category-separator"
                    />
                  ) : null}
                </View>
              ),
            )}
          </View>
        </View>
      ) : (
        <EmptyState
          accessibilityLabel="Crear primera categoría"
          description="Crea una categoría para organizar tus movimientos."
          icon="pie-chart-outline"
          iconBackgroundColor={colors.categoryAction}
          onPress={onCreateCategory}
          testID="activity-empty-categories"
          title="Aún no hay categorías"
        />
      )}
    </Animated.View>
  );
}

function createStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    grid: { width: '100%' },
    gridContent: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: spacing.md,
    },
    group: {
      overflow: 'hidden',
      backgroundColor: colors.surface,
      borderColor: colors.categoryPreviewBorder,
      borderRadius: previewCardLayout.borderRadius,
      borderWidth: 2,
    },
    groupShadow: {
      ...shadows.subtle,
      borderRadius: previewCardLayout.borderRadius,
    },
    header: {
      minHeight: layout.minTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
      marginTop: spacing.xl,
    },
    separator: {
      height: 1,
      backgroundColor: colors.categoryPreviewBorder,
    },
    viewToggle: {
      width: layout.minTouchTarget,
      height: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
    },
    viewTogglePressed: { backgroundColor: colors.background },
  });
}
