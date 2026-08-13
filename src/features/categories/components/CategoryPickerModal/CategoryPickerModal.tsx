import { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { GradientCard } from '@/components/ui/GradientCard/GradientCard';
import { Text } from '@/components/ui/Text/Text';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon/CategoryIcon';
import {
  CategorySelectionCard,
  categorySelectionCardHeight,
} from '@/features/categories/components/CategorySelectionCard/CategorySelectionCard';
import {
  defaultCategoryPages,
  type DefaultCategoryDefinition,
} from '@/features/categories/constants/defaultCategories';
import type { Category } from '@/features/categories/types';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { triggerHaptic } from '@/lib/haptics/haptics';
import { categoryColors } from '@/theme/categoryColors';
import { createDiagonalGradient } from '@/theme/gradients';
import { iconSize, layout } from '@/theme/layout';
import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { maxFontScale, typography } from '@/theme/typography';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

export type CategoryPickerSelection = {
  type: 'category';
  categoryId: string;
};

type CategoryPickerModalProps = {
  categories: readonly Category[];
  mode: CategoryPickerMode;
  selectedCategoryId: string | null;
  visible: boolean;
  onClose: () => void;
  onCreateCategory: () => void;
  onCreateTemplates: (
    definitions: readonly DefaultCategoryDefinition[],
  ) => void;
  onSelect: (selection: CategoryPickerSelection | null) => void;
};

type CategoryPickerMode = 'create' | 'select';

const saveButtonMinWidth = 80;
const categoryRowsPerPage = 3;
const categoryColumnsPerPage = 3;
const categoriesPerPage = categoryRowsPerPage * categoryColumnsPerPage;

type CategoryPickerItem = Category | DefaultCategoryDefinition;

function isCreatedCategory(item: CategoryPickerItem): item is Category {
  return 'spaceId' in item;
}

function paginateCategories(
  categories: readonly Category[],
): readonly (readonly Category[])[] {
  const pages: Category[][] = [];

  for (let index = 0; index < categories.length; index += categoriesPerPage) {
    pages.push(categories.slice(index, index + categoriesPerPage));
  }

  return pages;
}

function CategoryPageIndicatorDot({
  active,
  index,
}: {
  active: boolean;
  index: number;
}) {
  const { colors } = useTheme();
  const themedStyles = useThemedStyles(createStyles);
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(active ? 1 : 0, {
      ...motion.categoryPageIndicatorSpring,
      reduceMotion: ReduceMotion.System,
    });
  }, [active, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0, 1], [spacing.md, spacing.xl]),
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.border, colors.textSecondary],
    ),
  }));

  return (
    <Animated.View
      style={[themedStyles.dot, animatedStyle]}
      testID={`category-page-indicator-${index}`}
    />
  );
}

export function CategoryPickerModal({
  categories,
  mode,
  selectedCategoryId,
  visible,
  onClose,
  onCreateCategory,
  onCreateTemplates,
  onSelect,
}: CategoryPickerModalProps) {
  const density = useLayoutDensity();
  const { colors } = useTheme();
  const themedStyles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const [displayMode, setDisplayMode] = useState<CategoryPickerMode>(mode);
  const gutter = layout.screenGutter[density];
  const pageWidth = width;
  const pageContentWidth = pageWidth - gutter * 2;
  const cardWidth =
    (pageContentWidth - spacing.sm * (categoryColumnsPerPage - 1)) /
    categoryColumnsPerPage;
  const createdCategoryPages = useMemo(
    () => paginateCategories(categories),
    [categories],
  );
  const displayedPages: readonly (readonly CategoryPickerItem[])[] =
    displayMode === 'select' ? createdCategoryPages : defaultCategoryPages;
  const visibleRows =
    displayMode === 'select'
      ? Math.max(
          1,
          Math.ceil(
            Math.min(categories.length, categoriesPerPage) /
              categoryColumnsPerPage,
          ),
        )
      : categoryRowsPerPage;
  const pageHeight =
    categorySelectionCardHeight[density] * visibleRows +
    spacing.sm * (visibleRows - 1);
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedTemplateKeys, setSelectedTemplateKeys] = useState<string[]>(
    [],
  );
  const [duplicateNoticeVisible, setDuplicateNoticeVisible] = useState(false);
  const pageViewabilityConfig = useMemo(
    () => ({ itemVisiblePercentThreshold: 2 }),
    [],
  );

  useEffect(() => {
    if (visible) {
      setPageIndex(0);
      setDisplayMode(mode);
      setSelectedTemplateKeys([]);
      setDuplicateNoticeVisible(false);
    }
  }, [mode, visible]);

  useEffect(() => {
    if (visible) {
      triggerHaptic('modalOpen');
    }
  }, [visible]);

  const selectedDefinitions = defaultCategoryPages
    .flat()
    .filter((definition) => selectedTemplateKeys.includes(definition.key));

  const headerHeight = Math.max(
    layout.minTouchTarget,
    typography.heading.lineHeight * maxFontScale.heading +
      spacing.xs +
      typography.label.lineHeight * maxFontScale.label,
  );
  const catalogContentHeight =
    headerHeight +
    spacing.xl +
    pageHeight +
    (displayedPages.length > 1 ? spacing.md + spacing.sm : 0) +
    spacing.md +
    spacing.md +
    layout.actionHeight[density];

  return (
    <AppModal
      contentHeight={catalogContentHeight}
      onClose={onClose}
      stackBehavior="push"
      testID="category-picker-modal"
      variant="catalog"
      visible={visible}
    >
      <View>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text accessibilityRole="header" variant="heading">
              {displayMode === 'select'
                ? 'Elige una categoría'
                : 'Nueva categoría'}
            </Text>
            <Text style={styles.subtitle} tone="secondary" variant="label">
              {duplicateNoticeVisible
                ? 'Ya creaste esta categoría.'
                : displayMode === 'select'
                  ? 'Selecciona una de las categorías de este espacio.'
                  : 'Elige la categoría que va contigo.'}
            </Text>
          </View>
          <ModalCloseButton onPress={onClose} />
        </View>

        <FlatList
          data={displayedPages}
          directionalLockEnabled
          getItemLayout={(_, index) => ({
            index,
            length: pageWidth,
            offset: pageWidth * index,
          })}
          horizontal
          initialNumToRender={displayedPages.length}
          key={`category-pages-${displayMode}`}
          keyExtractor={(_, index) => `category-page-${index}`}
          nestedScrollEnabled
          onMomentumScrollEnd={(event) =>
            setPageIndex(
              Math.round(event.nativeEvent.contentOffset.x / pageWidth),
            )
          }
          onViewableItemsChanged={({ changed }) => {
            const newlyVisiblePage = changed.find(
              ({ index, isViewable }) => isViewable && index !== null,
            );

            if (typeof newlyVisiblePage?.index === 'number') {
              setPageIndex(newlyVisiblePage.index);
            }
          }}
          pagingEnabled
          renderItem={({ item: page }) => (
            <View
              style={[
                styles.grid,
                {
                  width: pageWidth,
                  height: pageHeight,
                  paddingHorizontal: gutter,
                },
              ]}
            >
              {page.map((item) => {
                if (isCreatedCategory(item)) {
                  const selected = item.id === selectedCategoryId;

                  return (
                    <CategorySelectionCard
                      accessibilityLabel={item.name}
                      category={item}
                      height={categorySelectionCardHeight[density]}
                      key={item.id}
                      onPress={() =>
                        onSelect({
                          type: 'category',
                          categoryId: item.id,
                        })
                      }
                      selected={selected}
                      width={cardWidth}
                    />
                  );
                }

                const definition = item;
                const existingCategory = categories.find(
                  (category) =>
                    category.templateKey === definition.key &&
                    category.isDefault,
                );
                const alreadyCreated = Boolean(existingCategory);
                const disabled = displayMode === 'create' && alreadyCreated;
                const selected = selectedTemplateKeys.includes(definition.key);
                const categoryColor = categoryColors[definition.colorToken];
                return (
                  <Pressable
                    accessibilityLabel={
                      disabled
                        ? `${definition.name}, ya creada`
                        : definition.name
                    }
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected, disabled }}
                    key={definition.key}
                    onPress={() => {
                      if (alreadyCreated) {
                        setDuplicateNoticeVisible(true);
                        void AccessibilityInfo.announceForAccessibility(
                          'Ya creaste esta categoría.',
                        );
                        return;
                      }

                      setDuplicateNoticeVisible(false);
                      setSelectedTemplateKeys((current) =>
                        current.includes(definition.key)
                          ? current.filter((key) => key !== definition.key)
                          : [...current, definition.key],
                      );
                    }}
                    style={({ pressed }) => [
                      themedStyles.categoryCard,
                      {
                        width: cardWidth,
                        height: categorySelectionCardHeight[density],
                      },
                      selected && styles.selectedCategoryCard,
                      disabled && styles.createdCategoryCard,
                      pressed && styles.pressed,
                    ]}
                  >
                    {selected && (
                      <GradientCard
                        colors={createDiagonalGradient(categoryColor)}
                        pointerEvents="none"
                        style={styles.selectedGradient}
                        testID={`category-template-${definition.key}-selected-gradient`}
                      />
                    )}
                    <View
                      style={[
                        styles.categoryIcon,
                        !selected && { backgroundColor: categoryColor },
                      ]}
                      testID={`category-template-${definition.key}-icon`}
                    >
                      <CategoryIcon
                        color={colors.onBrand}
                        name={definition.icon}
                        size={iconSize.md}
                      />
                    </View>
                    <Text
                      align="center"
                      numberOfLines={2}
                      tone={selected ? 'onBrand' : 'primary'}
                      variant="footnote"
                      weight="semibold"
                    >
                      {definition.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          showsHorizontalScrollIndicator={false}
          style={[
            styles.pages,
            { width: pageWidth, height: pageHeight, marginLeft: -gutter },
          ]}
          testID="category-template-pages"
          viewabilityConfig={pageViewabilityConfig}
        />

        <View
          accessibilityLabel={`Página ${pageIndex + 1} de ${displayedPages.length}`}
          style={styles.dots}
        >
          {displayedPages.length > 1 &&
            displayedPages.map((_, index) => (
              <CategoryPageIndicatorDot
                active={index === pageIndex}
                key={index}
                index={index}
              />
            ))}
        </View>

        <View style={styles.actions}>
          <ModalPrimaryAction
            accessibilityLabel={
              displayMode === 'select'
                ? 'Crear categoría'
                : 'Crear otra categoría'
            }
            icon="add"
            label={
              displayMode === 'select'
                ? 'Crear categoría'
                : 'Crear otra categoría'
            }
            onPress={() => {
              if (displayMode === 'select') {
                setPageIndex(0);
                setDisplayMode('create');
                setSelectedTemplateKeys([]);
                setDuplicateNoticeVisible(false);
                return;
              }

              onCreateCategory();
            }}
            style={styles.createButton}
            variant="surface"
          />
          {displayMode === 'create' && (
            <ModalPrimaryAction
              accessibilityLabel="Guardar categorías"
              disabled={selectedDefinitions.length === 0}
              label="Guardar"
              onPress={() => onCreateTemplates(selectedDefinitions)}
              style={styles.saveButton}
            />
          )}
        </View>
      </View>
    </AppModal>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    categoryCard: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      padding: spacing.sm,
    },
    dot: {
      width: spacing.md,
      height: spacing.xs,
      borderRadius: radii.round,
      backgroundColor: colors.border,
    },
  });
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  headerText: { flex: 1 },
  subtitle: { marginTop: spacing.xs },
  pages: { flexGrow: 0, marginTop: spacing.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  selectedCategoryCard: {
    borderWidth: 0,
  },
  createdCategoryCard: { opacity: 0.52 },
  selectedGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.md,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  createButton: {
    flex: 2.5,
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  saveButton: {
    minWidth: saveButtonMinWidth,
    flex: 0.7,
    paddingHorizontal: spacing.sm,
  },
  pressed: { opacity: 0.72 },
});
