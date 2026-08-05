import { useMemo, useState } from 'react';
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
import { colors } from '@/theme/colors';
import { motion } from '@/theme/motion';
import { previewCardLayout } from '@/theme/previewCard';
import { spacing } from '@/theme/spacing';
import { getDisclosureLayoutTransition } from '@/theme/transitions';

type TransactionPreviewListProps = {
  categories: readonly Category[];
  groupingTransactions?: readonly SessionTransaction[];
  limit?: number;
  onOpenTransactionDetail?: (transactionId: string) => void;
  testID?: string;
  transactions: readonly SessionTransaction[];
};

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
  categories,
  groupingTransactions,
  limit,
  onOpenTransactionDetail,
  testID,
  transactions,
}: TransactionPreviewListProps) {
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

  return (
    <Animated.View
      layout={getDisclosureLayoutTransition()}
      style={styles.list}
      testID={testID}
    >
      {groups.map((group) => {
        const [primary, ...children] = group.transactions;
        if (!primary) return null;

        const isCustomFolder =
          group.kind === 'custom' &&
          Boolean(
            primary.recurrenceGroupId &&
            (customGroupSizes.get(primary.recurrenceGroupId) ?? 0) > 1,
          );
        const isExpandable = isCustomFolder && children.length > 0;
        const isExpanded = isExpandable && expandedGroupIds.has(group.id);
        const category = categoriesById.get(primary.categoryId) ?? null;
        return (
          <Animated.View
            key={group.id}
            layout={getDisclosureLayoutTransition()}
            testID={isCustomFolder ? 'transaction-preview-group' : undefined}
          >
            <View style={isCustomFolder ? styles.mainCard : undefined}>
              <TransactionPreviewCard
                category={category}
                expandable={isExpandable}
                expanded={isExpanded}
                onPress={
                  onOpenTransactionDetail
                    ? () => onOpenTransactionDetail(primary.id)
                    : undefined
                }
                onToggleExpanded={() =>
                  setExpandedGroupIds((current) => {
                    const next = new Set(current);
                    if (next.has(group.id)) next.delete(group.id);
                    else next.add(group.id);
                    return next;
                  })
                }
                stacked={isCustomFolder}
                transaction={primary}
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
                          category={
                            categoriesById.get(transaction.categoryId) ?? null
                          }
                          onPress={
                            onOpenTransactionDetail
                              ? () => onOpenTransactionDetail(transaction.id)
                              : undefined
                          }
                          transaction={transaction}
                        />
                      </Animated.View>
                    ))
                  : null}
              </Animated.View>
            ) : null}
          </Animated.View>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
