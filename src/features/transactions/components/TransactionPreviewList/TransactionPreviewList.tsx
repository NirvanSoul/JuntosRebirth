import {
  type ComponentProps,
  memo,
  useDeferredValue,
  useMemo,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeOutUp,
  ReduceMotion,
} from 'react-native-reanimated';

import type { Category } from '@/features/categories/types';
import { TransactionPreviewCard } from '@/features/transactions/components/TransactionPreviewCard/TransactionPreviewCard';
import type { SessionTransaction } from '@/features/transactions/types';
import { motion } from '@/theme/motion';
import { previewCardLayout } from '@/theme/previewCard';
import { spacing } from '@/theme/spacing';
import {
  getStartupEntering,
  getDisclosureLayoutTransition,
} from '@/theme/transitions';
import type { ColorTokens } from '@/theme/types';
import { useThemedStyles } from '@/theme/useThemedStyles';

type TransactionPreviewListProps = {
  animateEntrance?: boolean;
  categories: readonly Category[];
  groupingTransactions?: readonly SessionTransaction[];
  limit?: number;
  onOpenTransactionDetail?: (transactionId: string) => void;
  /**
   * Pinta primero unas pocas filas y el resto en un render diferido. Para
   * listas dentro de hojas: así montar la hoja no espera al historial entero.
   */
  progressive?: boolean;
  showAuthorName?: boolean;
  testID?: string;
  transactions: readonly SessionTransaction[];
};

/** Filas que caben en la primera pantalla de una hoja. */
const progressiveInitialGroups = 12;

type TransactionPreviewGroup = {
  id: string;
  kind: 'custom' | 'single';
  transactions: SessionTransaction[];
};

function getGroupItemEntering(index: number) {
  return FadeInDown.duration(motion.disclosureRevealDuration)
    .delay(index * (motion.disclosureItemStagger / 2))
    .easing(Easing.inOut(Easing.cubic))
    .reduceMotion(ReduceMotion.System);
}

function getGroupItemExiting(index: number) {
  return FadeOutUp.duration(motion.disclosureExitDuration)
    .delay(index * (motion.disclosureItemStagger / 2))
    .easing(Easing.inOut(Easing.cubic))
    .reduceMotion(ReduceMotion.System);
}

export function groupTransactionsForPreview(
  transactions: readonly SessionTransaction[],
): TransactionPreviewGroup[] {
  const groups: TransactionPreviewGroup[] = [];
  const recurringGroups = new Map<string, TransactionPreviewGroup>();

  for (const transaction of transactions) {
    const isCustom = transaction.recurrence === 'custom';
    const groupId = isCustom ? transaction.recurrenceGroupId : undefined;

    if (!groupId) {
      groups.push({
        id: transaction.recurrenceSeriesId
          ? `${transaction.id}:${transaction.occurredOn}`
          : transaction.id,
        kind: 'single',
        transactions: [transaction],
      });
      continue;
    }

    const key = `custom:${groupId}`;
    const existing = recurringGroups.get(key);
    if (existing) {
      existing.transactions.push(transaction);
      continue;
    }

    const group: TransactionPreviewGroup = {
      id: key,
      kind: 'custom',
      transactions: [transaction],
    };
    recurringGroups.set(key, group);
    groups.push(group);
  }

  return groups;
}

export function TransactionPreviewList({
  animateEntrance = false,
  categories,
  groupingTransactions,
  limit,
  onOpenTransactionDetail,
  progressive = false,
  showAuthorName = false,
  testID,
  transactions,
}: TransactionPreviewListProps) {
  const styles = useThemedStyles(createStyles);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(
    () => new Set(),
  );
  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const resolvedGroupingTransactions = groupingTransactions ?? transactions;
  const customGroupSizes = useMemo(() => {
    const sizes = new Map<string, number>();

    for (const transaction of resolvedGroupingTransactions) {
      if (
        transaction.recurrence !== 'custom' ||
        !transaction.recurrenceGroupId
      ) {
        continue;
      }

      sizes.set(
        transaction.recurrenceGroupId,
        (sizes.get(transaction.recurrenceGroupId) ?? 0) + 1,
      );
    }

    return sizes;
  }, [resolvedGroupingTransactions]);
  const groups = useMemo(() => {
    const grouped = groupTransactionsForPreview(transactions);
    return limit === undefined ? grouped : grouped.slice(0, limit);
  }, [limit, transactions]);
  const initialGroups = useMemo(
    () => (progressive ? groups.slice(0, progressiveInitialGroups) : groups),
    [groups, progressive],
  );
  const deferredGroups = useDeferredValue(groups, initialGroups);
  // Fuera del modo progresivo no se difiere: cada cambio se pintaría dos veces.
  const renderedGroups = progressive ? deferredGroups : groups;
  const toggleGroup = (groupId: string) =>
    setExpandedGroupIds((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });

  return (
    <Animated.View
      layout={getDisclosureLayoutTransition()}
      style={styles.list}
      testID={testID}
    >
      {renderedGroups.map((group, index) => {
        const [primary, ...children] = group.transactions;
        if (!primary) return null;

        const isCustomFolder =
          group.kind === 'custom' &&
          Boolean(
            primary.recurrenceGroupId &&
            (customGroupSizes.get(primary.recurrenceGroupId) ?? 0) > 1,
          );
        const isExpandable = isCustomFolder && children.length > 0;
        return (
          <TransactionPreviewGroupRow
            categories={group.transactions.map(
              (transaction) =>
                categoriesById.get(transaction.categoryId) ?? null,
            )}
            entering={
              animateEntrance ? getStartupEntering(index + 5) : undefined
            }
            groupId={group.id}
            isCustomFolder={isCustomFolder}
            isExpandable={isExpandable}
            isExpanded={isExpandable && expandedGroupIds.has(group.id)}
            key={group.id}
            onOpenTransactionDetail={onOpenTransactionDetail}
            onToggleGroup={toggleGroup}
            showAuthorName={showAuthorName}
            transactions={group.transactions}
          />
        );
      })}
    </Animated.View>
  );
}

type TransactionPreviewCardExtras = Pick<
  ComponentProps<typeof TransactionPreviewCard>,
  'hideAuthor' | 'spaceLabel'
>;

type TransactionPreviewGroupRowProps = {
  /** Categoría de cada movimiento de `transactions`, en el mismo orden. */
  categories: readonly (Category | null)[];
  /** Datos extra de la tarjeta de cada movimiento, fuera de la lista general. */
  cardExtras?: (
    transaction: SessionTransaction,
  ) => TransactionPreviewCardExtras;
  entering?: ReturnType<typeof getStartupEntering>;
  groupId: string;
  isCustomFolder: boolean;
  isExpandable: boolean;
  isExpanded: boolean;
  onOpenTransactionDetail?: (transactionId: string) => void;
  onToggleGroup: (groupId: string) => void;
  showAuthorName: boolean;
  transactions: readonly SessionTransaction[];
};

function isSameDisplayedTransaction(
  a: SessionTransaction,
  b: SessionTransaction,
): boolean {
  return (
    a.id === b.id &&
    a.title === b.title &&
    a.amountMinor === b.amountMinor &&
    a.currency === b.currency &&
    a.type === b.type &&
    a.occurredOn === b.occurredOn &&
    a.createdBy === b.createdBy
  );
}

function isSameDisplayedCategory(
  a: Category | null,
  b: Category | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.icon === b.icon &&
    a.colorToken === b.colorToken
  );
}

/**
 * Compara lo que la fila pinta, no la identidad de los objetos: cada recarga
 * desde SQLite crea objetos nuevos para todo el historial, y sin esto un solo
 * movimiento nuevo repintaba todas las filas. `entering` se ignora porque solo
 * actúa al montar; con él, insertar una fila arriba repintaba las de debajo.
 */
function areGroupRowPropsEqual(
  previous: TransactionPreviewGroupRowProps,
  next: TransactionPreviewGroupRowProps,
): boolean {
  return (
    previous.cardExtras === next.cardExtras &&
    previous.groupId === next.groupId &&
    previous.isCustomFolder === next.isCustomFolder &&
    previous.isExpandable === next.isExpandable &&
    previous.isExpanded === next.isExpanded &&
    previous.onOpenTransactionDetail === next.onOpenTransactionDetail &&
    previous.onToggleGroup === next.onToggleGroup &&
    previous.showAuthorName === next.showAuthorName &&
    previous.transactions.length === next.transactions.length &&
    previous.transactions.every((transaction, index) =>
      isSameDisplayedTransaction(transaction, next.transactions[index]!),
    ) &&
    previous.categories.every((category, index) =>
      isSameDisplayedCategory(category, next.categories[index] ?? null),
    )
  );
}

/**
 * Un movimiento o un hilo plegado de movimientos relacionados: el primero va
 * arriba y el resto se revela debajo al tocar la flecha.
 */
export const TransactionPreviewGroupRow = memo(
  function TransactionPreviewGroupRow({
    categories,
    cardExtras,
    entering,
    groupId,
    isCustomFolder,
    isExpandable,
    isExpanded,
    onOpenTransactionDetail,
    onToggleGroup,
    showAuthorName,
    transactions,
  }: TransactionPreviewGroupRowProps) {
    const styles = useThemedStyles(createStyles);
    const [primary, ...children] = transactions;
    if (!primary) return null;

    return (
      <Animated.View
        entering={entering}
        layout={getDisclosureLayoutTransition()}
        testID={isCustomFolder ? 'transaction-preview-group' : undefined}
      >
        <View style={isCustomFolder ? styles.mainCard : undefined}>
          <TransactionPreviewCard
            category={categories[0] ?? null}
            expandable={isExpandable}
            expanded={isExpanded}
            onPress={
              onOpenTransactionDetail
                ? () => onOpenTransactionDetail(primary.id)
                : undefined
            }
            onToggleExpanded={() => onToggleGroup(groupId)}
            showAuthorName={showAuthorName}
            stacked={isCustomFolder}
            transaction={primary}
            {...cardExtras?.(primary)}
          />
        </View>
        {isExpandable ? (
          <Animated.View
            layout={getDisclosureLayoutTransition()}
            style={isExpanded ? styles.tree : undefined}
            testID={isExpanded ? 'transaction-preview-tree' : undefined}
          >
            {isExpanded
              ? children.map((transaction, index) => (
                  <Animated.View
                    entering={getGroupItemEntering(index)}
                    exiting={getGroupItemExiting(index)}
                    key={transaction.id}
                    layout={getDisclosureLayoutTransition()}
                    testID="transaction-preview-tree-item"
                  >
                    <TransactionPreviewCard
                      category={categories[index + 1] ?? null}
                      onPress={
                        onOpenTransactionDetail
                          ? () => onOpenTransactionDetail(transaction.id)
                          : undefined
                      }
                      showAuthorName={showAuthorName}
                      transaction={transaction}
                      {...cardExtras?.(transaction)}
                    />
                  </Animated.View>
                ))
              : null}
          </Animated.View>
        ) : null}
      </Animated.View>
    );
  },
  areGroupRowPropsEqual,
);

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    list: {
      gap: previewCardLayout.listGap,
    },
    mainCard: {
      zIndex: 1,
    },
    tree: {
      gap: previewCardLayout.listGap,
      marginTop: spacing.sm,
      marginLeft: spacing.lg,
      paddingLeft: spacing.md,
      borderLeftColor: colors.border,
      borderLeftWidth: 2,
      overflow: 'hidden',
      zIndex: 0,
    },
  });
}
