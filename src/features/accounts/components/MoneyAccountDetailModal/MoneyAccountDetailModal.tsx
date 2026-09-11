import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import {
  AppModal,
  useAppModalBottomInset,
} from '@/components/overlays/AppModal/AppModal';
import { DestructiveConfirmationPanel } from '@/components/overlays/DestructiveConfirmationPanel/DestructiveConfirmationPanel';
import { DetailActionCard } from '@/components/overlays/DetailActionCard/DetailActionCard';
import { DetailActionMenu } from '@/components/overlays/DetailActionMenu/DetailActionMenu';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl/SegmentedControl';
import { Text } from '@/components/ui/Text/Text';
import { MoneyAccountIcon } from '@/features/accounts/components/MoneyAccountIcon/MoneyAccountIcon';
import { getMoneyAccountKindLabel } from '@/features/accounts/constants/moneyAccountKindDefinitions';
import type { MoneyAccount } from '@/features/accounts/types';
import { summarizeMoneyAccounts } from '@/features/accounts/utils/moneyAccountSummary';
import {
  computeCombinedAccountBalance,
  computeEffectiveAccountBalance,
  extractRatesFromTransactions,
} from '@/features/accounts/utils/moneyAccountValuation';
import { VenezuelaDisplayModeSelector } from '@/features/exchangeRates/components/VenezuelaDisplayModeSelector';
import { useExchangeRates } from '@/features/exchangeRates/hooks/useExchangeRates';
import { useHistoricalTransactionValuation } from '@/features/exchangeRates/hooks/useHistoricalTransactionValuation';
import { summarizeHistoricalTransactions } from '@/features/exchangeRates/utils/transactionSnapshot';
import type { VenezuelaDisplayMode } from '@/features/exchangeRates/utils/venezuelaDisplayMode';
import { TransactionPreviewList } from '@/features/transactions/components/TransactionPreviewList/TransactionPreviewList';
import type { Category } from '@/features/categories/types';
import type { SessionTransaction } from '@/features/transactions/types';
import { listTransactionsThroughCurrentMonth } from '@/features/transactions/utils/transactionSummary';
import { useDepsChanged } from '@/hooks/useDepsChanged';
import { formatCurrency } from '@/lib/currency/formatCurrency';
import { categoryColors } from '@/theme/categoryColors';
import { iconSize } from '@/theme/layout';
import { useCurrencyCapabilities } from '@/features/profile/hooks/useCurrencyCapabilities';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

import { AccountTransactionMetric } from './AccountTransactionMetric';
import { createStyles } from './MoneyAccountDetailModal.styles';

type MoneyAccountDetailModalProps = {
  account: MoneyAccount | null;
  categories: readonly Category[];
  onAddTransaction?: (moneyAccountId: string) => void;
  onClose: () => void;
  onDelete: (moneyAccountId: string) => void;
  onEdit: (moneyAccountId: string) => void;
  onOpenTransactionDetail: (transactionId: string) => void;
  transactions: readonly SessionTransaction[];
  visible: boolean;
};

export function MoneyAccountDetailModal({
  account,
  categories,
  onAddTransaction,
  onClose,
  onDelete,
  onEdit,
  onOpenTransactionDetail,
  transactions,
  visible,
}: MoneyAccountDetailModalProps) {
  const { colors } = useTheme();
  const { venezuelaCurrencyMode } = useCurrencyCapabilities();
  const styles = useThemedStyles((palette) => createStyles(palette));
  const [isDeletePanelVisible, setDeletePanelVisible] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const modalBottomInset = useAppModalBottomInset();
  const summary = useMemo(
    () => (account ? summarizeMoneyAccounts([account], transactions)[0] : null),
    [account, transactions],
  );
  const accountTransactions = useMemo(
    () =>
      account
        ? listTransactionsThroughCurrentMonth(transactions).filter(
            (transaction) => transaction.moneyAccountId === account.id,
          )
        : [],
    [account, transactions],
  );

  const [valuationMode, setValuationMode] =
    useState<VenezuelaDisplayMode>('USD');

  if (useDepsChanged([visible, account]) && visible && account) {
    setDeletePanelVisible(false);
    setSelectedCurrency(account.balances[0]?.currency ?? null);
    setValuationMode('USD');
  }

  const selectedBalance =
    summary?.balanceByCurrency.find(
      (balance) => balance.currency === selectedCurrency,
    ) ?? summary?.balanceByCurrency[0];
  const selectedCurrencyTransactions = accountTransactions.filter(
    (transaction) => transaction.currency === selectedBalance?.currency,
  );
  const historicalValuation = useHistoricalTransactionValuation(
    selectedCurrencyTransactions,
  );
  const hasHistoricalValuation =
    historicalValuation.availableSources.length > 0;
  const bcvSummary = useMemo(
    () =>
      hasHistoricalValuation
        ? summarizeHistoricalTransactions(selectedCurrencyTransactions, 'BCV')
        : null,
    [hasHistoricalValuation, selectedCurrencyTransactions],
  );
  const eurSummary = useMemo(
    () =>
      hasHistoricalValuation
        ? summarizeHistoricalTransactions(selectedCurrencyTransactions, 'EURO')
        : null,
    [hasHistoricalValuation, selectedCurrencyTransactions],
  );

  const exchangeRatesState = useExchangeRates();
  const apiRates =
    exchangeRatesState.status === 'success' ||
    exchangeRatesState.status === 'stale'
      ? exchangeRatesState.rates.rates
      : null;

  const snapshotRates = useMemo(
    () =>
      extractRatesFromTransactions(
        selectedCurrencyTransactions.length > 0
          ? selectedCurrencyTransactions
          : transactions,
      ),
    [selectedCurrencyTransactions, transactions],
  );

  const effectiveRates = useMemo(
    () => ({
      bcvRate: apiRates?.BCV?.rate
        ? Number(apiRates.BCV.rate)
        : snapshotRates.bcvRate,
      eurRate: apiRates?.EURO?.rate
        ? Number(apiRates.EURO.rate)
        : snapshotRates.eurRate,
    }),
    [apiRates, snapshotRates],
  );

  const hasValuation =
    venezuelaCurrencyMode ||
    hasHistoricalValuation ||
    effectiveRates.bcvRate !== null;

  if (!account || !summary || !selectedBalance) return null;

  const effective = venezuelaCurrencyMode
    ? computeCombinedAccountBalance({
        balances: summary.balanceByCurrency,
        bcvSummary,
        eurSummary,
        mode: valuationMode,
        rates: effectiveRates,
      })
    : computeEffectiveAccountBalance({
        balance: selectedBalance,
        bcvSummary,
        eurSummary,
        mode: valuationMode,
        rates: effectiveRates,
      });

  const effectiveCurrency = effective.currency;
  const effectiveBalanceMinor = effective.balanceMinor;
  const effectiveIncomeMinor = effective.incomeMinor;
  const effectiveExpenseMinor = effective.expenseMinor;

  const accountColor = categoryColors[account.colorToken];
  const hasMultipleCurrencies = summary.balanceByCurrency.length > 1;

  return (
    <AppModal
      containsScrollable
      onClose={onClose}
      stackBehavior="push"
      testID="money-account-detail-modal"
      variant="expanded"
      visible={visible}
    >
      <View style={styles.container}>
        <View style={styles.topBar} testID="money-account-detail-top-bar">
          <DetailActionMenu
            itemLabel="cuenta"
            key={account.id}
            onDelete={() => setDeletePanelVisible(true)}
            onEdit={() => onEdit(account.id)}
            testIDPrefix="money-account"
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
          testID="money-account-detail-scroll-view"
        >
          <View style={styles.hero}>
            <View style={[styles.heroIcon, { backgroundColor: accountColor }]}>
              <MoneyAccountIcon
                color={colors.onBrand}
                name={account.icon}
                size={iconSize.xl}
              />
            </View>
            <View style={styles.titleBlock}>
              <Text
                align="left"
                testID="money-account-detail-context"
                tone="secondary"
                variant="overline"
                weight="medium"
              >
                {getMoneyAccountKindLabel(account.kind)}
              </Text>
              <Text
                align="left"
                accessibilityRole="header"
                testID="money-account-detail-title"
                variant="heading"
              >
                {account.name}
              </Text>
            </View>
          </View>

          {isDeletePanelVisible ? (
            <DestructiveConfirmationPanel
              description="Se ocultará de este espacio. Sus movimientos asociados se conservarán."
              onCancel={() => setDeletePanelVisible(false)}
              onConfirm={() => onDelete(account.id)}
              testID="money-account-delete-panel"
              title="¿Eliminar esta cuenta?"
            />
          ) : null}

          {hasValuation ? (
            <VenezuelaDisplayModeSelector
              hideLabel
              indicatorColor={accountColor}
              mode={valuationMode}
              onChange={setValuationMode}
              style={styles.valuationSelector}
              testID="money-account-historical-valuation"
            />
          ) : null}

          <View style={styles.summary}>
            {!venezuelaCurrencyMode && hasMultipleCurrencies ? (
              <SegmentedControl
                onChange={(currency) => setSelectedCurrency(currency)}
                options={summary.balanceByCurrency.map(({ currency }) => ({
                  label: currency,
                  value: currency,
                }))}
                selectedValue={selectedBalance.currency}
                style={styles.currencySelector}
                testID="money-account-currency-selector"
              />
            ) : null}

            <View
              accessibilityLabel={`Balance ${effectiveCurrency}: ${formatCurrency(
                effectiveBalanceMinor,
                effectiveCurrency,
                'es-ES',
              )}`}
              style={styles.balanceMetric}
              testID={`money-account-balance-${effectiveCurrency}`}
            >
              <Text tone="secondary" variant="caption">
                Balance {effectiveCurrency}
              </Text>
              <Text variant="amount">
                {formatCurrency(
                  effectiveBalanceMinor,
                  effectiveCurrency,
                  'es-ES',
                )}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <AccountTransactionMetric
                balance={{
                  ...selectedBalance,
                  currency: effectiveCurrency,
                  incomeMinor: effectiveIncomeMinor,
                }}
                type="income"
              />
              <AccountTransactionMetric
                balance={{
                  ...selectedBalance,
                  currency: effectiveCurrency,
                  expenseMinor: effectiveExpenseMinor,
                }}
                type="expense"
              />
            </View>
          </View>

          <View style={styles.actions} testID="money-account-detail-actions">
            <DetailActionCard
              icon="add"
              label="Añadir movimiento"
              onPress={() => onAddTransaction?.(account.id)}
              testIDPrefix="money-account"
            />
          </View>

          <View style={styles.movementsHeader}>
            <Text accessibilityRole="header" variant="subheading">
              Movimientos
            </Text>
            <Text tone="secondary" variant="footnote">
              {accountTransactions.length}
            </Text>
          </View>
          {accountTransactions.length > 0 ? (
            <TransactionPreviewList
              categories={categories}
              groupingTransactions={transactions}
              onOpenTransactionDetail={onOpenTransactionDetail}
              testID="money-account-transaction-preview-list"
              transactions={accountTransactions}
            />
          ) : (
            <Text tone="secondary" variant="footnote">
              Todavía no hay movimientos asignados a esta cuenta.
            </Text>
          )}
        </BottomSheetScrollView>
      </View>
    </AppModal>
  );
}
