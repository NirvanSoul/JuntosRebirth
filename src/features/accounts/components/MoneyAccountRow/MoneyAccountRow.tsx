import { Pressable, StyleSheet, View } from 'react-native';

import { usePreviewActionsTrigger } from '@/components/overlays/PreviewActions/previewActions';
import { Text } from '@/components/ui/Text/Text';
import { MoneyAccountIcon } from '@/features/accounts/components/MoneyAccountIcon/MoneyAccountIcon';
import { getMoneyAccountKindLabel } from '@/features/accounts/constants/moneyAccountKindDefinitions';
import {
  getPrimaryBalance,
  type MoneyAccountSummary,
} from '@/features/accounts/utils/moneyAccountSummary';
import { useCurrencySymbolPreference } from '@/state/appPreferences/CurrencySymbolPreferenceProvider';
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
  // La pulsación larga abre eliminar y editar sobre una copia elevada.
  const previewActions = usePreviewActionsTrigger(
    { kind: 'moneyAccount', id: account.id },
    () => <MoneyAccountRow account={account} />,
  );
  const { formatCurrency } = useCurrencySymbolPreference();
  const styles = useThemedStyles(createStyles);
  const accountColor = categoryColors[account.colorToken];
  const contentContrast = getCategoryContentContrast(account.colorToken);
  const primary = getPrimaryBalance(account);
  const balance = formatCurrency(
    primary.balanceMinor,
    primary.currency,
    'es-ES',
  );
  const extraCurrencyCount = account.balanceByCurrency.length - 1;

  return (
    <Pressable
      accessibilityLabel={`${account.name}, saldo ${balance}`}
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress && !previewActions}
      onPress={onPress}
      {...previewActions}
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
          {extraCurrencyCount > 0
            ? `${getMoneyAccountKindLabel(account.kind)} · ${extraCurrencyCount + 1} monedas`
            : getMoneyAccountKindLabel(account.kind)}
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
