import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui/Text/Text';
import {
  AnimatedChevron,
  AnimatedDisclosureContent,
  getActivityLayoutTransition,
} from '@/features/activity/components/ActivityCollapsibleSection';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon/CategoryIcon';
import { ImportRow } from '@/features/import/components/ImportRow/ImportRow';
import type { Category } from '@/features/categories/types';
import type { ImportCandidateGroup } from '@/features/import/utils/groupImportCandidates';
import { iconSize } from '@/theme/layout';
import {
  categoryColors,
  getCategoryContentContrast,
} from '@/theme/categoryColors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type ImportMerchantGroupProps = {
  category: Category | null;
  group: ImportCandidateGroup;
  onPressCategory: () => void;
  onToggleCandidate: (candidateId: string) => void;
  onToggleSelected: () => void;
};

/**
 * Una unidad de revisión por comercio: una categoría para el grupo y filas
 * independientes para conservar tipo, fecha e importe de cada movimiento.
 */
export function ImportMerchantGroup({
  category,
  group,
  onPressCategory,
  onToggleCandidate,
  onToggleSelected,
}: ImportMerchantGroupProps) {
  const [expanded, setExpanded] = useState(group.candidates.length === 1);
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const selectableCandidates = group.candidates.filter(
    (candidate) =>
      candidate.duplicateStatus !== 'exact' &&
      candidate.occurredOn !== null &&
      candidate.amountMinor !== null &&
      candidate.type !== 'unknown' &&
      candidate.categoryId !== null,
  );
  const selectedCount = selectableCandidates.filter(
    (candidate) => candidate.selected,
  ).length;
  const allSelected =
    selectableCandidates.length > 0 &&
    selectedCount === selectableCandidates.length;
  const partiallySelected = selectedCount > 0 && !allSelected;
  const movementLabel =
    group.candidates.length === 1
      ? '1 movimiento'
      : `${group.candidates.length} movimientos`;
  const categoryContrast = category
    ? getCategoryContentContrast(category.colorToken)
    : null;
  const toggleExpanded = () => setExpanded((current) => !current);
  const handleSelectionPress = () => {
    if (!category) {
      onPressCategory();
      return;
    }

    onToggleSelected();
  };

  return (
    <Animated.View
      layout={getActivityLayoutTransition()}
      style={styles.container}
      testID="import-merchant-group"
    >
      <View style={styles.header}>
        <Pressable
          accessibilityLabel={
            !category
              ? `Elegir categoría para ${group.title}`
              : allSelected
                ? `Quitar ${group.title} de la importación`
                : `Incluir ${group.title} en la importación`
          }
          accessibilityRole="checkbox"
          accessibilityState={{
            checked: allSelected,
          }}
          hitSlop={spacing.sm}
          onPress={handleSelectionPress}
          testID="import-merchant-group-checkbox"
        >
          <Ionicons
            color={
              allSelected || partiallySelected ? colors.cta : colors.textMuted
            }
            name={
              allSelected
                ? 'checkmark-circle'
                : partiallySelected
                  ? 'remove-circle'
                  : 'ellipse-outline'
            }
            size={iconSize.md}
          />
        </Pressable>
        <View style={styles.heading}>
          <Text numberOfLines={1} variant="label" weight="semibold">
            {group.title}
          </Text>
          <Text tone="secondary" variant="footnote">
            {movementLabel}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={
            category
              ? `Cambiar categoría de ${group.title}: ${category.name}`
              : `Elegir categoría para ${group.title}`
          }
          accessibilityRole="button"
          hitSlop={spacing.sm}
          onPress={onPressCategory}
          style={[
            styles.categoryButton,
            {
              backgroundColor: category
                ? categoryColors[category.colorToken]
                : colors.cta,
              borderColor: category
                ? categoryColors[category.colorToken]
                : colors.cta,
              shadowColor: isDark ? '#000000' : colors.textPrimary,
              shadowOpacity: isDark ? 0.42 : 0.14,
            },
          ]}
        >
          {category && categoryContrast ? (
            <CategoryIcon
              color={categoryContrast.color}
              name={category.icon}
              size={iconSize.sm}
            />
          ) : null}
          <Text
            numberOfLines={1}
            tone={categoryContrast?.tone ?? 'onBrand'}
            variant="footnote"
            weight="semibold"
          >
            {category?.name ?? 'Elegir categoría'}
          </Text>
        </Pressable>
        {group.candidates.length > 1 ? (
          <Pressable
            accessibilityLabel={
              expanded
                ? `Contraer ${group.title}`
                : `Mostrar ${group.candidates.length} movimientos de ${group.title}`
            }
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            hitSlop={spacing.sm}
            onPress={toggleExpanded}
            style={styles.expandButton}
            testID="import-merchant-group-expand"
          >
            <AnimatedChevron color={colors.textSecondary} expanded={expanded} />
          </Pressable>
        ) : null}
      </View>

      <AnimatedDisclosureContent expanded={expanded}>
        <View style={styles.rows}>
          {group.candidates.map((candidate) => (
            <ImportRow
              candidate={candidate}
              category={category}
              key={candidate.id}
              onPressCategory={onPressCategory}
              onToggleSelected={() => onToggleCandidate(candidate.id)}
            />
          ))}
        </View>
      </AnimatedDisclosureContent>
    </Animated.View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: {
      gap: spacing.md,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing.sm,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    heading: { flex: 1, minWidth: 0, gap: spacing.xxs },
    categoryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      maxWidth: '40%',
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 3,
    },
    expandButton: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.sm,
      backgroundColor: colors.surface,
    },
    rows: { gap: spacing.sm },
  });
}
