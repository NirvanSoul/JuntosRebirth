import Ionicons from '@expo/vector-icons/Ionicons';
import {
  type GestureResponderEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { usePreviewActionsTrigger } from '@/components/overlays/PreviewActions/previewActions';
import { PreviewSelectionFrame } from '@/components/overlays/PreviewActions/PreviewSelectionFrame';
import { usePreviewSelection } from '@/components/overlays/PreviewActions/previewSelection';
import { Avatar } from '@/components/ui/Avatar/Avatar';
import { Text } from '@/components/ui/Text/Text';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon/CategoryIcon';
import type { Category } from '@/features/categories/types';
import type { SessionTransaction } from '@/features/transactions/types';
import { useTransactionAuthor } from '@/features/transactions/hooks/useTransactionAuthor';
import { formatAuthorName } from '@/features/transactions/utils/transactionAuthor';
import { formatNumericLocalDate } from '@/lib/date/localDate';
import { useCurrencySymbolPreference } from '@/state/appPreferences/CurrencySymbolPreferenceProvider';
import { categoryColors } from '@/theme/categoryColors';
import { iconSize } from '@/theme/layout';
import { previewCardLayout } from '@/theme/previewCard';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type TransactionPreviewCardProps = {
  category: Category | null;
  expandable?: boolean;
  expanded?: boolean;
  onPress?: () => void;
  onToggleExpanded?: () => void;
  /**
   * Oculta el autor aunque el censo publicado sea de un espacio compartido:
   * para una lista que mezcla movimientos personales y compartidos.
   */
  hideAuthor?: boolean;
  showAuthorName?: boolean;
  /** Espacio del movimiento, tras la fecha, cuando la lista mezcla espacios. */
  spaceLabel?: string;
  stacked?: boolean;
  transaction: SessionTransaction;
};

const directionGlyphSize = iconSize.xs;
const stackLayerOffset = spacing.xs;
const stackLayerInset = spacing.sm;
const authorAvatarSize = 16;

export function TransactionPreviewCard(props: TransactionPreviewCardProps) {
  const {
    category,
    expandable,
    expanded = false,
    onPress,
    onToggleExpanded,
    hideAuthor = false,
    showAuthorName = false,
    spaceLabel,
    stacked = false,
    transaction,
  } = props;
  const { formatCurrency } = useCurrencySymbolPreference();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  // `undefined` en un espacio personal: allí el círculo del autor sería ruido.
  const contextAuthor = useTransactionAuthor(transaction.createdBy);
  const author = hideAuthor ? undefined : contextAuthor;
  const isExpandable = expandable ?? stacked;
  // Un grupo plegado representa varios movimientos: no hay uno sobre el que actuar.
  const actionId = stacked && !expanded ? undefined : transaction.id;
  const previewActions = usePreviewActionsTrigger(
    actionId === undefined ? undefined : { kind: 'transaction', id: actionId },
    () => <TransactionPreviewCard {...props} />,
    { selectable: true },
  );
  // En la selección múltiple tocar la tarjeta la marca en vez de abrirla.
  const selection = usePreviewSelection('transaction', actionId);
  const isSelecting = selection.status !== 'off';
  const isIncome = transaction.type === 'income';
  const amount = formatCurrency(
    transaction.amountMinor,
    transaction.currency,
    'es-ES',
  );
  const date = formatNumericLocalDate(transaction.occurredOn);
  const title = transaction.title.trim() || category?.name || 'Sin categoría';
  // El círculo del autor es puramente visual: sin esto, quien use un lector de
  // pantalla no tendría forma de saber quién creó el movimiento.
  const authorLabel = author ? `. Autor: ${formatAuthorName(author)}` : '';

  const handleToggleExpanded = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onToggleExpanded?.();
  };

  return (
    <PreviewSelectionFrame
      onToggle={selection.toggle}
      status={selection.status}
      tone={selection.mode === 'delete' ? 'destructive' : 'cta'}
    >
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
            isSelecting
              ? undefined
              : onPress
                ? 'Abre el detalle del movimiento'
                : undefined
          }
          accessibilityLabel={`${isIncome ? 'Ingreso' : 'Gasto'}: ${title}, ${amount}, ${date}${authorLabel}`}
          accessibilityRole={
            isSelecting ? 'checkbox' : onPress ? 'button' : undefined
          }
          accessibilityState={
            isSelecting
              ? {
                  checked: selection.status === 'selected',
                  disabled: selection.status === 'disabled',
                }
              : undefined
          }
          disabled={
            isSelecting
              ? selection.status === 'disabled'
              : !onPress && !stacked && !previewActions
          }
          onPress={isSelecting ? selection.toggle : onPress}
          {...(isSelecting ? null : previewActions)}
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
            <View style={styles.metadata}>
              {author ? (
                <Avatar
                  size={authorAvatarSize}
                  testID="transaction-author-avatar"
                  uri={author.profile?.avatarUri}
                />
              ) : null}
              {author && showAuthorName ? (
                <Text
                  numberOfLines={1}
                  testID="transaction-author-name"
                  tone="secondary"
                  variant="footnote"
                >
                  {formatAuthorName(author)}
                </Text>
              ) : null}
              <Text numberOfLines={1} tone="secondary" variant="footnote">
                {date}
              </Text>
              {spaceLabel ? (
                <>
                  <Text tone="secondary" variant="footnote">
                    ·
                  </Text>
                  <Text numberOfLines={1} tone="secondary" variant="footnote">
                    {spaceLabel}
                  </Text>
                </>
              ) : null}
            </View>
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
    </PreviewSelectionFrame>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
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
}
