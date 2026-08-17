import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { EmptyState } from '@/components/feedback/EmptyState/EmptyState';
import { Text } from '@/components/ui/Text/Text';
import { getActivityLayoutTransition } from '@/features/activity/components/ActivityCollapsibleSection';
import { CategoryPreviewCard } from '@/features/categories/components/CategoryPreviewCard/CategoryPreviewCard';
import type { CategorySummary } from '@/features/categories/utils/categorySummary';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { previewCardLayout } from '@/theme/previewCard';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

const categoryGroupBorderWidth = 2;
const categorySeparatorThickness = 1;

type ActivityCategoryDetailSectionProps = {
  budgetExpenseByCategoryId: ReadonlyMap<string, number>;
  /** Moneda visible de la pantalla de Actividad para los totales. */
  displayCurrency: CurrencyCode;
  onCreateCategory?: () => void;
  /** Abre el detalle en `displayCurrency`; la divisa es obligatoria. */
  onOpenCategoryDetail?: (categoryId: string, currency: CurrencyCode) => void;
  /** Moneda del espacio activo para presupuestos. */
  spaceCurrency: CurrencyCode;
  summaries: readonly CategorySummary[];
};

/**
 * Bloque «Detalle por categoría» de Actividad: agrupa las tarjetas de
 * categoría con sus separadores, o el estado vacío para crear la primera.
 * Extraído de `ActivityScreen` para mantener la pantalla por debajo del
 * umbral de deuda congelada sin comprimir código.
 */
export function ActivityCategoryDetailSection({
  budgetExpenseByCategoryId,
  displayCurrency,
  onCreateCategory,
  onOpenCategoryDetail,
  spaceCurrency,
  summaries,
}: ActivityCategoryDetailSectionProps) {
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));

  return (
    <Animated.View
      layout={getActivityLayoutTransition()}
      testID="activity-category-detail"
    >
      <Text
        accessibilityRole="header"
        style={styles.categoryDetailTitle}
        variant="label"
      >
        Detalle por categoría
      </Text>
      {summaries.length > 0 ? (
        <View
          style={styles.categoryGroupShadow}
          testID="activity-category-preview-group"
        >
          <View
            style={styles.categoryGroup}
            testID="activity-category-preview-list"
          >
            {summaries.map(({ id, ...category }, index) => (
              <View key={id}>
                <CategoryPreviewCard
                  {...category}
                  budgetExpenseMinor={budgetExpenseByCategoryId.get(id) ?? 0}
                  displayCurrency={displayCurrency}
                  onPress={() => onOpenCategoryDetail?.(id, displayCurrency)}
                  spaceCurrency={spaceCurrency}
                />
                {index < summaries.length - 1 ? (
                  <View
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                    style={styles.categorySeparator}
                    testID="activity-category-separator"
                  />
                ) : null}
              </View>
            ))}
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
    categoryGroupShadow: {
      ...shadows.subtle,
      borderRadius: previewCardLayout.borderRadius,
    },
    categoryGroup: {
      overflow: 'hidden',
      backgroundColor: colors.surface,
      borderColor: colors.categoryPreviewBorder,
      borderRadius: previewCardLayout.borderRadius,
      borderWidth: categoryGroupBorderWidth,
    },
    categorySeparator: {
      height: categorySeparatorThickness,
      backgroundColor: colors.categoryPreviewBorder,
    },
    categoryDetailTitle: {
      marginBottom: spacing.md,
      marginTop: spacing.xl,
    },
  });
}
