import { Pressable, StyleSheet, View } from 'react-native';

import { GradientCard } from '@/components/ui/GradientCard/GradientCard';
import { Text } from '@/components/ui/Text/Text';
import { MoneyAccountIcon } from '@/features/accounts/components/MoneyAccountIcon/MoneyAccountIcon';
import { getMoneyAccountKindLabel } from '@/features/accounts/constants/moneyAccountKindDefinitions';
import {
  getPrimaryBalance,
  type MoneyAccountSummary,
} from '@/features/accounts/utils/moneyAccountSummary';
import { formatCurrency } from '@/lib/currency/formatCurrency';
import {
  categoryColors,
  getCategoryContentContrast,
} from '@/theme/categoryColors';
import { createDiagonalGradient } from '@/theme/gradients';
import { iconSize } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';

/**
 * Proporción y anchura de la tarjeta. Nace de la relación de una tarjeta
 * física (85,6 × 53,98 mm) para que se lea como tal en el carrusel.
 */
export const moneyAccountCardLayout = {
  width: 232,
  height: 146,
} as const;

type MoneyAccountCardProps = {
  account: MoneyAccountSummary;
  onPress?: () => void;
};

export function MoneyAccountCard({ account, onPress }: MoneyAccountCardProps) {
  const cardColor = categoryColors[account.colorToken];
  const contentContrast = getCategoryContentContrast(account.colorToken);
  const primary = getPrimaryBalance(account);
  const balance = formatCurrency(
    primary.balanceMinor,
    primary.currency,
    'es-ES',
  );
  // Las divisas nunca se suman: las secundarias se enseñan aparte, cada una
  // con su propio saldo.
  const secondaryBalances = account.balanceByCurrency.slice(1);
  const kindLabel = getMoneyAccountKindLabel(account.kind);

  return (
    <Pressable
      accessibilityLabel={`${account.name}, ${kindLabel}, saldo ${balance}`}
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      testID={`money-account-card-${account.id}`}
    >
      <GradientCard
        colors={createDiagonalGradient(cardColor)}
        contentStyle={styles.content}
        style={styles.card}
      >
        <View style={styles.topRow}>
          <MoneyAccountIcon
            color={contentContrast.color}
            name={account.icon}
            size={iconSize.md}
          />
          <Text
            numberOfLines={1}
            style={styles.currency}
            tone={contentContrast.tone}
            variant="caption"
            weight="semibold"
          >
            {primary.currency}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <Text
            numberOfLines={1}
            tone={contentContrast.tone}
            variant="caption"
            weight="light"
          >
            {kindLabel}
          </Text>
          <Text
            numberOfLines={1}
            tone={contentContrast.tone}
            variant="label"
            weight="semibold"
          >
            {account.name}
          </Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            numberOfLines={1}
            style={styles.balance}
            testID={`money-account-card-${account.id}-balance`}
            tone={contentContrast.tone}
            variant="subheading"
          >
            {balance}
          </Text>
          {secondaryBalances.length > 0 ? (
            <Text
              numberOfLines={1}
              testID={`money-account-card-${account.id}-secondary-balances`}
              tone={contentContrast.tone}
              variant="caption"
            >
              {secondaryBalances
                .map((balanceByCurrency) =>
                  formatCurrency(
                    balanceByCurrency.balanceMinor,
                    balanceByCurrency.currency,
                    'es-ES',
                  ),
                )
                .join('  ·  ')}
            </Text>
          ) : null}
        </View>
      </GradientCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: moneyAccountCardLayout.width,
  },
  pressed: { opacity: 0.72 },
  card: {
    height: moneyAccountCardLayout.height,
    borderRadius: radii.lg,
  },
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
  bottomRow: { gap: spacing.xxs },
  balance: { marginTop: spacing.xxs },
});
