import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { RowLimitedScroll } from '@/components/layout/RowLimitedScroll/RowLimitedScroll';
import { CreatePreviewBadge } from '@/components/ui/CreatePreviewBadge/CreatePreviewBadge';
import { Text } from '@/components/ui/Text/Text';
import { ViewToggleButton } from '@/components/ui/ViewToggleButton';
import { getActivityLayoutTransition } from '@/features/activity/components/ActivityCollapsibleSection';
import { CategoryPreviewCard } from '@/features/categories/components/CategoryPreviewCard/CategoryPreviewCard';
import type { CategorySummary } from '@/features/categories/utils/categorySummary';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { layout } from '@/theme/layout';
import { previewCardLayout } from '@/theme/previewCard';
import { motion } from '@/theme/motion';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type ActivityCategoryDetailProps = {
  budgetExpenseByCategoryId: ReadonlyMap<string, number>;
  categories: readonly CategorySummary[];
  categoryView: 'grid' | 'list';
  currency: CurrencyCode;
  hasBreakdownData: boolean;
  onCreateCategory?: () => void;
  onCategoryViewChange?: (view: 'grid' | 'list') => void;
  onOpenCategoryDetail?: (categoryId: string, currency: CurrencyCode) => void;
  spaceCurrency: CurrencyCode;
};

type CategoryView = 'grid' | 'list';

/** La cuadrícula muestra tres columnas y, a partir de la cuarta fila, sigue en horizontal. */
const gridColumns = 3;
const gridMaxRows = 3;
const gridTileWidthRatio = 0.315;
/** La lista agrupa las categorías de cuatro en cuatro; el resto se desliza. */
const listPageSize = 4;

const categoryViewTiming = {
  duration: motion.categoryViewTransitionDuration,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
};

export function ActivityCategoryDetail({
  budgetExpenseByCategoryId,
  categories,
  categoryView,
  currency,
  hasBreakdownData,
  onCreateCategory,
  onCategoryViewChange,
  onOpenCategoryDetail,
  spaceCurrency,
}: ActivityCategoryDetailProps) {
  const { shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const { width } = useWindowDimensions();
  const gutter = layout.screenGutter[useLayoutDensity()];
  const gridWidth = width - gutter * 2;
  const gridTileWidth = Math.floor(gridWidth * gridTileWidthRatio);
  const gridColumnGap = Math.floor(
    (gridWidth - gridTileWidth * gridColumns) / (gridColumns - 1),
  );
  const listPages = Array.from(
    { length: Math.ceil(categories.length / listPageSize) },
    (_, page) =>
      categories.slice(page * listPageSize, (page + 1) * listPageSize),
  );
  const isListPaged = listPages.length > 1;
  // Asoma el borde de la siguiente página para que se note que hay más.
  const listPageWidth = gridWidth - spacing.xl;
  const renderListPage = (
    pageCategories: readonly CategorySummary[],
    testID?: string,
  ) => (
    <View style={styles.group} testID={testID}>
      {pageCategories.map(({ id, ...category }, index) => (
        <View key={id}>
          <CategoryPreviewCard
            {...category}
            actionTarget={{ kind: 'category', id }}
            budgetExpenseMinor={budgetExpenseByCategoryId.get(id) ?? 0}
            displayCurrency={currency}
            onPress={() => onOpenCategoryDetail?.(id, currency)}
            spaceCurrency={spaceCurrency}
            variant="row"
          />
          {index < pageCategories.length - 1 ? (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={styles.separator}
              testID="activity-category-separator"
            />
          ) : null}
        </View>
      ))}
    </View>
  );
  const [selectedCategoryView, setSelectedCategoryView] =
    useState<CategoryView>(categoryView);
  const [displayedCategoryView, setDisplayedCategoryView] =
    useState<CategoryView>(categoryView);
  const entryOffset = useRef<number | null>(null);
  const isTransitioning = useRef(false);
  const previousCategoryView = useRef(categoryView);
  const opacity = useSharedValue(1);
  const translateX = useSharedValue(0);
  const isGridVisible = selectedCategoryView === 'grid';
  const displayedGridView = displayedCategoryView === 'grid';

  const categoryViewAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  useEffect(() => {
    if (categoryView === previousCategoryView.current) {
      return;
    }

    previousCategoryView.current = categoryView;
    if (categoryView === selectedCategoryView) {
      return;
    }

    isTransitioning.current = false;
    entryOffset.current = null;
    opacity.set(1);
    translateX.set(0);
    // Este efecto también resetea la animación (arriba); no es un derivado puro.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedCategoryView(categoryView);
    setDisplayedCategoryView(categoryView);
  }, [categoryView, opacity, selectedCategoryView, translateX]);

  const finishTransition = useCallback(() => {
    isTransitioning.current = false;
  }, []);

  const showNextCategoryView = useCallback(
    (nextView: CategoryView, incomingOffset: number) => {
      entryOffset.current = incomingOffset;
      setDisplayedCategoryView(nextView);
    },
    [],
  );

  useEffect(() => {
    const incomingOffset = entryOffset.current;
    if (incomingOffset === null) {
      return;
    }

    entryOffset.current = null;
    opacity.set(0);
    translateX.set(incomingOffset);
    opacity.set(withTiming(1, categoryViewTiming));
    translateX.set(
      withTiming(0, categoryViewTiming, (finished) => {
        if (finished) {
          runOnJS(finishTransition)();
        }
      }),
    );
  }, [displayedCategoryView, finishTransition, opacity, translateX]);

  const toggleCategoryView = () => {
    if (isTransitioning.current) {
      return;
    }

    const nextView: CategoryView = isGridVisible ? 'list' : 'grid';
    const outgoingOffset = motion.categoryViewTransitionTravel;

    isTransitioning.current = true;
    setSelectedCategoryView(nextView);
    onCategoryViewChange?.(nextView);
    opacity.set(withTiming(0, categoryViewTiming));
    translateX.set(
      withTiming(outgoingOffset, categoryViewTiming, (finished) => {
        if (finished) {
          runOnJS(showNextCategoryView)(nextView, -outgoingOffset);
        }
      }),
    );
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
        <ViewToggleButton
          accessibilityHint="Cambia cómo se muestran las categorías"
          accessibilityLabel={
            isGridVisible
              ? 'Cambiar a vista de lista'
              : 'Cambiar a vista de cuadrícula'
          }
          nextView={isGridVisible ? 'list' : 'grid'}
          onPress={toggleCategoryView}
          testID="activity-category-view-toggle"
        />
      </View>
      {categories.length > 0 ? (
        <>
          <Animated.View
            layout={getActivityLayoutTransition()}
            style={[
              displayedGridView || isListPaged
                ? styles.grid
                : styles.groupShadow,
              categoryViewAnimatedStyle,
            ]}
            testID="activity-category-preview-group"
          >
            {displayedGridView ? (
              <RowLimitedScroll
                columnGap={gridColumnGap}
                maxRows={gridMaxRows}
                rowGap={spacing.md}
                testID="activity-category-preview-list"
              >
                {categories.map(({ id, ...category }) => (
                  <CategoryPreviewCard
                    {...category}
                    actionTarget={{ kind: 'category', id }}
                    budgetExpenseMinor={budgetExpenseByCategoryId.get(id) ?? 0}
                    displayCurrency={currency}
                    key={id}
                    onPress={() => onOpenCategoryDetail?.(id, currency)}
                    spaceCurrency={spaceCurrency}
                    style={{ width: gridTileWidth }}
                    variant="grid"
                  />
                ))}
              </RowLimitedScroll>
            ) : isListPaged ? (
              <ScrollView
                contentContainerStyle={[
                  styles.listPages,
                  { paddingHorizontal: gutter },
                ]}
                decelerationRate="fast"
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={listPageWidth + spacing.md}
                style={[styles.listScroll, { marginLeft: -gutter, width }]}
                testID="activity-category-preview-list"
              >
                {listPages.map((pageCategories) => (
                  <View
                    key={pageCategories[0]!.id}
                    style={[styles.groupShadow, { width: listPageWidth }]}
                    testID="activity-category-preview-page"
                  >
                    {renderListPage(pageCategories)}
                  </View>
                ))}
              </ScrollView>
            ) : (
              renderListPage(categories, 'activity-category-preview-list')
            )}
          </Animated.View>
          {hasBreakdownData ? (
            <View style={styles.createCategoryBadge}>
              <CreatePreviewBadge
                accessibilityLabel="Crear categoría"
                bordered
                label="Crear categoría"
                onPress={onCreateCategory}
                testID="activity-add-category"
              />
            </View>
          ) : null}
        </>
      ) : (
        <View style={styles.createCategoryBadge}>
          <CreatePreviewBadge
            accessibilityLabel="Crear primera categoría"
            bordered
            label="Crear categoría"
            onPress={onCreateCategory}
            testID="activity-add-category"
          />
        </View>
      )}
    </Animated.View>
  );
}

function createStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    createCategoryBadge: { marginTop: spacing.md },
    grid: { width: '100%' },
    group: {
      overflow: 'hidden',
      backgroundColor: colors.surface,
      borderColor: colors.categoryPreviewBorder,
      borderRadius: previewCardLayout.borderRadius,
      borderWidth: 1,
    },
    listPages: {
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    listScroll: { flexGrow: 0, overflow: 'visible' },
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
  });
}
