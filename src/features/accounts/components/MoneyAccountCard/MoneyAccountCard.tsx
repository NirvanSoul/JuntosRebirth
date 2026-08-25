import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { MoneyAccountIcon } from '@/features/accounts/components/MoneyAccountIcon/MoneyAccountIcon';
import { getMoneyAccountKindLabel } from '@/features/accounts/constants/moneyAccountKindDefinitions';
import {
  getPrimaryBalance,
  type MoneyAccountSummary,
} from '@/features/accounts/utils/moneyAccountSummary';
import { calculatePeriodComparison } from '@/features/transactions/utils/periodComparison';
import { formatCurrency } from '@/lib/currency/formatCurrency';
import { categoryColors } from '@/theme/categoryColors';
import { iconSize } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

/**
 * Proporción y anchura de la tarjeta. Nace de la relación de una tarjeta
 * física (85,6 × 53,98 mm) para que se lea como tal en el carrusel.
 */
export const moneyAccountCardLayout = {
  width: 232 * 1.08,
  height: 146 * 1.05,
} as const;

type MoneyAccountCardProps = {
  account: MoneyAccountSummary;
  bordered?: boolean;
  onPress?: () => void;
};

export function MoneyAccountCard({
  account,
  bordered = false,
  onPress,
}: MoneyAccountCardProps) {
  const { shadows } = useTheme();
  const themedStyles = useThemedStyles((palette) =>
    createThemedStyles(palette, shadows),
  );
  const cardColor = categoryColors[account.colorToken];
  const primary = getPrimaryBalance(account);
  const balance = formatCurrency(
    primary.balanceMinor,
    primary.currency,
    'es-ES',
  );
  const kindLabel = getMoneyAccountKindLabel(account.kind);
  // Una cuenta puede manejar varias divisas, pero no se suman: la variación
  // compara exclusivamente la moneda principal que encabeza la tarjeta.
  const comparison = primary.hasPreviousMonthTransaction
    ? calculatePeriodComparison(
        primary.balanceMinor,
        primary.previousMonthBalanceMinor,
      )
    : null;
  const currencies = account.balanceByCurrency
    .map((balanceByCurrency) => balanceByCurrency.currency)
    .join(' · ');
  const comparisonLabel = comparison
    ? `${comparison.direction === 'up' ? '+' : comparison.direction === 'down' ? '-' : ''}${Math.round(Math.abs(comparison.changePercent))}%`
    : null;
  const comparisonDescription = comparison
    ? comparison.direction === 'up'
      ? `subió ${Math.round(Math.abs(comparison.changePercent))}%`
      : comparison.direction === 'down'
        ? `bajó ${Math.round(Math.abs(comparison.changePercent))}%`
        : 'sin cambios'
    : null;

  return (
    <Pressable
      accessibilityLabel={`${account.name}, ${kindLabel}, saldo ${balance}${comparisonDescription ? `, ${comparisonDescription} respecto al mes anterior` : ''}`}
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        themedStyles.pressable,
        bordered ? { borderColor: cardColor, borderWidth: 1 } : null,
        pressed && styles.pressed,
      ]}
      testID={`money-account-card-${account.id}`}
    >
      <View style={styles.content}>
        <View style={styles.topRow}>
          <MoneyAccountIcon
            color={cardColor}
            name={account.icon}
            size={iconSize.md}
          />
          <Text
            numberOfLines={1}
            style={[styles.currency, { color: cardColor }]}
            testID={`money-account-card-${account.id}-currencies`}
            variant="label"
            weight="medium"
          >
            {currencies}
          </Text>
        </View>

        <View style={styles.copy}>
          <Text
            numberOfLines={1}
            testID={`money-account-card-${account.id}-title`}
            variant="subheading"
            weight="bold"
          >
            {account.name}
          </Text>
          <Text
            numberOfLines={1}
            tone="secondary"
            variant="label"
            weight="light"
          >
            {kindLabel}
          </Text>
        </View>
        <View style={styles.bottomRow}>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            numberOfLines={1}
            style={styles.balance}
            testID={`money-account-card-${account.id}-balance`}
            variant="subheading"
            weight="medium"
          >
            {balance}
          </Text>
          {comparisonLabel ? (
            <View
              accessibilityLabel={`Variación respecto al mes anterior: ${comparisonDescription}`}
              style={[styles.comparisonBadge, { backgroundColor: cardColor }]}
              testID={`money-account-card-${account.id}-comparison`}
            >
              <Text tone="onBrand" variant="label" weight="medium">
                {comparisonLabel}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function createThemedStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    pressable: {
      ...shadows.subtle,
      width: moneyAccountCardLayout.width,
      height: moneyAccountCardLayout.height,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      overflow: 'visible',
    },
  });
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.72 },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currency: { opacity: 0.88 },
  copy: { gap: spacing.none },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  balance: { flexShrink: 1 },
  comparisonBadge: {
    borderRadius: radii.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
});
