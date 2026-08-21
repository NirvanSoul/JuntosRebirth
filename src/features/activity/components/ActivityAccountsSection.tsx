import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState/EmptyState';
import { Text } from '@/components/ui/Text/Text';
import { MoneyAccountCarousel } from '@/features/accounts/components/MoneyAccountCarousel/MoneyAccountCarousel';
import { MoneyAccountRow } from '@/features/accounts/components/MoneyAccountRow/MoneyAccountRow';
import type { MoneyAccountSummary } from '@/features/accounts/utils/moneyAccountSummary';
import { AccountDonutChart } from '@/features/activity/components/AccountDonutChart';
import { ActivityCollapsibleSection } from '@/features/activity/components/ActivityCollapsibleSection';
import type { SessionTransaction } from '@/features/transactions/types';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { iconSize, minTouchTarget } from '@/theme/layout';
import { previewCardLayout } from '@/theme/previewCard';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type ActivityAccountsSectionProps = {
  accounts: readonly MoneyAccountSummary[];
  /** Moneda del reparto: la gráfica nunca suma importes de divisas distintas. */
  currency: CurrencyCode;
  expanded: boolean;
  onCreateMoneyAccount?: () => void;
  onOpenMoneyAccountDetail?: (moneyAccountId: string) => void;
  onToggle: () => void;
  resetKey?: number;
  transactions: readonly SessionTransaction[];
};

/**
 * Sección «Cuentas» de Actividad: el reparto por cuenta en el donut compartido,
 * las tarjetas en un carrusel y, debajo, la misma información como lista
 * compacta con icono, nombre y saldo.
 */
export function ActivityAccountsSection({
  accounts,
  currency,
  expanded,
  onCreateMoneyAccount,
  onOpenMoneyAccountDetail,
  onToggle,
  resetKey,
  transactions,
}: ActivityAccountsSectionProps) {
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));

  return (
    <ActivityCollapsibleSection
      expanded={expanded}
      onToggle={onToggle}
      testID="accounts-section"
      title="Cuentas"
    >
      {accounts.length > 0 ? (
        <>
          <AccountDonutChart
            accounts={accounts}
            currency={currency}
            onOpenMoneyAccountDetail={onOpenMoneyAccountDetail}
            resetKey={resetKey}
            transactions={transactions}
          />

          <View style={styles.carousel}>
            <MoneyAccountCarousel
              accounts={accounts}
              bordered
              onOpenMoneyAccountDetail={onOpenMoneyAccountDetail}
              testID="activity-account-scroller"
            />
          </View>

          <View style={styles.groupShadow} testID="activity-account-list-group">
            <View style={styles.group}>
              {accounts.map((account, index) => (
                <View key={account.id}>
                  <MoneyAccountRow
                    account={account}
                    onPress={() => onOpenMoneyAccountDetail?.(account.id)}
                  />
                  {index < accounts.length - 1 ? (
                    <View
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                      style={styles.separator}
                      testID="activity-account-separator"
                    />
                  ) : null}
                </View>
              ))}
            </View>
          </View>

          <Pressable
            accessibilityLabel="Añadir cuenta"
            accessibilityRole="button"
            onPress={onCreateMoneyAccount}
            style={({ pressed }) => [
              styles.addAction,
              pressed && styles.addActionPressed,
            ]}
            testID="activity-add-money-account"
          >
            <Ionicons color={colors.cta} name="add" size={iconSize.sm} />
            <Text tone="cta" variant="footnote" weight="semibold">
              Añadir cuenta
            </Text>
          </Pressable>
        </>
      ) : (
        <EmptyState
          accessibilityLabel="Crear primera cuenta"
          description="Crea una cuenta para saber cuánto te queda en cada sitio."
          icon="wallet-outline"
          iconBackgroundColor={colors.cta}
          onPress={onCreateMoneyAccount}
          testID="activity-empty-accounts"
          title="Aún no hay cuentas"
        />
      )}
    </ActivityCollapsibleSection>
  );
}

function createStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    carousel: {
      marginTop: spacing.xl,
    },
    groupShadow: {
      ...shadows.subtle,
      borderRadius: previewCardLayout.borderRadius,
      marginTop: spacing.lg,
    },
    group: {
      overflow: 'hidden',
      backgroundColor: colors.surface,
      borderColor: colors.categoryPreviewBorder,
      borderRadius: previewCardLayout.borderRadius,
      borderWidth: 2,
    },
    separator: {
      height: 1,
      backgroundColor: colors.categoryPreviewBorder,
    },
    addAction: {
      minHeight: minTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      marginTop: spacing.md,
    },
    addActionPressed: { opacity: 0.64 },
  });
}
