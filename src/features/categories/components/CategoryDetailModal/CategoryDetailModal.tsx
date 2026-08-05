import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppModal,
  useAppModalBottomInset,
} from '@/components/overlays/AppModal/AppModal';
import { CopyToSpaceModal } from '@/components/overlays/CopyToSpaceModal/CopyToSpaceModal';
import { DetailActionMenu } from '@/components/overlays/DetailActionMenu/DetailActionMenu';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { Text } from '@/components/ui/Text/Text';
import { CategoryBudgetProgress } from '@/features/categories/components/CategoryBudgetProgress/CategoryBudgetProgress';
import { CategoryBudgetModal } from '@/features/categories/components/CategoryDetailModal/CategoryBudgetModal';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon/CategoryIcon';
import type {
  Category,
  CategoryShareTarget,
} from '@/features/categories/types';
import { summarizeCategories } from '@/features/categories/utils/categorySummary';
import { TransactionPreviewList } from '@/features/transactions/components/TransactionPreviewList/TransactionPreviewList';
import type { SessionTransaction } from '@/features/transactions/types';
import { listTransactionsThroughCurrentMonth } from '@/features/transactions/utils/transactionSummary';
import { formatCurrency } from '@/lib/currency/formatCurrency';
import { triggerHaptic } from '@/lib/haptics/haptics';
import { categoryColors } from '@/theme/categoryColors';
import { colors } from '@/theme/colors';
import { iconSize, layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';

type DetailPanel = 'delete' | null;

type CategoryDetailModalProps = {
  category: Category | null;
  onAddTransaction: (categoryId: string) => void;
  onClose: () => void;
  onDelete: (categoryId: string) => void;
  onEdit: (categoryId: string) => void;
  onSaveBudget: (categoryId: string, budgetMinor?: number) => void;
  onShare: (
    categoryId: string,
    targetSpaceId: string,
  ) => boolean | Promise<boolean>;
  shareTargets: readonly CategoryShareTarget[];
  transactions: readonly SessionTransaction[];
  visible: boolean;
};

const heroIconSize = 76;

type ActionButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

function ActionButton({ icon, label, onPress }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
    >
      <Ionicons
        color={colors.textMuted}
        name={icon}
        size={iconSize.md}
        testID={`category-action-icon-${icon}`}
      />
      <Text align="center" variant="footnote" weight="semibold">
        {label}
      </Text>
    </Pressable>
  );
}

export function CategoryDetailModal({
  category,
  onAddTransaction,
  onClose,
  onDelete,
  onEdit,
  onSaveBudget,
  onShare,
  shareTargets,
  transactions,
  visible,
}: CategoryDetailModalProps) {
  const [panel, setPanel] = useState<DetailPanel>(null);
  const [isBudgetModalVisible, setBudgetModalVisible] = useState(false);
  const [isSpacePickerVisible, setSpacePickerVisible] = useState(false);
  const modalBottomInset = useAppModalBottomInset();
  const categoryTransactions = useMemo(
    () =>
      category
        ? listTransactionsThroughCurrentMonth(transactions).filter(
            (transaction) => transaction.categoryId === category.id,
          )
        : [],
    [category, transactions],
  );
  const summary = useMemo(
    () =>
      category
        ? summarizeCategories([category], categoryTransactions)[0]
        : undefined,
    [category, categoryTransactions],
  );

  useEffect(() => {
    if (!visible) return;

    setPanel(null);
    setBudgetModalVisible(false);
    setSpacePickerVisible(false);
  }, [category, visible]);

  useEffect(() => {
    if (visible) {
      triggerHaptic('modalOpen');
    }
  }, [visible]);

  if (!category || !summary) return null;

  const expense = formatCurrency(summary.expenseMinor, 'EUR', 'es-ES');
  const income = formatCurrency(summary.incomeMinor, 'EUR', 'es-ES');
  const budget = category.budgetMinor
    ? formatCurrency(category.budgetMinor, 'EUR', 'es-ES')
    : null;
  const availableBudgetMinor = category.budgetMinor
    ? Math.max(category.budgetMinor - summary.expenseMinor, 0)
    : null;
  const availableBudget =
    availableBudgetMinor === null
      ? null
      : formatCurrency(availableBudgetMinor, 'EUR', 'es-ES');
  const budgetProgress = category.budgetMinor
    ? Math.min(summary.expenseMinor / category.budgetMinor, 1)
    : 0;
  const openDeletePanel = () => {
    setPanel('delete');
  };

  return (
    <>
      <AppModal
        containsScrollable
        extendContentIntoBottomInset
        hideHandle
        onClose={onClose}
        testID="category-detail-modal"
        variant="expanded"
        visible={visible}
      >
        <View style={styles.container}>
          <View style={styles.topBar} testID="category-detail-top-bar">
            <DetailActionMenu
              itemLabel="categoría"
              key={category.id}
              onDelete={openDeletePanel}
              onEdit={() => onEdit(category.id)}
              testIDPrefix="category"
            />
            <ModalCloseButton onPress={onClose} />
          </View>

          <BottomSheetScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: modalBottomInset + spacing.md },
            ]}
            showsVerticalScrollIndicator={false}
            style={styles.scroll}
            testID="category-detail-scroll-view"
          >
            <View style={styles.hero}>
              <View
                style={[
                  styles.heroIcon,
                  { backgroundColor: categoryColors[category.colorToken] },
                ]}
              >
                <CategoryIcon
                  color={colors.onBrand}
                  name={category.icon}
                  size={iconSize.xl}
                />
              </View>
              <View style={styles.titleBlock}>
                <Text
                  align="center"
                  testID="category-detail-context"
                  tone="secondary"
                  variant="overline"
                  weight="medium"
                >
                  Categoría
                </Text>
                <Text
                  align="center"
                  accessibilityRole="header"
                  testID="category-detail-title"
                  variant="heading"
                >
                  {category.name}
                </Text>
              </View>
            </View>

            {panel === 'delete' ? (
              <View style={styles.dangerPanel} testID="category-delete-panel">
                <Text variant="subheading">¿Eliminar esta categoría?</Text>
                <Text tone="secondary" variant="footnote">
                  Se ocultará de este espacio. Sus movimientos asociados se
                  conservarán.
                </Text>
                <View style={styles.panelActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setPanel(null)}
                    style={styles.secondaryButton}
                  >
                    <Text variant="label">Cancelar</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => onDelete(category.id)}
                    style={styles.deleteButton}
                  >
                    <Text tone="onBrand" variant="label">
                      Eliminar
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {summary.expenseMinor > 0 || summary.incomeMinor > 0 ? (
              <View style={styles.metrics}>
                {summary.expenseMinor > 0 ? (
                  <View style={styles.metric} testID="category-expense-metric">
                    <View style={styles.metricHeading}>
                      <Ionicons
                        color={colors.expense}
                        name="arrow-down"
                        size={iconSize.sm}
                        style={styles.diagonalArrow}
                      />
                      <Text tone="secondary" variant="caption">
                        Gastos
                      </Text>
                    </View>
                    <Text numberOfLines={1} variant="label" weight="semibold">
                      {expense}
                    </Text>
                  </View>
                ) : null}
                {summary.incomeMinor > 0 ? (
                  <View style={styles.metric} testID="category-income-metric">
                    <View style={styles.metricHeading}>
                      <Ionicons
                        color={colors.income}
                        name="arrow-up"
                        size={iconSize.sm}
                        style={styles.diagonalArrow}
                      />
                      <Text tone="secondary" variant="caption">
                        Ingresos
                      </Text>
                    </View>
                    <Text numberOfLines={1} variant="label" weight="semibold">
                      {income}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {category.budgetMinor && budget && availableBudget ? (
              <View style={styles.budgetCard} testID="category-budget-summary">
                <View style={styles.budgetHeader}>
                  <View>
                    <Text tone="secondary" variant="caption">
                      Disponible
                    </Text>
                    <Text variant="subheading">{availableBudget}</Text>
                  </View>
                  <View style={styles.budgetTotal}>
                    <Text align="right" tone="secondary" variant="caption">
                      Presupuesto
                    </Text>
                    <Text align="right" variant="label" weight="semibold">
                      {budget}
                    </Text>
                  </View>
                </View>
                <CategoryBudgetProgress
                  accessibilityText={`${Math.round(budgetProgress * 100)}% utilizado, ${availableBudget} disponible`}
                  color={categoryColors[category.colorToken]}
                  progress={budgetProgress}
                />
              </View>
            ) : null}

            <View style={styles.actions} testID="category-detail-actions">
              <ActionButton
                icon="add"
                label="Añadir movimiento"
                onPress={() => onAddTransaction(category.id)}
              />
              <ActionButton
                icon="wallet-outline"
                label={
                  category.budgetMinor
                    ? 'Editar presupuesto'
                    : 'Añadir presupuesto'
                }
                onPress={() => setBudgetModalVisible(true)}
              />
              {shareTargets.length > 0 ? (
                <ActionButton
                  icon="copy-outline"
                  label="Copiar en otro espacio"
                  onPress={() => setSpacePickerVisible(true)}
                />
              ) : null}
            </View>

            <View style={styles.movementsHeader}>
              <Text accessibilityRole="header" variant="subheading">
                Movimientos
              </Text>
              <Text tone="secondary" variant="footnote">
                {summary.transactionCount}
              </Text>
            </View>
            {categoryTransactions.length > 0 ? (
              <TransactionPreviewList
                categories={[category]}
                groupingTransactions={transactions}
                testID="category-detail-transaction-list"
                transactions={categoryTransactions}
              />
            ) : (
              <View style={styles.emptyMovements}>
                <Ionicons
                  color={categoryColors[category.colorToken]}
                  name="receipt-outline"
                  size={iconSize.lg}
                />
                <Text align="center" tone="secondary" variant="footnote">
                  Aún no hay movimientos asociados a esta categoría.
                </Text>
              </View>
            )}
          </BottomSheetScrollView>
        </View>
      </AppModal>
      <CategoryBudgetModal
        categoryColor={categoryColors[category.colorToken]}
        categoryName={category.name}
        initialBudgetMinor={category.budgetMinor}
        onClose={() => setBudgetModalVisible(false)}
        onRemove={() => {
          onSaveBudget(category.id, undefined);
          setBudgetModalVisible(false);
        }}
        onSave={(budgetMinor) => {
          onSaveBudget(category.id, budgetMinor);
          setBudgetModalVisible(false);
        }}
        visible={isBudgetModalVisible}
      />
      <CopyToSpaceModal
        description="Elige dónde crear una copia independiente de esta categoría."
        failureMessage={(target) =>
          `Ya existe una categoría con este nombre en ${target.name}.`
        }
        itemName={category.name}
        onClose={() => setSpacePickerVisible(false)}
        onSelect={(targetSpaceId) => onShare(category.id, targetSpaceId)}
        targets={shareTargets}
        testID="category-space-picker-modal"
        visible={isSpacePickerVisible}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    zIndex: 2,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xl,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: spacing.xl + layout.minTouchTarget,
  },
  hero: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  titleBlock: { alignItems: 'center', gap: spacing.xxs },
  heroIcon: {
    width: heroIconSize,
    height: heroIconSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    marginBottom: spacing.xs,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  metric: {
    minWidth: 0,
    flex: 1,
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  metricHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  diagonalArrow: { transform: [{ rotate: '45deg' }] },
  budgetCard: {
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  budgetTotal: { flexShrink: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  actionButton: {
    ...shadows.subtle,
    minWidth: 0,
    minHeight: 96,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.xs,
  },
  dangerPanel: {
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.expense,
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  panelActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  secondaryButton: {
    minHeight: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.border,
    borderRadius: radii.round,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
  },
  deleteButton: {
    minHeight: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.expense,
    borderRadius: radii.round,
    paddingHorizontal: spacing.xl,
  },
  movementsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.xxl,
  },
  emptyMovements: {
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.xl,
  },
  pressed: { opacity: 0.64 },
});
