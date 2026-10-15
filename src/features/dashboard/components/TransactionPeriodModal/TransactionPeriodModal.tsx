import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  AppModal,
  useAppModalBottomInset,
} from '@/components/overlays/AppModal/AppModal';
import { useModalChainedAction } from '@/components/overlays/AppModal/useModalChainedAction';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import { extractRatesFromTransactions } from '@/features/accounts/utils/moneyAccountValuation';
import type { Category } from '@/features/categories/types';
import { PeriodCurrencyPickerModal } from '@/features/dashboard/components/TransactionPeriodModal/PeriodCurrencyPickerModal';
import { PeriodTotalAmount } from '@/features/dashboard/components/TransactionPeriodModal/PeriodTotalAmount';
import { computePeriodValuation } from '@/features/dashboard/utils/periodValuation';
import {
  describePreviousPeriod,
  getPreviousPeriodTransactions,
  listTransactionsByPeriod,
  shiftTransactionPeriod,
  type TransactionPeriod,
} from '@/features/dashboard/utils/transactionPeriod';
import { VenezuelaDisplayModeSelector } from '@/features/exchangeRates/components/VenezuelaDisplayModeSelector';
import { useExchangeRates } from '@/features/exchangeRates/hooks/useExchangeRates';
import type { VenezuelaDisplayMode } from '@/features/exchangeRates/utils/venezuelaDisplayMode';
import { useCurrencyCapabilities } from '@/features/profile/hooks/useCurrencyCapabilities';
import { PeriodComparisonIndicator } from '@/features/transactions/components/PeriodComparisonIndicator/PeriodComparisonIndicator';
import { TransactionPeriodSelector } from '@/features/transactions/components/TransactionPeriodSelector/TransactionPeriodSelector';
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
import { summarizeTransactionTotals } from '@/features/transactions/utils/transactionSummary';
import {
  getCurrencyFlag,
  getCurrencyName,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import { useCurrencySymbolPreference } from '@/state/appPreferences/CurrencySymbolPreferenceProvider';
import { triggerHaptic } from '@/lib/haptics/haptics';
import { useDepsChanged } from '@/hooks/useDepsChanged';
import { iconSize } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import {
  createStyles,
  periodModalLabels,
} from '@/features/dashboard/components/TransactionPeriodModal/TransactionPeriodModal.styles';

export type TransactionPeriodModalType = TransactionType | 'balance';

type TransactionPeriodModalProps = {
  categories: readonly Category[];
  chainActionsAfterDismiss?: boolean;
  initialCurrency?: CurrencyCode;
  initialDate?: Date;
  onAdd: () => void;
  onClose: () => void;
  onOpenTransactionDetail?: (transactionId: string) => void;
  transactions: readonly SessionTransaction[];
  type: TransactionPeriodModalType;
  visible: boolean;
};

export function TransactionPeriodModal({
  categories,
  chainActionsAfterDismiss = false,
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
  const [period, setPeriod] = useState<TransactionPeriod>('month');
  const [selectedDate, setSelectedDate] = useState(() =>
    initialDate ? new Date(initialDate) : new Date(),
  );
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode | null>(
    initialCurrency ?? null,
  );
  const [valuationMode, setValuationMode] =
    useState<VenezuelaDisplayMode>('USD');
  const [isCurrencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const modalBottomInset = useAppModalBottomInset();
  const isBalance = type === 'balance';
  const typeLabel =
    type === 'income'
      ? 'ingresos'
      : type === 'expense'
        ? 'gastos'
        : 'movimientos';

  const exchangeRatesState = useExchangeRates({
    enabled: visible && venezuelaCurrencyMode,
  });
  const apiRates =
    exchangeRatesState.status === 'success' ||
    exchangeRatesState.status === 'stale'
      ? exchangeRatesState.rates.rates
      : null;

  const fallbackRates = useMemo(
    () => extractRatesFromTransactions(transactions),
    [transactions],
  );

  const bcvRate = apiRates?.BCV?.rate
    ? Number(apiRates.BCV.rate)
    : fallbackRates.bcvRate;
  const eurRate = apiRates?.EURO?.rate
    ? Number(apiRates.EURO.rate)
    : fallbackRates.eurRate;

  const typeTransactions = useMemo(
    () =>
      isBalance
        ? transactions
        : transactions.filter((transaction) => transaction.type === type),
    [isBalance, transactions, type],
  );
  const filteredTransactions = useMemo(
    () => listTransactionsByPeriod(typeTransactions, period, selectedDate),
    [period, selectedDate, typeTransactions],
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

  const previousTransactions = useMemo(
    () =>
      getPreviousPeriodTransactions(
        isBalance
          ? transactions
          : transactions.filter((transaction) => transaction.type === type),
        period,
        selectedDate,
      ),
    [isBalance, period, selectedDate, transactions, type],
  );

  const previousCurrencyTransactions = useMemo(
    () =>
      previousTransactions.filter(
        (transaction) => transaction.currency === effectiveCurrency,
      ),
    [effectiveCurrency, previousTransactions],
  );

  const totals = useMemo(
    () => summarizeTransactionTotals(currencyTransactions),
    [currencyTransactions],
  );
  const previousTotals = useMemo(
    () => summarizeTransactionTotals(previousCurrencyTransactions),
    [previousCurrencyTransactions],
  );

  const previousPeriodValuation = useMemo(
    () =>
      computePeriodValuation({
        bcvRate,
        eurRate,
        mode: valuationMode,
        transactions: previousTransactions,
        type,
      }),
    [bcvRate, eurRate, previousTransactions, type, valuationMode],
  );

  const totalMinor = venezuelaCurrencyMode
    ? periodValuation.totalMinor
    : type === 'income'
      ? totals.incomeMinor
      : type === 'expense'
        ? totals.expenseMinor
        : totals.balanceMinor;

  const previousTotalMinor = venezuelaCurrencyMode
    ? previousPeriodValuation.totalMinor
    : type === 'income'
      ? previousTotals.incomeMinor
      : type === 'expense'
        ? previousTotals.expenseMinor
        : previousTotals.balanceMinor;

  const comparison = calculatePeriodComparison(totalMinor, previousTotalMinor);
  const comparisonTone: 'balance' | 'expense' | 'income' =
    type === 'balance' ? 'balance' : type;
  const totalLabel = periodModalLabels.total[type];
  const displayedCurrency = venezuelaCurrencyMode
    ? periodValuation.currency
    : effectiveCurrency;
  const formattedTotal = formatCurrency(totalMinor, displayedCurrency, 'es-ES');
  const displayedTransactions = venezuelaCurrencyMode
    ? filteredTransactions
    : currencyTransactions;

  const title = periodModalLabels.title[type];
  const addLabel = periodModalLabels.add[type];

  if (
    useDepsChanged([visible, initialCurrency, initialDate?.getTime()]) &&
    visible
  ) {
    setPeriod('month');
    setSelectedDate(initialDate ? new Date(initialDate) : new Date());
    setSelectedCurrency(initialCurrency ?? null);
    setCurrencyPickerVisible(false);
    setValuationMode('USD');
  }
  useEffect(() => {
    if (visible) {
      triggerHaptic('modalOpen');
    }
  }, [visible]);
  if (selectedCurrency && !availableCurrencies.includes(selectedCurrency)) {
    setSelectedCurrency(null);
  }

  const selectorIndicatorColor =
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
              <Text tone="secondary" variant="footnote">
                Movimientos del periodo seleccionado.
              </Text>
            </View>
            <ModalCloseButton onPress={onClose} />
          </View>

          <TransactionPeriodSelector
            onNext={() =>
              setSelectedDate((current) =>
                shiftTransactionPeriod(period, current, 1),
              )
            }
            onPrevious={() =>
              setSelectedDate((current) =>
                shiftTransactionPeriod(period, current, -1),
              )
            }
            onSelectPeriod={setPeriod}
            period={period}
            selectedDate={selectedDate}
            singleRow
            testID={`${type}-period-selector`}
          />

          <BottomSheetScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: modalBottomInset },
            ]}
            showsVerticalScrollIndicator={false}
            testID={`${type}-period-scroll-view`}
          >
            {venezuelaCurrencyMode ? (
              <VenezuelaDisplayModeSelector
                hideLabel
                indicatorColor={selectorIndicatorColor}
                mode={valuationMode}
                onChange={setValuationMode}
                style={styles.valuationSelector}
                testID={`${type}-period-valuation-selector`}
              />
            ) : null}

            <View
              accessibilityLabel={`${totalLabel}: ${formattedTotal}`}
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
                <PeriodTotalAmount type={type} value={formattedTotal} />
                {comparison ? (
                  <View style={styles.comparisonRow}>
                    <PeriodComparisonIndicator
                      comparison={comparison}
                      testID={`${type}-period-comparison`}
                      tone={comparisonTone}
                    />
                    <Text tone="secondary" variant="overline">
                      {describePreviousPeriod(period)}
                    </Text>
                  </View>
                ) : null}
              </View>

              {!venezuelaCurrencyMode && hasMultipleCurrencies ? (
                <Pressable
                  accessibilityHint="Abre las opciones de moneda"
                  accessibilityLabel={`Moneda: ${getCurrencyName(effectiveCurrency)}`}
                  accessibilityRole="button"
                  onPress={() => setCurrencyPickerVisible(true)}
                  style={({ pressed }) => [
                    styles.currencyButton,
                    pressed ? styles.pressed : null,
                  ]}
                  testID={`${type}-period-currency-button`}
                >
                  <Text
                    style={styles.currencyButtonFlag}
                    testID={`${type}-period-currency-flag`}
                  >
                    {getCurrencyFlag(effectiveCurrency)}
                  </Text>
                  <Text variant="label" weight="semibold">
                    {effectiveCurrency}
                  </Text>
                  <Ionicons
                    color={colors.textSecondary}
                    name="chevron-down"
                    size={iconSize.sm}
                  />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.results}>
              {displayedTransactions.length > 0 ? (
                <TransactionPreviewList
                  categories={categories}
                  groupingTransactions={transactions}
                  onOpenTransactionDetail={(transactionId) =>
                    runAction(() => onOpenTransactionDetail?.(transactionId))
                  }
                  testID={`${type}-period-transaction-list`}
                  transactions={displayedTransactions}
                />
              ) : (
                <View style={styles.empty}>
                  <Ionicons
                    color={
                      type === 'income'
                        ? colors.income
                        : type === 'expense'
                          ? colors.expense
                          : colors.cta
                    }
                    name={
                      type === 'income'
                        ? 'arrow-up'
                        : type === 'expense'
                          ? 'arrow-down'
                          : 'swap-vertical-outline'
                    }
                    size={iconSize.lg}
                    style={styles.diagonalArrow}
                  />
                  <Text align="center" tone="secondary" variant="footnote">
                    No hay {typeLabel} efectivos en este periodo.
                  </Text>
                </View>
              )}
            </View>

            <ModalPrimaryAction
              accessibilityLabel={addLabel}
              gradientColor={
                type === 'income'
                  ? colors.income
                  : type === 'expense'
                    ? colors.expense
                    : colors.cta
              }
              gradientTestID={`${type}-period-add-gradient`}
              label={addLabel}
              onPress={() => runAction(onAdd)}
              style={styles.addAction}
            />
          </BottomSheetScrollView>
        </View>
      </AppModal>

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
