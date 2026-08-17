import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppModal,
  useAppModalBottomInset,
} from '@/components/overlays/AppModal/AppModal';
import { CopyToSpaceModal } from '@/components/overlays/CopyToSpaceModal/CopyToSpaceModal';
import { DestructiveConfirmationPanel } from '@/components/overlays/DestructiveConfirmationPanel/DestructiveConfirmationPanel';
import { DetailActionMenu } from '@/components/overlays/DetailActionMenu/DetailActionMenu';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { NoteEditorModal } from '@/components/ui/NoteEditorModal/NoteEditorModal';
import { Text } from '@/components/ui/Text/Text';
import { CategoryBudgetProgress } from '@/features/categories/components/CategoryBudgetProgress/CategoryBudgetProgress';
import { CategoryBudgetModal } from '@/features/categories/components/CategoryDetailModal/CategoryBudgetModal';
import { CategoryDetailActionButton as ActionButton } from '@/features/categories/components/CategoryDetailModal/CategoryDetailActionButton';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon/CategoryIcon';
import type {
  Category,
  CategoryShareTarget,
} from '@/features/categories/types';
import { summarizeCategories } from '@/features/categories/utils/categorySummary';
import { TransactionPreviewList } from '@/features/transactions/components/TransactionPreviewList/TransactionPreviewList';
import type { SessionTransaction } from '@/features/transactions/types';
import { listTransactionsThroughCurrentMonth } from '@/features/transactions/utils/transactionSummary';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { formatCurrency } from '@/lib/currency/formatCurrency';
import { getLocalTodayKey } from '@/lib/date/localDate';
import { triggerHaptic } from '@/lib/haptics/haptics';
import {
  categoryColors,
  getCategoryContentContrast,
} from '@/theme/categoryColors';
import { iconSize, layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type DetailPanel = 'delete' | null;

type CategoryDetailModalProps = {
  category: Category | null;
  displayCurrency: CurrencyCode;
  onAddTransaction: (categoryId: string) => void;
  onClose: () => void;
  onDelete: (categoryId: string) => void;
  onEdit: (categoryId: string) => void;
  onOpenTransactionDetail: (transactionId: string) => void;
  onSaveBudget: (categoryId: string, budgetMinor?: number) => void;
  onSaveNote: (categoryId: string, note: string | null) => void;
  onShare: (
    categoryId: string,
    targetSpaceId: string,
  ) => boolean | Promise<boolean>;
  shareTargets: readonly CategoryShareTarget[];
  spaceCurrency: CurrencyCode;
  transactions: readonly SessionTransaction[];
  visible: boolean;
};

const heroIconSize = 76;

export function CategoryDetailModal({
  category,
  displayCurrency,
  onAddTransaction,
  onClose,
  onDelete,
  onEdit,
  onOpenTransactionDetail,
  onSaveBudget,
  onSaveNote,
  onShare,
  shareTargets,
  spaceCurrency,
  transactions,
  visible,
}: CategoryDetailModalProps) {
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const [panel, setPanel] = useState<DetailPanel>(null);
  const [isBudgetModalVisible, setBudgetModalVisible] = useState(false);
  const [isNoteModalVisible, setNoteModalVisible] = useState(false);
  const [isSpacePickerVisible, setSpacePickerVisible] = useState(false);
  const modalBottomInset = useAppModalBottomInset();
  const categoryTransactions = useMemo(
    () =>
      category
        ? listTransactionsThroughCurrentMonth(transactions).filter(
            (t) =>
              t.categoryId === category.id && t.currency === displayCurrency,
          )
        : [],
    [category, displayCurrency, transactions],
  );
  const allCategoryTransactions = useMemo(
    () =>
      category
        ? transactions.filter(
            (t) =>
              t.categoryId === category.id && t.currency === displayCurrency,
          )
        : [],
    [category, displayCurrency, transactions],
  );
  const todayKey = getLocalTodayKey();
  const pastCategoryTransactions = useMemo(
    () => categoryTransactions.filter((t) => t.occurredOn <= todayKey),
    [categoryTransactions, todayKey],
  );
  const upcomingCategoryTransactions = useMemo(() => {
    const seenIds = new Set<string>();
    const upcoming: SessionTransaction[] = [];
    for (const transaction of [
      ...allCategoryTransactions,
      ...categoryTransactions,
    ]) {
      if (transaction.occurredOn <= todayKey || seenIds.has(transaction.id))
        continue;
      seenIds.add(transaction.id);
      upcoming.push(transaction);
    }
    return upcoming.sort((left, right) =>
      left.occurredOn.localeCompare(right.occurredOn),
    );
  }, [allCategoryTransactions, categoryTransactions, todayKey]);
  const summary = useMemo(
    () =>
      category
        ? summarizeCategories([category], transactions, displayCurrency)[0]
        : undefined,
    [category, displayCurrency, transactions],
  );
  const budgetExpenseMinor = useMemo(() => {
    if (!category) return 0;
    return listTransactionsThroughCurrentMonth(transactions)
      .filter(
        (t) =>
          t.categoryId === category.id &&
          t.currency === spaceCurrency &&
          t.type === 'expense',
      )
      .reduce((total, t) => total + t.amountMinor, 0);
  }, [category, spaceCurrency, transactions]);

  useEffect(() => {
    if (!visible) return;

    setPanel(null);
    setBudgetModalVisible(false);
    setNoteModalVisible(false);
    setSpacePickerVisible(false);
  }, [category, visible]);

  useEffect(() => {
    if (visible) {
      triggerHaptic('modalOpen');
    }
  }, [visible]);

  if (!category || !summary) return null;

  const expense = formatCurrency(
    summary.expenseMinor,
    displayCurrency,
    'es-ES',
  );
  const income = formatCurrency(summary.incomeMinor, displayCurrency, 'es-ES');
  const budget = category.budgetMinor
    ? formatCurrency(category.budgetMinor, spaceCurrency, 'es-ES')
    : null;
  const availableBudgetMinor = category.budgetMinor
    ? Math.max(category.budgetMinor - budgetExpenseMinor, 0)
    : null;
  const availableBudget =
    availableBudgetMinor === null
      ? null
      : formatCurrency(availableBudgetMinor, spaceCurrency, 'es-ES');
  const budgetProgress = category.budgetMinor
    ? Math.min(budgetExpenseMinor / category.budgetMinor, 1)
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
              <DestructiveConfirmationPanel
                description="Se ocultará de este espacio. Sus movimientos asociados se conservarán."
                onCancel={() => setPanel(null)}
                onConfirm={() => onDelete(category.id)}
                testID="category-delete-panel"
                title="¿Eliminar esta categoría?"
              />
            ) : null}

            {summary.expenseMinor > 0 || summary.incomeMinor > 0 ? (
              <View style={styles.metrics}>
                {summary.expenseMinor > 0 ? (
                  <View style={styles.metric} testID="category-expense-metric">
                    <View style={styles.metricHeading}>
                      <View style={styles.metricIcon}>
                        <View style={styles.diagonalArrow}>
                          <Ionicons
                            color={colors.expense}
                            name="arrow-down"
                            size={iconSize.sm}
                          />
                        </View>
                      </View>
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
                      <View style={styles.metricIcon}>
                        <View style={styles.diagonalArrow}>
                          <Ionicons
                            color={colors.income}
                            name="arrow-up"
                            size={iconSize.sm}
                          />
                        </View>
                      </View>
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

            <Pressable
              accessibilityLabel={
                category.note ? category.note : 'Escribir nota'
              }
              accessibilityRole="button"
              onPress={() => setNoteModalVisible(true)}
              style={({ pressed }) => [
                styles.noteButton,
                pressed && styles.pressed,
              ]}
              testID="category-detail-note"
            >
              <View style={styles.noteButtonCopy}>
                {category.note ? (
                  <Text tone="secondary" variant="caption">
                    Nota
                  </Text>
                ) : null}
                <Text
                  numberOfLines={category.note ? 2 : 1}
                  tone={category.note ? 'primary' : 'secondary'}
                  variant="label"
                >
                  {category.note ? category.note : 'Escribir Nota'}
                </Text>
              </View>
              <Ionicons
                color={colors.textMuted}
                name="chevron-forward"
                size={iconSize.sm}
              />
            </Pressable>

            {category.budgetMinor && budget && availableBudget ? (
              <View style={styles.budgetCard} testID="category-budget-summary">
                <View style={styles.budgetHeader}>
                  <View>
                    <Text tone="secondary" variant="caption">
                      Disponible ({spaceCurrency})
                    </Text>
                    <Text variant="subheading">{availableBudget}</Text>
                  </View>
                  <View style={styles.budgetTotal}>
                    <Text align="right" tone="secondary" variant="caption">
                      Presupuesto ({spaceCurrency})
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
                {pastCategoryTransactions.length}
              </Text>
            </View>
            {pastCategoryTransactions.length > 0 ? (
              <TransactionPreviewList
                categories={[category]}
                groupingTransactions={transactions}
                onOpenTransactionDetail={onOpenTransactionDetail}
                testID="category-detail-transaction-list"
                transactions={pastCategoryTransactions}
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

            {upcomingCategoryTransactions.length > 0 ? (
              <>
                <View
                  style={styles.movementsHeader}
                  testID="category-detail-upcoming-header"
                >
                  <Text accessibilityRole="header" variant="subheading">
                    Movimientos futuros
                  </Text>
                  <Text tone="secondary" variant="footnote">
                    {upcomingCategoryTransactions.length}
                  </Text>
                </View>
                <TransactionPreviewList
                  categories={[category]}
                  groupingTransactions={transactions}
                  onOpenTransactionDetail={onOpenTransactionDetail}
                  testID="category-detail-upcoming-transaction-list"
                  transactions={upcomingCategoryTransactions}
                />
              </>
            ) : null}
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
        spaceCurrency={spaceCurrency}
        visible={isBudgetModalVisible}
      />
      <NoteEditorModal
        onClose={() => setNoteModalVisible(false)}
        onSave={(note) => {
          onSaveNote(category.id, note);
          setNoteModalVisible(false);
        }}
        saveColor={categoryColors[category.colorToken]}
        saveTone={getCategoryContentContrast(category.colorToken).tone}
        subtitle={category.name}
        testID="category-note-modal"
        value={category.note}
        visible={isNoteModalVisible}
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

function createStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
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
    metricIcon: {
      width: iconSize.lg,
      height: iconSize.lg,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
    },
    diagonalArrow: { transform: [{ rotate: '45deg' }] },
    noteButton: {
      minHeight: layout.controlHeight.regular,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      marginTop: spacing.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    noteButtonCopy: { flex: 1, minWidth: 0, gap: spacing.xxs },
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
}
