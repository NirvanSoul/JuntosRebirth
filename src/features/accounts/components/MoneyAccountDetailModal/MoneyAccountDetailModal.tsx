import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppModal,
  useAppModalBottomInset,
} from '@/components/overlays/AppModal/AppModal';
import { DestructiveConfirmationPanel } from '@/components/overlays/DestructiveConfirmationPanel/DestructiveConfirmationPanel';
import { DetailActionMenu } from '@/components/overlays/DetailActionMenu/DetailActionMenu';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl/SegmentedControl';
import { Text } from '@/components/ui/Text/Text';
import { MoneyAccountIcon } from '@/features/accounts/components/MoneyAccountIcon/MoneyAccountIcon';
import { getMoneyAccountKindLabel } from '@/features/accounts/constants/moneyAccountKindDefinitions';
import type { MoneyAccount } from '@/features/accounts/types';
import {
  type MoneyAccountCurrencyBalance,
  summarizeMoneyAccounts,
} from '@/features/accounts/utils/moneyAccountSummary';
import { TransactionPreviewList } from '@/features/transactions/components/TransactionPreviewList/TransactionPreviewList';
import type { Category } from '@/features/categories/types';
import type { SessionTransaction } from '@/features/transactions/types';
import { listTransactionsThroughCurrentMonth } from '@/features/transactions/utils/transactionSummary';
import { formatCurrency } from '@/lib/currency/formatCurrency';
import { categoryColors } from '@/theme/categoryColors';
import { iconSize } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type MoneyAccountDetailModalProps = {
  account: MoneyAccount | null;
  categories: readonly Category[];
  onClose: () => void;
  onDelete: (moneyAccountId: string) => void;
  onEdit: (moneyAccountId: string) => void;
  onOpenTransactionDetail: (transactionId: string) => void;
  transactions: readonly SessionTransaction[];
  visible: boolean;
};

const heroIconSize = 76;

type AccountTransactionMetricProps = {
  balance: MoneyAccountCurrencyBalance;
  type: 'expense' | 'income';
};

function AccountTransactionMetric({
  balance,
  type,
}: AccountTransactionMetricProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles((palette) => createMetricStyles(palette));
  const isIncome = type === 'income';
  const amountMinor = isIncome ? balance.incomeMinor : balance.expenseMinor;
  const label = `${isIncome ? 'Ingresos' : 'Gastos'} ${balance.currency}`;
  const amount = formatCurrency(amountMinor, balance.currency, 'es-ES');

  return (
    <View
      accessibilityLabel={`${label} en ${balance.currency}: ${amount}`}
      style={styles.metric}
      testID={`money-account-${type}-${balance.currency}`}
    >
      <View style={styles.metricHeading}>
        <View
          style={styles.metricIcon}
          testID={`money-account-${type}-${balance.currency}-icon`}
        >
          <View style={styles.diagonalArrow}>
            <Ionicons
              color={isIncome ? colors.income : colors.expense}
              name={isIncome ? 'arrow-up' : 'arrow-down'}
              size={iconSize.sm}
              testID={`money-account-${type}-${balance.currency}-glyph`}
            />
          </View>
        </View>
        <Text tone="secondary" variant="caption">
          {label}
        </Text>
      </View>
      <Text numberOfLines={1} variant="body" weight="semibold">
        {amount}
      </Text>
    </View>
  );
}

export function MoneyAccountDetailModal({
  account,
  categories,
  onClose,
  onDelete,
  onEdit,
  onOpenTransactionDetail,
  transactions,
  visible,
}: MoneyAccountDetailModalProps) {
  const { colors } = useTheme();
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

  useEffect(() => {
    if (!visible || !account) return;

    setDeletePanelVisible(false);
    setSelectedCurrency(account.balances[0]?.currency ?? null);
  }, [account, visible]);

  if (!account || !summary) {
    return null;
  }

  const accountColor = categoryColors[account.colorToken];
  const selectedBalance =
    summary.balanceByCurrency.find(
      (balance) => balance.currency === selectedCurrency,
    ) ?? summary.balanceByCurrency[0];

  if (!selectedBalance) return null;

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
                align="center"
                testID="money-account-detail-context"
                tone="secondary"
                variant="overline"
                weight="medium"
              >
                {getMoneyAccountKindLabel(account.kind)}
              </Text>
              <Text
                align="center"
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

          <View style={styles.summary}>
            {hasMultipleCurrencies ? (
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
              accessibilityLabel={`Balance ${selectedBalance.currency}: ${formatCurrency(
                selectedBalance.balanceMinor,
                selectedBalance.currency,
                'es-ES',
              )}`}
              style={styles.balanceMetric}
              testID={`money-account-balance-${selectedBalance.currency}`}
            >
              <Text tone="secondary" variant="caption">
                Balance {selectedBalance.currency}
              </Text>
              <Text variant="amount">
                {formatCurrency(
                  selectedBalance.balanceMinor,
                  selectedBalance.currency,
                  'es-ES',
                )}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <AccountTransactionMetric
                balance={selectedBalance}
                type="income"
              />
              <AccountTransactionMetric
                balance={selectedBalance}
                type="expense"
              />
            </View>
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

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: { flex: 1 },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: spacing.md,
    },
    scroll: { flex: 1 },
    scrollContent: { gap: spacing.lg },
    hero: { alignItems: 'center', gap: spacing.md },
    heroIcon: {
      width: heroIconSize,
      height: heroIconSize,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
    },
    titleBlock: { alignItems: 'center', gap: spacing.xxs },
    summary: {
      gap: spacing.sm,
    },
    currencySelector: { alignSelf: 'center', width: 216 },
    balanceMetric: {
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      padding: spacing.md,
    },
    metricRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    movementsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
      marginTop: spacing.xxl,
    },
  });
}

function createMetricStyles(colors: ColorTokens) {
  return StyleSheet.create({
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
  });
}
