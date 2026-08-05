import Ionicons from '@expo/vector-icons/Ionicons';
import {
  type GestureResponderEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon/CategoryIcon';
import type { Category } from '@/features/categories/types';
import type { SessionTransaction } from '@/features/transactions/types';
import { formatCurrency } from '@/lib/currency/formatCurrency';
import { categoryColors } from '@/theme/categoryColors';
import { colors } from '@/theme/colors';
import { iconSize } from '@/theme/layout';
import { previewCardLayout } from '@/theme/previewCard';
import { spacing } from '@/theme/spacing';

type TransactionPreviewCardProps = {
  category: Category | null;
  expandable?: boolean;
  expanded?: boolean;
  onPress?: () => void;
  onToggleExpanded?: () => void;
  stacked?: boolean;
  transaction: SessionTransaction;
};

const directionGlyphSize = iconSize.xs;
const stackLayerOffset = spacing.xs;
const stackLayerInset = spacing.sm;

export function TransactionPreviewCard({
  category,
  expandable,
  expanded = false,
  onPress,
  onToggleExpanded,
  stacked = false,
  transaction,
}: TransactionPreviewCardProps) {
  const isExpandable = expandable ?? stacked;
  const isIncome = transaction.type === 'income';
  const amount = formatCurrency(
    transaction.amountMinor,
    transaction.currency,
    'es-ES',
  );
  const date = new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${transaction.occurredOn}T12:00:00`));
  const title = transaction.title.trim() || category?.name || 'Sin categoría';

  const handleToggleExpanded = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onToggleExpanded?.();
  };

  return (
    <View style={stacked && !expanded ? styles.stackedContainer : undefined}>
      {stacked && !expanded ? (
        <>
          <View
            pointerEvents="none"
            style={[styles.stackLayer, styles.stackLayerBack]}
            testID="transaction-stack-layer-back"
          />
          <View
            pointerEvents="none"
            style={[styles.stackLayer, styles.stackLayerMiddle]}
            testID="transaction-stack-layer-middle"
          />
        </>
      ) : null}
      <Pressable
        accessibilityHint={
          onPress ? 'Abre el detalle del movimiento' : undefined
        }
        accessibilityLabel={`${isIncome ? 'Ingreso' : 'Gasto'}: ${title}, ${amount}, ${date}`}
        accessibilityRole={onPress ? 'button' : undefined}
        disabled={!onPress && !stacked}
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        testID="transaction-preview-card"
      >
        <View
          style={[
            styles.categoryIcon,
            {
              backgroundColor: category
                ? categoryColors[category.colorToken]
                : colors.textMuted,
            },
          ]}
        >
          {category ? (
            <CategoryIcon
              color={colors.onBrand}
              name={category.icon}
              size={previewCardLayout.glyphSize}
            />
          ) : (
            <Ionicons
              color={colors.onBrand}
              name="receipt"
              size={previewCardLayout.glyphSize}
            />
          )}
        </View>
        <View style={styles.content}>
          <Text numberOfLines={1} variant="label" weight="semibold">
            {title}
          </Text>
          <Text
            numberOfLines={1}
            style={styles.metadata}
            tone="secondary"
            variant="footnote"
          >
            {date}
          </Text>
        </View>
        <View
          style={styles.trailingContent}
          testID="transaction-trailing-content"
        >
          <Text
            align="right"
            numberOfLines={1}
            style={styles.amount}
            testID="transaction-amount"
            variant="label"
            weight="semibold"
          >
            {amount}
          </Text>
          <View
            style={styles.directionIcon}
            testID="transaction-direction-icon"
          >
            <View
              style={styles.diagonalArrow}
              testID="transaction-direction-arrow"
            >
              <Ionicons
                color={isIncome ? colors.income : colors.expense}
                name={isIncome ? 'arrow-up' : 'arrow-down'}
                size={directionGlyphSize}
                testID="transaction-direction-glyph"
              />
            </View>
          </View>
          {isExpandable ? (
            <Pressable
              accessibilityLabel={
                expanded
                  ? 'Contraer movimientos repetitivos'
                  : 'Desplegar movimientos repetitivos'
              }
              accessibilityRole="button"
              hitSlop={spacing.md}
              onPress={handleToggleExpanded}
              style={styles.expandButton}
              testID="transaction-group-toggle"
            >
              <Ionicons
                color={colors.textSecondary}
                name="chevron-down"
                size={iconSize.xs}
                style={expanded ? styles.expandIconOpen : undefined}
                testID="transaction-group-chevron"
              />
            </Pressable>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: previewCardLayout.minHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: previewCardLayout.gap,
    borderRadius: previewCardLayout.borderRadius,
    backgroundColor: colors.surface,
    paddingHorizontal: previewCardLayout.paddingHorizontal,
    paddingVertical: previewCardLayout.paddingVertical,
  },
  stackedContainer: {
    paddingBottom: stackLayerOffset * 2,
  },
  stackLayer: {
    position: 'absolute',
    left: stackLayerInset,
    right: stackLayerInset,
    minHeight: previewCardLayout.minHeight,
    borderRadius: previewCardLayout.borderRadius,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  stackLayerBack: {
    top: stackLayerOffset * 2,
    left: stackLayerInset * 2,
    right: stackLayerInset * 2,
  },
  stackLayerMiddle: {
    top: stackLayerOffset,
  },
  categoryIcon: {
    width: previewCardLayout.iconSize,
    height: previewCardLayout.iconSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: previewCardLayout.iconRadius,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  metadata: {
    marginTop: previewCardLayout.metadataGap,
  },
  trailingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: previewCardLayout.metadataGap,
    maxWidth: '48%',
  },
  amount: {
    flexShrink: 1,
  },
  directionIcon: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandButton: {
    minHeight: iconSize.md,
    minWidth: iconSize.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandIconOpen: {
    transform: [{ rotate: '180deg' }],
  },
  diagonalArrow: {
    transform: [{ rotate: '45deg' }],
  },
  pressed: { opacity: 0.64 },
});
