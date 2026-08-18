import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon/CategoryIcon';
import type { Category } from '@/features/categories/types';
import type { ImportedTransactionCandidate } from '@/features/import/types';
import { formatCurrency } from '@/lib/currency/formatCurrency';
import { categoryColors } from '@/theme/categoryColors';
import { iconSize } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type ImportRowProps = {
  candidate: ImportedTransactionCandidate;
  category: Category | null;
  onPressCategory: () => void;
  onToggleSelected: () => void;
};

const rowIconSize = 40;

function formatDate(occurredOn: string | null): string {
  if (!occurredOn) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${occurredOn}T12:00:00`));
}

/** Fila de revisión de un candidato de importación (Bible §51-§53). */
export function ImportRow({
  candidate,
  category,
  onPressCategory,
  onToggleSelected,
}: ImportRowProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isExactDuplicate = candidate.duplicateStatus === 'exact';
  // No tener categoría es una decisión normal de la revisión, no una alerta
  // visual. Esta exclusión también limpia batches creados por versiones previas.
  const visibleIssues = candidate.issues.filter(
    (issue) => issue.code !== 'unknown_category',
  );
  const hasIssues = visibleIssues.length > 0;
  const amountLabel =
    candidate.amountMinor !== null && candidate.currency !== null
      ? formatCurrency(candidate.amountMinor, candidate.currency, 'es-ES')
      : '—';

  return (
    <View
      style={[styles.card, isExactDuplicate && styles.dimmed]}
      testID="import-row"
    >
      <View style={styles.mainRow}>
        <Pressable
          accessibilityLabel={
            candidate.selected
              ? 'Quitar de la importación'
              : 'Incluir en la importación'
          }
          accessibilityRole="checkbox"
          accessibilityState={{ checked: candidate.selected }}
          hitSlop={spacing.sm}
          onPress={onToggleSelected}
          testID="import-row-checkbox"
        >
          <Ionicons
            color={candidate.selected ? colors.brand : colors.textMuted}
            name={candidate.selected ? 'checkbox' : 'square-outline'}
            size={iconSize.md}
          />
        </Pressable>

        <Pressable
          accessibilityLabel={
            category ? `Categoría: ${category.name}` : 'Elegir categoría'
          }
          accessibilityRole="button"
          onPress={onPressCategory}
          style={styles.categoryIcon}
        >
          {category ? (
            <View
              style={[
                styles.categoryIconInner,
                { backgroundColor: categoryColors[category.colorToken] },
              ]}
            >
              <CategoryIcon
                color={colors.onBrand}
                name={category.icon}
                size={iconSize.sm}
              />
            </View>
          ) : (
            <View style={[styles.categoryIconInner, styles.categoryIconEmpty]}>
              <Ionicons
                color={colors.textMuted}
                name="help"
                size={iconSize.sm}
              />
            </View>
          )}
        </Pressable>

        <View style={styles.content}>
          <Text numberOfLines={1} variant="label" weight="semibold">
            {candidate.displayTitle}
          </Text>
          <Text
            numberOfLines={1}
            style={styles.metadata}
            tone="secondary"
            variant="footnote"
          >
            {formatDate(candidate.occurredOn)}
            {category ? ` · ${category.name}` : ''}
          </Text>
        </View>

        <Text
          align="right"
          numberOfLines={1}
          tone={candidate.type === 'income' ? 'income' : 'primary'}
          variant="label"
          weight="semibold"
        >
          {amountLabel}
        </Text>
      </View>

      {hasIssues ? (
        <View style={styles.issues}>
          {visibleIssues.map((issue, index) => (
            <Text
              key={`${issue.code}-${index}`}
              tone="expense"
              variant="footnote"
            >
              ⚠ {issue.message}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    card: {
      gap: spacing.xs,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      padding: spacing.md,
    },
    dimmed: { opacity: 0.56 },
    mainRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    categoryIcon: { padding: spacing.xxs },
    categoryIconInner: {
      width: rowIconSize,
      height: rowIconSize,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
    },
    categoryIconEmpty: {
      borderColor: colors.border,
      borderWidth: 1,
      backgroundColor: colors.keypad,
    },
    content: { flex: 1, minWidth: 0 },
    metadata: { marginTop: spacing.xxs },
    issues: { gap: spacing.xxs, paddingLeft: rowIconSize + spacing.sm * 2 },
  });
}
