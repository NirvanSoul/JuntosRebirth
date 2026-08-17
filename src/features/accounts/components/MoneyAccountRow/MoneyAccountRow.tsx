import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { MoneyAccountIcon } from '@/features/accounts/components/MoneyAccountIcon/MoneyAccountIcon';
import { getMoneyAccountKindLabel } from '@/features/accounts/constants/moneyAccountKindDefinitions';
import type { MoneyAccountSummary } from '@/features/accounts/utils/moneyAccountSummary';
import { formatCurrency } from '@/lib/currency/formatCurrency';
import {
  categoryColors,
  getCategoryContentContrast,
} from '@/theme/categoryColors';
import { previewCardLayout } from '@/theme/previewCard';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useThemedStyles } from '@/theme/useThemedStyles';

type MoneyAccountRowProps = {
  account: MoneyAccountSummary;
  onPress?: () => void;
};

export function MoneyAccountRow({ account, onPress }: MoneyAccountRowProps) {
  const styles = useThemedStyles(createStyles);
  const accountColor = categoryColors[account.colorToken];
  const contentContrast = getCategoryContentContrast(account.colorToken);
  const balance = formatCurrency(
    account.balanceMinor,
    account.currency,
    'es-ES',
  );

  return (
    <Pressable
      accessibilityLabel={`${account.name}, saldo ${balance}`}
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      testID={`money-account-row-${account.id}`}
    >
      <View style={[styles.icon, { backgroundColor: accountColor }]}>
        <MoneyAccountIcon
          color={contentContrast.color}
          name={account.icon}
          size={previewCardLayout.glyphSize}
        />
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} variant="label" weight="semibold">
          {account.name}
        </Text>
        <Text numberOfLines={1} tone="secondary" variant="caption">
          {getMoneyAccountKindLabel(account.kind)}
        </Text>
      </View>
      <Text numberOfLines={1} variant="label" weight="semibold">
        {balance}
      </Text>
    </Pressable>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    row: {
      minHeight: previewCardLayout.minHeight,
      flexDirection: 'row',
      alignItems: 'center',
      gap: previewCardLayout.gap,
      backgroundColor: colors.surface,
      paddingHorizontal: previewCardLayout.paddingHorizontal,
      paddingVertical: previewCardLayout.paddingVertical,
    },
    pressed: { opacity: 0.72 },
    icon: {
      width: previewCardLayout.iconSize,
      height: previewCardLayout.iconSize,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: previewCardLayout.iconRadius,
    },
    copy: { flex: 1, gap: spacing.xxs },
  });
}
