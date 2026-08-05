import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppModal,
  useAppModalBottomInset,
} from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import type { Category } from '@/features/categories/types';
import {
  describePreviousPeriod,
  getPreviousPeriodTransactions,
  listTransactionsByPeriod,
  shiftTransactionPeriod,
  type TransactionPeriod,
} from '@/features/dashboard/utils/transactionPeriod';
import { SelectableOption } from '@/components/ui/SelectableOption/SelectableOption';
import { PeriodComparisonIndicator } from '@/features/transactions/components/PeriodComparisonIndicator/PeriodComparisonIndicator';
import { TransactionPeriodSelector } from '@/features/transactions/components/TransactionPeriodSelector/TransactionPeriodSelector';
import { TransactionPreviewList } from '@/features/transactions/components/TransactionPreviewList/TransactionPreviewList';
import type {
  SessionTransaction,
  TransactionType,
} from '@/features/transactions/types';
import { calculatePeriodComparison } from '@/features/transactions/utils/periodComparison';
import { summarizeTransactionTotals } from '@/features/transactions/utils/transactionSummary';
import {
  defaultCurrencyCode,
  getCurrencyFlag,
  getCurrencyName,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import { formatCurrency } from '@/lib/currency/formatCurrency';
import { triggerHaptic } from '@/lib/haptics/haptics';
import { colors } from '@/theme/colors';
import { iconSize, layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';

export type TransactionPeriodModalType = TransactionType | 'balance';

type TransactionPeriodModalProps = {
  categories: readonly Category[];
  onAdd: () => void;
  onClose: () => void;
  onOpenTransactionDetail?: (transactionId: string) => void;
  transactions: readonly SessionTransaction[];
  type: TransactionPeriodModalType;
  visible: boolean;
};

export function TransactionPeriodModal({
  categories,
  onAdd,
  onClose,
  onOpenTransactionDetail,
  transactions,
  type,
  visible,
}: TransactionPeriodModalProps) {
  const [period, setPeriod] = useState<TransactionPeriod>('month');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode | null>(
    null,
  );
  const [isCurrencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const modalBottomInset = useAppModalBottomInset();
  const isBalance = type === 'balance';
  const typeLabel =
    type === 'income'
      ? 'ingresos'
      : type === 'expense'
        ? 'gastos'
        : 'movimientos';
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
  // Se calculan sobre todas las transacciones del tipo (no solo las del
  // periodo visible) para que la moneda elegida por el usuario se mantenga
  // al navegar entre periodos o cambiar el filtro, aunque el periodo actual
  // no tenga movimientos en esa moneda.
  const availableCurrencies = useMemo(
    () =>
      Array.from(
        new Set(typeTransactions.map((transaction) => transaction.currency)),
      ).sort(),
    [typeTransactions],
  );
  const hasMultipleCurrencies = availableCurrencies.length > 1;
  const effectiveCurrency: CurrencyCode =
    (selectedCurrency && availableCurrencies.includes(selectedCurrency)
      ? selectedCurrency
      : availableCurrencies[0]) ?? defaultCurrencyCode;
  const currencyTransactions = useMemo(
    () =>
      filteredTransactions.filter(
        (transaction) => transaction.currency === effectiveCurrency,
      ),
    [effectiveCurrency, filteredTransactions],
  );
  const totals = useMemo(
    () => summarizeTransactionTotals(currencyTransactions),
    [currencyTransactions],
  );
  const totalMinor =
    type === 'income'
      ? totals.incomeMinor
      : type === 'expense'
        ? totals.expenseMinor
        : totals.balanceMinor;
  const previousCurrencyTransactions = useMemo(() => {
    const previousTransactions = getPreviousPeriodTransactions(
      isBalance
        ? transactions
        : transactions.filter((transaction) => transaction.type === type),
      period,
      selectedDate,
    );

    return previousTransactions.filter(
      (transaction) => transaction.currency === effectiveCurrency,
    );
  }, [effectiveCurrency, isBalance, period, selectedDate, transactions, type]);
  const previousTotals = useMemo(
    () => summarizeTransactionTotals(previousCurrencyTransactions),
    [previousCurrencyTransactions],
  );
  const previousTotalMinor =
    type === 'income'
      ? previousTotals.incomeMinor
      : type === 'expense'
        ? previousTotals.expenseMinor
        : previousTotals.balanceMinor;
  const comparison = calculatePeriodComparison(totalMinor, previousTotalMinor);
  const comparisonTone: 'balance' | 'expense' | 'income' =
    type === 'balance' ? 'balance' : type;
  const totalLabel =
    type === 'income'
      ? 'Total de ingresos'
      : type === 'expense'
        ? 'Total de gastos'
        : 'Balance del periodo';
  const formattedTotal = formatCurrency(totalMinor, effectiveCurrency, 'es-ES');
  const title =
    type === 'income' ? 'Ingresos' : type === 'expense' ? 'Gastos' : 'Balance';
  const addLabel =
    type === 'income'
      ? 'Añadir ingreso'
      : type === 'expense'
        ? 'Añadir gasto'
        : 'Añadir movimiento';
  useEffect(() => {
    if (visible) {
      setPeriod('month');
      setSelectedDate(new Date());
      setSelectedCurrency(null);
      setCurrencyPickerVisible(false);
    }
  }, [visible]);
  useEffect(() => {
    if (visible) {
      triggerHaptic('modalOpen');
    }
  }, [visible]);
  useEffect(() => {
    if (selectedCurrency && !availableCurrencies.includes(selectedCurrency)) {
      setSelectedCurrency(null);
    }
  }, [availableCurrencies, selectedCurrency]);

  return (
    <>
      <AppModal
        containsScrollable
        extendContentIntoBottomInset
        onClose={onClose}
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
            <View
              accessibilityLabel={`${totalLabel}: ${formattedTotal}`}
              accessible
              style={styles.totalCard}
              testID={`${type}-period-total-card`}
            >
              <View style={styles.totalCardCopy}>
                <Text tone="secondary" variant="footnote">
                  {totalLabel}
                </Text>
                <Text testID={`${type}-period-total`} variant="heading">
                  {formattedTotal}
                </Text>
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

              {hasMultipleCurrencies ? (
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
              {currencyTransactions.length > 0 ? (
                <TransactionPreviewList
                  categories={categories}
                  groupingTransactions={transactions}
                  onOpenTransactionDetail={onOpenTransactionDetail}
                  testID={`${type}-period-transaction-list`}
                  transactions={currencyTransactions}
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
              onPress={onAdd}
              style={styles.addAction}
            />
          </BottomSheetScrollView>
        </View>
      </AppModal>

      <AppModal
        onClose={() => setCurrencyPickerVisible(false)}
        stackBehavior="push"
        testID={`${type}-period-currency-picker`}
        visible={isCurrencyPickerVisible}
      >
        <View style={styles.currencyPicker}>
          <View style={styles.currencyPickerHeader}>
            <ModalCloseButton
              onPress={() => setCurrencyPickerVisible(false)}
              variant="back"
            />
            <Text accessibilityRole="header" variant="heading">
              Elige la moneda
            </Text>
          </View>

          <View
            accessibilityRole="radiogroup"
            style={styles.currencyPickerList}
          >
            {availableCurrencies.map((code) => (
              <SelectableOption
                accessibilityLabel={`${getCurrencyFlag(code)} ${getCurrencyName(code)} (${code})`}
                indicatorTestID={`${type}-period-currency-${code}-check`}
                key={code}
                label={`${getCurrencyFlag(code)}  ${getCurrencyName(code)} · ${code}`}
                onPress={() => {
                  setSelectedCurrency(code);
                  setCurrencyPickerVisible(false);
                }}
                selected={code === effectiveCurrency}
                testID={`${type}-period-currency-${code}-option`}
              />
            ))}
          </View>
        </View>
      </AppModal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerCopy: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  totalCard: {
    ...shadows.subtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    marginTop: spacing.xl,
    padding: spacing.lg,
  },
  totalCardCopy: { flex: 1, gap: spacing.xs },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  currencyButton: {
    ...shadows.subtle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderColor: colors.border,
    borderRadius: radii.round,
    borderWidth: 1,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  currencyButtonFlag: { fontSize: 18 },
  currencyPicker: { flex: 1, gap: spacing.lg },
  currencyPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  currencyPickerList: { gap: spacing.sm },
  results: { marginTop: spacing.lg },
  empty: {
    flex: 1,
    minHeight: layout.controlHeight.regular * 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.xl,
  },
  diagonalArrow: { transform: [{ rotate: '45deg' }] },
  addAction: { marginTop: spacing.xl },
  pressed: { opacity: 0.72 },
});
