import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import {
  AppModal,
  useAppModalBottomInset,
} from '@/components/overlays/AppModal/AppModal';
import { useModalChainedAction } from '@/components/overlays/AppModal/useModalChainedAction';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import { TransactionFilterButton } from '@/components/ui/TransactionFilterButton/TransactionFilterButton';
import { TransactionAuthorFiltersModal } from '@/features/activity/components/TransactionAuthorFiltersModal';
import type { TransactionAuthorFilter } from '@/features/activity/components/TransactionFiltersModal';
import { useTransactionAuthorFilter } from '@/features/activity/hooks/useTransactionAuthorFilter';
import type { Category } from '@/features/categories/types';
import {
  OlderPeriodSections,
  useOlderPeriodSections,
} from '@/features/dashboard/components/TransactionPeriodModal/OlderPeriodSections';
import { PeriodEmptyState } from '@/features/dashboard/components/TransactionPeriodModal/PeriodEmptyState';
import { PeriodCurrencyButton } from '@/features/dashboard/components/TransactionPeriodModal/PeriodCurrencyButton';
import { PeriodCurrencyPickerModal } from '@/features/dashboard/components/TransactionPeriodModal/PeriodCurrencyPickerModal';
import { PeriodTotalAmount } from '@/features/dashboard/components/TransactionPeriodModal/PeriodTotalAmount';
import { usePeriodCarryOver } from '@/features/dashboard/components/TransactionPeriodModal/usePeriodCarryOver';
import { usePeriodRates } from '@/features/dashboard/components/TransactionPeriodModal/usePeriodRates';
import {
  getComparisonPeriodLabel,
  getPreviousDateFilter,
  listTransactionsByDateFilter,
  type TransactionDateFilter,
} from '@/features/activity/utils/transactionDateFilter';
import { CategoryDetailPeriodFilter } from '@/features/categories/components/CategoryDetailModal/CategoryDetailPeriodFilter';
import {
  computePeriodValuation,
  summarizePeriodTotalMinor,
} from '@/features/dashboard/utils/periodValuation';
import { VenezuelaDisplayModeSelector } from '@/features/exchangeRates/components/VenezuelaDisplayModeSelector';
import type { VenezuelaDisplayMode } from '@/features/exchangeRates/utils/venezuelaDisplayMode';
import { useCurrencyCapabilities } from '@/features/profile/hooks/useCurrencyCapabilities';
import { PeriodComparisonIndicator } from '@/features/transactions/components/PeriodComparisonIndicator/PeriodComparisonIndicator';
import { TransactionPreviewList } from '@/features/transactions/components/TransactionPreviewList/TransactionPreviewList';
import type {
  SessionTransaction,
  TransactionType,
} from '@/features/transactions/types';
import { calculatePeriodComparison } from '@/features/transactions/utils/periodComparison';
import {
  getAvailableCurrencies,
  pickEffectiveCurrency,
} from '@/features/transactions/utils/transactionCurrencyGrouping';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { useCurrencySymbolPreference } from '@/state/appPreferences/CurrencySymbolPreferenceProvider';
import { triggerHaptic } from '@/lib/haptics/haptics';
import { useDepsChanged } from '@/hooks/useDepsChanged';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import {
  createStyles,
  periodModalLabels,
} from '@/features/dashboard/components/TransactionPeriodModal/TransactionPeriodModal.styles';

export type TransactionPeriodModalType = TransactionType | 'balance';

type TransactionPeriodModalProps = {
  /** En la variante de balance, suma el saldo de los periodos anteriores. */
  carryOverBalance?: boolean;
  categories: readonly Category[];
  chainActionsAfterDismiss?: boolean;
  initialAuthor?: TransactionAuthorFilter;
  initialCurrency?: CurrencyCode;
  initialDate?: Date;
  onAdd: () => void;
  onClose: () => void;
  onOpenTransactionDetail?: (transactionId: string) => void;
  transactions: readonly SessionTransaction[];
  type: TransactionPeriodModalType;
  visible: boolean;
};

function createInitialDateFilter(
  initialDate: Date | undefined,
): TransactionDateFilter {
  return {
    period: 'month',
    selectedDate: initialDate ? new Date(initialDate) : new Date(),
  };
}

export function TransactionPeriodModal({
  carryOverBalance = false,
  categories,
  chainActionsAfterDismiss = false,
  initialAuthor = 'all',
  initialCurrency,
  initialDate,
  onAdd,
  onClose,
  onOpenTransactionDetail,
  transactions,
  type,
  visible,
}: TransactionPeriodModalProps) {
  const { formatCurrency } = useCurrencySymbolPreference();
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const { venezuelaCurrencyMode } = useCurrencyCapabilities();
  const { closeThenRun, handleDismissed } = useModalChainedAction(onClose);
  const runAction = (action: () => void) =>
    chainActionsAfterDismiss ? closeThenRun(action) : action();
  const [dateFilter, setDateFilter] = useState<TransactionDateFilter>(() =>
    createInitialDateFilter(initialDate),
  );
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode | null>(
    initialCurrency ?? null,
  );
  const [valuationMode, setValuationMode] =
    useState<VenezuelaDisplayMode>('USD');
  const [isCurrencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [isFiltersModalVisible, setFiltersModalVisible] = useState(false);
  const authorFilter = useTransactionAuthorFilter(initialAuthor);
  const { matchesAuthor } = authorFilter;
  const modalBottomInset = useAppModalBottomInset();
  const density = useLayoutDensity();
  // El botón de añadir flota sobre la lista: el final del contenido le deja
  // sitio para que el último movimiento no quede debajo.
  const floatingActionClearance =
    modalBottomInset + layout.actionHeight[density] + spacing.xl;
  const isBalance = type === 'balance';

  const { bcvRate, eurRate } = usePeriodRates(
    transactions,
    visible && venezuelaCurrencyMode,
  );

  const typeTransactions = useMemo(
    () =>
      transactions.filter(
        (transaction) =>
          (isBalance || transaction.type === type) &&
          matchesAuthor(transaction),
      ),
    [isBalance, matchesAuthor, transactions, type],
  );
  const filteredTransactions = useMemo(
    () => listTransactionsByDateFilter(typeTransactions, dateFilter),
    [dateFilter, typeTransactions],
  );
  const availableCurrencies = useMemo(() => {
    const currencies = getAvailableCurrencies(typeTransactions);
    return !initialCurrency || currencies.includes(initialCurrency)
      ? currencies
      : [initialCurrency, ...currencies];
  }, [initialCurrency, typeTransactions]);
  const hasMultipleCurrencies = availableCurrencies.length > 1;
  const effectiveCurrency: CurrencyCode = pickEffectiveCurrency(
    availableCurrencies,
    selectedCurrency,
  );
  const currencyTransactions = useMemo(
    () =>
      filteredTransactions.filter(
        (transaction) => transaction.currency === effectiveCurrency,
      ),
    [effectiveCurrency, filteredTransactions],
  );

  const periodValuation = useMemo(
    () =>
      computePeriodValuation({
        bcvRate,
        eurRate,
        mode: valuationMode,
        transactions: filteredTransactions,
        type,
      }),
    [bcvRate, eurRate, filteredTransactions, type, valuationMode],
  );

  // «Todos» no tiene periodo anterior: sin movimientos previos la
  // comparación se oculta.
  const previousTransactions = useMemo(() => {
    const previousFilter = getPreviousDateFilter(dateFilter);
    return previousFilter
      ? listTransactionsByDateFilter(typeTransactions, previousFilter)
      : [];
  }, [dateFilter, typeTransactions]);
  const comparisonLabel = getComparisonPeriodLabel(dateFilter);

  const valuation = venezuelaCurrencyMode
    ? { bcvRate, eurRate, mode: valuationMode }
    : null;
  const summarizeTotal = (
    periodTransactions: readonly SessionTransaction[],
    totalType: TransactionPeriodModalType = type,
  ) =>
    summarizePeriodTotalMinor({
      currency: effectiveCurrency,
      transactions: periodTransactions,
      type: totalType,
      valuation,
    });
  const carryOver = usePeriodCarryOver({
    dateFilter,
    enabled: isBalance && carryOverBalance,
    summarizeBalance: (carryTransactions) =>
      summarizeTotal(carryTransactions, 'balance'),
    transactions: typeTransactions,
  });
  const carryOverMinor = carryOver.currentMinor;
  const totalMinor = summarizeTotal(filteredTransactions) + carryOverMinor;
  const previousTotalMinor =
    summarizeTotal(previousTransactions) + carryOver.previousMinor;

  const comparison = comparisonLabel
    ? calculatePeriodComparison(totalMinor, previousTotalMinor)
    : null;
  const totalLabel =
    isBalance && carryOverBalance
      ? periodModalLabels.carryOverTotal
      : periodModalLabels.total[type];
  const displayedCurrency = venezuelaCurrencyMode
    ? periodValuation.currency
    : effectiveCurrency;
  const formattedTotal = formatCurrency(totalMinor, displayedCurrency, 'es-ES');
  const carryOverLabel =
    carryOverMinor !== 0
      ? `Incluye ${formatCurrency(carryOverMinor, displayedCurrency, 'es-ES')} ${periodModalLabels.carryOver}`
      : null;
  const displayedTransactions = venezuelaCurrencyMode
    ? filteredTransactions
    : currencyTransactions;

  const olderPeriods = useOlderPeriodSections({
    currency: venezuelaCurrencyMode ? null : effectiveCurrency,
    dateFilter,
    transactions: typeTransactions,
  });
  const openTransactionDetail = (transactionId: string) =>
    runAction(() => onOpenTransactionDetail?.(transactionId));

  const title = periodModalLabels.title[type];
  const addLabel = periodModalLabels.add[type];

  if (
    useDepsChanged([visible, initialCurrency, initialDate?.getTime()]) &&
    visible
  ) {
    setDateFilter(createInitialDateFilter(initialDate));
    setSelectedCurrency(initialCurrency ?? null);
    setCurrencyPickerVisible(false);
    setFiltersModalVisible(false);
    authorFilter.setAuthor(initialAuthor);
    setValuationMode('USD');
  }
  useEffect(() => {
    if (visible) triggerHaptic('modalOpen');
  }, [visible]);
  if (selectedCurrency && !availableCurrencies.includes(selectedCurrency)) {
    setSelectedCurrency(null);
  }

  const accentColor =
    type === 'income'
      ? colors.income
      : type === 'expense'
        ? colors.expense
        : colors.cta;

  return (
    <>
      <AppModal
        containsScrollable
        extendContentIntoBottomInset
        onClose={onClose}
        onDismissed={chainActionsAfterDismiss ? handleDismissed : undefined}
        previewActions
        testID={`${type}-period-modal`}
        variant="expanded"
        visible={visible}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text accessibilityRole="header" variant="heading">
                {title}
              </Text>
            </View>
            {authorFilter.isSharedSpace ? (
              <TransactionFilterButton
                activeFilterCount={Number(authorFilter.isActive)}
                onPress={() => setFiltersModalVisible(true)}
                testID={`${type}-period-filter-button`}
              />
            ) : null}
            <ModalCloseButton onPress={onClose} />
          </View>

          {/* Fijo arriba: al bajar a periodos anteriores muestra el que se ve. */}
          <CategoryDetailPeriodFilter
            filter={olderPeriods.visibleFilter ?? dateFilter}
            onChange={setDateFilter}
            testID={`${type}-period-selector`}
          />

          <BottomSheetScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: floatingActionClearance },
            ]}
            {...olderPeriods.scrollProps}
            showsVerticalScrollIndicator={false}
            testID={`${type}-period-scroll-view`}
          >
            {venezuelaCurrencyMode ? (
              <VenezuelaDisplayModeSelector
                hideLabel
                indicatorColor={accentColor}
                mode={valuationMode}
                onChange={setValuationMode}
                style={styles.valuationSelector}
                testID={`${type}-period-valuation-selector`}
              />
            ) : null}

            <View
              accessibilityLabel={`${totalLabel}: ${formattedTotal}${carryOverLabel ? `. ${carryOverLabel}` : ''}`}
              accessible
              style={[
                styles.totalCard,
                venezuelaCurrencyMode && styles.totalCardWithValuation,
              ]}
              testID={`${type}-period-total-card`}
            >
              <View style={styles.totalCardCopy}>
                <Text tone="secondary" variant="footnote">
                  {totalLabel}
                </Text>
                <PeriodTotalAmount
                  caption={carryOverLabel}
                  type={type}
                  value={formattedTotal}
                />
                {comparison ? (
                  <View style={styles.comparisonRow}>
                    <PeriodComparisonIndicator
                      comparison={comparison}
                      currency={displayedCurrency}
                      previousPeriodLabel={comparisonLabel}
                      testID={`${type}-period-comparison`}
                      tone={type}
                    />
                  </View>
                ) : null}
              </View>

              {!venezuelaCurrencyMode && hasMultipleCurrencies ? (
                <PeriodCurrencyButton
                  currency={effectiveCurrency}
                  onPress={() => setCurrencyPickerVisible(true)}
                  type={type}
                />
              ) : null}
            </View>

            <View style={styles.results}>
              {displayedTransactions.length > 0 ? (
                <TransactionPreviewList
                  categories={categories}
                  groupingTransactions={transactions}
                  onOpenTransactionDetail={openTransactionDetail}
                  progressive
                  testID={`${type}-period-transaction-list`}
                  transactions={displayedTransactions}
                />
              ) : (
                <PeriodEmptyState accentColor={accentColor} type={type} />
              )}
            </View>

            <OlderPeriodSections
              categories={categories}
              groupingTransactions={transactions}
              onOpenTransactionDetail={openTransactionDetail}
              onSectionLayout={olderPeriods.onSectionLayout}
              sections={olderPeriods.sections}
              testID={`${type}-period-older-section`}
            />
          </BottomSheetScrollView>

          <ModalPrimaryAction
            accessibilityLabel={addLabel}
            gradientColor={accentColor}
            gradientTestID={`${type}-period-add-gradient`}
            label={addLabel}
            onPress={() => runAction(onAdd)}
            style={[styles.addAction, { bottom: modalBottomInset }]}
          />
        </View>
      </AppModal>

      {authorFilter.isSharedSpace ? (
        <TransactionAuthorFiltersModal
          authorFilter={authorFilter}
          currency={effectiveCurrency}
          onClose={() => setFiltersModalVisible(false)}
          visible={isFiltersModalVisible}
        />
      ) : null}
      <PeriodCurrencyPickerModal
        availableCurrencies={availableCurrencies}
        effectiveCurrency={effectiveCurrency}
        onClose={() => setCurrencyPickerVisible(false)}
        onSelectCurrency={(code) => {
          setSelectedCurrency(code);
          setCurrencyPickerVisible(false);
        }}
        type={type}
        visible={isCurrencyPickerVisible}
      />
    </>
  );
}
