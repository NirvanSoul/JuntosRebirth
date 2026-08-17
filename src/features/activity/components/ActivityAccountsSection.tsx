import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState/EmptyState';
import { MoneyAccountCarousel } from '@/features/accounts/components/MoneyAccountCarousel/MoneyAccountCarousel';
import { MoneyAccountRow } from '@/features/accounts/components/MoneyAccountRow/MoneyAccountRow';
import type { MoneyAccountSummary } from '@/features/accounts/utils/moneyAccountSummary';
import { ActivityCollapsibleSection } from '@/features/activity/components/ActivityCollapsibleSection';
import { previewCardLayout } from '@/theme/previewCard';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type ActivityAccountsSectionProps = {
  accounts: readonly MoneyAccountSummary[];
  expanded: boolean;
  onCreateMoneyAccount?: () => void;
  onOpenMoneyAccountDetail?: (moneyAccountId: string) => void;
  onToggle: () => void;
};

/**
 * Sección «Cuentas» de Actividad: las tarjetas en un carrusel y, debajo, la
 * misma información como lista compacta con icono, nombre y saldo.
 */
export function ActivityAccountsSection({
  accounts,
  expanded,
  onCreateMoneyAccount,
  onOpenMoneyAccountDetail,
  onToggle,
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
          <MoneyAccountCarousel
            accounts={accounts}
            onOpenMoneyAccountDetail={onOpenMoneyAccountDetail}
            testID="activity-account-scroller"
          />

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
        </>
      ) : (
        <EmptyState
          accessibilityLabel="Crear primera cuenta"
          description="Crea una cuenta para saber cuánto te queda en cada sitio."
          icon="wallet-outline"
          iconBackgroundColor={colors.brand}
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
  });
}
