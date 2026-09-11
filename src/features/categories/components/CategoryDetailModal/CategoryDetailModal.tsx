import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  AppModal,
  useAppModalBottomInset,
} from '@/components/overlays/AppModal/AppModal';
import { CopyToSpaceModal } from '@/components/overlays/CopyToSpaceModal/CopyToSpaceModal';
import { DestructiveConfirmationPanel } from '@/components/overlays/DestructiveConfirmationPanel/DestructiveConfirmationPanel';
import { DetailActionCard } from '@/components/overlays/DetailActionCard/DetailActionCard';
import { DetailActionMenu } from '@/components/overlays/DetailActionMenu/DetailActionMenu';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { NoteEditorModal } from '@/components/ui/NoteEditorModal/NoteEditorModal';
import { SegmentedControl } from '@/components/ui/SegmentedControl/SegmentedControl';
import { Text } from '@/components/ui/Text/Text';
import { extractRatesFromTransactions } from '@/features/accounts/utils/moneyAccountValuation';
import { VenezuelaDisplayModeSelector } from '@/features/exchangeRates/components/VenezuelaDisplayModeSelector';
import { useExchangeRates } from '@/features/exchangeRates/hooks/useExchangeRates';
import type { VenezuelaDisplayMode } from '@/features/exchangeRates/utils/venezuelaDisplayMode';
import { CategoryBudgetProgress } from '@/features/categories/components/CategoryBudgetProgress/CategoryBudgetProgress';
import { createStyles } from '@/features/categories/components/CategoryDetailModal/CategoryDetailModal.styles';
import { CategoryBudgetModal } from '@/features/categories/components/CategoryDetailModal/CategoryBudgetModal';
import { CategoryTransactionMetrics } from '@/features/categories/components/CategoryDetailModal/CategoryTransactionMetrics';
import {
  CategoryAuthorFilter,
  type CategoryAuthorFilterValue,
} from '@/features/categories/components/CategoryDetailModal/CategoryAuthorFilter';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon/CategoryIcon';
import type {
  Category,
  CategoryEditorTarget,
  CategoryShareTarget,
} from '@/features/categories/types';
import { summarizeCategories } from '@/features/categories/utils/categorySummary';
import { computeCategoryMetrics } from '@/features/categories/utils/categoryValuation';
import { useCurrencyCapabilities } from '@/features/profile/hooks/useCurrencyCapabilities';
import { useSpaceMembership } from '@/features/profile/state/SpaceMembershipContext';
import { TransactionPreviewList } from '@/features/transactions/components/TransactionPreviewList/TransactionPreviewList';
import type { SessionTransaction } from '@/features/transactions/types';
import { resolveTransactionAuthor } from '@/features/transactions/utils/transactionAuthor';
import { listTransactionsThroughCurrentMonth } from '@/features/transactions/utils/transactionSummary';
import { useDepsChanged } from '@/hooks/useDepsChanged';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { formatCurrency } from '@/lib/currency/formatCurrency';
import { getLocalTodayKey } from '@/lib/date/localDate';
import { triggerHaptic } from '@/lib/haptics/haptics';
import { categoryColors } from '@/theme/categoryColors';
import { iconSize } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type DetailPanel = 'delete' | null;

type CategoryDetailModalProps = {
  category: Category | null;
  displayCurrency: CurrencyCode;
  onAddTransaction: (categoryId: string) => void;
  onClose: () => void;
  onDelete: (categoryId: string) => void;
  onEdit: (categoryId: string, initialEditor?: CategoryEditorTarget) => void;
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
  const { venezuelaCurrencyMode } = useCurrencyCapabilities();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const membership = useSpaceMembership();
  const [panel, setPanel] = useState<DetailPanel>(null);
  const [authorFilter, setAuthorFilter] =
    useState<CategoryAuthorFilterValue>('all');
  const [isBudgetModalVisible, setBudgetModalVisible] = useState(false);
  const [isNoteModalVisible, setNoteModalVisible] = useState(false);
  const [isSpacePickerVisible, setSpacePickerVisible] = useState(false);
  const [selectedCurrency, setSelectedCurrency] =
    useState<CurrencyCode>(displayCurrency);
  const [valuationMode, setValuationMode] =
    useState<VenezuelaDisplayMode>('USD');
  const modalBottomInset = useAppModalBottomInset();
  const detailCurrencies = useMemo<readonly CurrencyCode[]>(() => {
    if (!category) return [];

    return Array.from(
      new Set(
        transactions
          .filter((transaction) => transaction.categoryId === category.id)
          .map((transaction) => transaction.currency),
      ),
    );
  }, [category, transactions]);
  const authorFilteredTransactions = useMemo(() => {
    if (authorFilter === 'all' || !membership.isSharedSpace) {
      return transactions;
    }

    return transactions.filter(
      (transaction) =>
        resolveTransactionAuthor(transaction.createdBy, membership).isOwn ===
        (authorFilter === 'own'),
    );
  }, [authorFilter, membership, transactions]);
  const categoryTransactions = useMemo(
    () =>
      category
        ? listTransactionsThroughCurrentMonth(
            authorFilteredTransactions,
          ).filter(
            (t) =>
              t.categoryId === category.id &&
              (venezuelaCurrencyMode ? true : t.currency === selectedCurrency),
          )
        : [],
    [
      authorFilteredTransactions,
      category,
      selectedCurrency,
      venezuelaCurrencyMode,
    ],
  );
  const allCategoryTransactions = useMemo(
    () =>
      category
        ? authorFilteredTransactions.filter(
            (t) =>
              t.categoryId === category.id &&
              (venezuelaCurrencyMode ? true : t.currency === selectedCurrency),
          )
        : [],
    [
      authorFilteredTransactions,
      category,
      selectedCurrency,
      venezuelaCurrencyMode,
    ],
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
        ? summarizeCategories(
            [category],
            authorFilteredTransactions,
            selectedCurrency,
          )[0]
        : undefined,
    [authorFilteredTransactions, category, selectedCurrency],
  );
  const exchangeRatesState = useExchangeRates();
  const apiRates =
    exchangeRatesState.status === 'success' ||
    exchangeRatesState.status === 'stale'
      ? exchangeRatesState.rates.rates
      : null;

  const fallbackRates = useMemo(
    () =>
      extractRatesFromTransactions(
        categoryTransactions.length > 0 ? categoryTransactions : transactions,
      ),
    [categoryTransactions, transactions],
  );

  const bcvRate = apiRates?.BCV?.rate
    ? Number(apiRates.BCV.rate)
    : fallbackRates.bcvRate;
  const eurRate = apiRates?.EURO?.rate
    ? Number(apiRates.EURO.rate)
    : fallbackRates.eurRate;

  const hasValuation = venezuelaCurrencyMode || bcvRate !== null;
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

  if (
    useDepsChanged([visible, category, detailCurrencies, displayCurrency]) &&
    visible
  ) {
    setPanel(null);
    setBudgetModalVisible(false);
    setNoteModalVisible(false);
    setSpacePickerVisible(false);
    setAuthorFilter('all');
    setSelectedCurrency(
      detailCurrencies.includes(displayCurrency)
        ? displayCurrency
        : (detailCurrencies[0] ?? displayCurrency),
    );
    setValuationMode('USD');
  }

  useEffect(() => {
    if (visible) {
      triggerHaptic('modalOpen');
    }
  }, [visible]);

  if (!category || !summary) return null;

  const metrics = computeCategoryMetrics({
    bcvRate,
    eurRate,
    mode: valuationMode,
    selectedCurrency,
    transactions: categoryTransactions,
    venezuelaCurrencyMode,
  });
  const effectiveExpenseMinor = metrics.expenseMinor;
  const effectiveIncomeMinor = metrics.incomeMinor;
  const effectiveCurrency = metrics.currency;
  const expense = formatCurrency(
    effectiveExpenseMinor,
    effectiveCurrency,
    'es-ES',
  );
  const income = formatCurrency(
    effectiveIncomeMinor,
    effectiveCurrency,
    'es-ES',
  );
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
  const openDeletePanel = () => setPanel('delete');

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
              <Pressable
                accessibilityLabel="Editar apariencia de categoría"
                accessibilityRole="button"
                onPress={() => onEdit(category.id, 'appearance')}
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
              </Pressable>
              <Pressable
                accessibilityLabel="Editar nombre de categoría"
                accessibilityRole="button"
                onPress={() => onEdit(category.id, 'name')}
                style={styles.titleBlock}
              >
                <Text
                  align="left"
                  testID="category-detail-context"
                  tone="secondary"
                  variant="overline"
                  weight="medium"
                >
                  Categoría
                </Text>
                <Text
                  align="left"
                  accessibilityRole="header"
                  testID="category-detail-title"
                  variant="heading"
                >
                  {category.name}
                </Text>
              </Pressable>
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

            {!venezuelaCurrencyMode && detailCurrencies.length > 1 ? (
              <SegmentedControl
                onChange={setSelectedCurrency}
                options={detailCurrencies.map((currency) => ({
                  label: currency,
                  value: currency,
                }))}
                selectedValue={selectedCurrency}
                style={styles.currencySelector}
                testID="category-currency-selector"
              />
            ) : null}

            {hasValuation ? (
              <VenezuelaDisplayModeSelector
                hideLabel
                indicatorColor={categoryColors[category.colorToken]}
                mode={valuationMode}
                onChange={setValuationMode}
                style={styles.valuationSelector}
                testID="category-historical-valuation"
              />
            ) : null}

            <CategoryTransactionMetrics
              expense={expense}
              expenseMinor={effectiveExpenseMinor}
              income={income}
              incomeMinor={effectiveIncomeMinor}
            />

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
              <Pressable
                accessibilityLabel="Abrir presupuesto"
                accessibilityRole="button"
                onPress={() => setBudgetModalVisible(true)}
                style={styles.budgetCard}
                testID="category-budget-summary"
              >
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
              </Pressable>
            ) : null}

            <View style={styles.actions} testID="category-detail-actions">
              <DetailActionCard
                icon="add"
                label="Añadir movimiento"
                onPress={() => onAddTransaction(category.id)}
                testIDPrefix="category"
              />
              <DetailActionCard
                icon="wallet-outline"
                label={
                  category.budgetMinor
                    ? 'Editar presupuesto'
                    : 'Añadir presupuesto'
                }
                onPress={() => setBudgetModalVisible(true)}
                testIDPrefix="category"
              />
              {shareTargets.length > 0 ? (
                <DetailActionCard
                  icon="copy-outline"
                  label="Copiar en otro espacio"
                  onPress={() => setSpacePickerVisible(true)}
                  testIDPrefix="category"
                />
              ) : null}
            </View>

            <CategoryAuthorFilter
              onChange={setAuthorFilter}
              value={authorFilter}
            />

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
                groupingTransactions={authorFilteredTransactions}
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
                  groupingTransactions={authorFilteredTransactions}
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
        saveTone="onBrand"
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
