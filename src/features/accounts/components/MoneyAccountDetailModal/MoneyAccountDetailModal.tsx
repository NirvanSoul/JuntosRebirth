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
import { Text } from '@/components/ui/Text/Text';
import { MoneyAccountIcon } from '@/features/accounts/components/MoneyAccountIcon/MoneyAccountIcon';
import { getMoneyAccountKindLabel } from '@/features/accounts/constants/moneyAccountKindDefinitions';
import type { MoneyAccount } from '@/features/accounts/types';
import {
  getPrimaryBalance,
  summarizeMoneyAccounts,
} from '@/features/accounts/utils/moneyAccountSummary';
import { TransactionPreviewList } from '@/features/transactions/components/TransactionPreviewList/TransactionPreviewList';
import type { Category } from '@/features/categories/types';
import type { SessionTransaction } from '@/features/transactions/types';
import { listTransactionsThroughCurrentMonth } from '@/features/transactions/utils/transactionSummary';
import { formatCurrency } from '@/lib/currency/formatCurrency';
import {
  categoryColors,
  getCategoryContentContrast,
} from '@/theme/categoryColors';
import { iconSize } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
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
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const [isDeletePanelVisible, setDeletePanelVisible] = useState(false);
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
    if (!visible) setDeletePanelVisible(false);
  }, [visible]);

  if (!account || !summary) {
    return null;
  }

  const accountColor = categoryColors[account.colorToken];
  const contentContrast = getCategoryContentContrast(account.colorToken);
  const primary = getPrimaryBalance(summary);
  const balance = formatCurrency(
    primary.balanceMinor,
    primary.currency,
    'es-ES',
  );

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
                color={contentContrast.color}
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
              <Text
                align="center"
                testID="money-account-detail-balance"
                variant="amount"
              >
                {balance}
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

          {summary.balanceByCurrency.map((currencyBalance) => (
            <View
              key={currencyBalance.currency}
              style={styles.metrics}
              testID={`money-account-metrics-${currencyBalance.currency}`}
            >
              <View style={styles.metric}>
                <Text tone="secondary" variant="caption">
                  Saldo en {currencyBalance.currency}
                </Text>
                <Text numberOfLines={1} variant="label" weight="semibold">
                  {formatCurrency(
                    currencyBalance.balanceMinor,
                    currencyBalance.currency,
                    'es-ES',
                  )}
                </Text>
              </View>
              {currencyBalance.incomeMinor > 0 ? (
                <View style={styles.metric}>
                  <View style={styles.metricHeading}>
                    <Ionicons
                      color={colors.income}
                      name="arrow-up"
                      size={iconSize.sm}
                    />
                    <Text tone="secondary" variant="caption">
                      Ingresos
                    </Text>
                  </View>
                  <Text numberOfLines={1} variant="label" weight="semibold">
                    {formatCurrency(
                      currencyBalance.incomeMinor,
                      currencyBalance.currency,
                      'es-ES',
                    )}
                  </Text>
                </View>
              ) : null}
              {currencyBalance.expenseMinor > 0 ? (
                <View style={styles.metric}>
                  <View style={styles.metricHeading}>
                    <Ionicons
                      color={colors.expense}
                      name="arrow-down"
                      size={iconSize.sm}
                    />
                    <Text tone="secondary" variant="caption">
                      Gastos
                    </Text>
                  </View>
                  <Text numberOfLines={1} variant="label" weight="semibold">
                    {formatCurrency(
                      currencyBalance.expenseMinor,
                      currencyBalance.currency,
                      'es-ES',
                    )}
                  </Text>
                </View>
              ) : null}
            </View>
          ))}

          <Text
            accessibilityRole="header"
            style={styles.sectionTitle}
            variant="label"
            weight="semibold"
          >
            Movimientos
          </Text>
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

function createStyles(colors: ColorTokens, shadows: ThemeShadows) {
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
    metrics: {
      ...shadows.subtle,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.lg,
      borderColor: colors.border,
      borderRadius: radii.lg,
      borderWidth: 1,
      backgroundColor: colors.surface,
      padding: spacing.lg,
    },
    metric: { gap: spacing.xxs },
    metricHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    sectionTitle: { marginTop: spacing.sm },
  });
}
