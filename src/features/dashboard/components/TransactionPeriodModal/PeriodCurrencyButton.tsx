import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import type { TransactionPeriodModalType } from '@/features/dashboard/components/TransactionPeriodModal/TransactionPeriodModal';
import { createStyles } from '@/features/dashboard/components/TransactionPeriodModal/TransactionPeriodModal.styles';
import {
  getCurrencyFlag,
  getCurrencyName,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import { iconSize } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

/** Moneda de la tarjeta de total; abre el selector cuando hay varias. */
export function PeriodCurrencyButton({
  currency,
  onPress,
  type,
}: {
  currency: CurrencyCode;
  onPress: () => void;
  type: TransactionPeriodModalType;
}) {
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));

  return (
    <Pressable
      accessibilityHint="Abre las opciones de moneda"
      accessibilityLabel={`Moneda: ${getCurrencyName(currency)}`}
      accessibilityRole="button"
      onPress={onPress}
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
        {getCurrencyFlag(currency)}
      </Text>
      <Text variant="label" weight="semibold">
        {currency}
      </Text>
      <Ionicons
        color={colors.textSecondary}
        name="chevron-down"
        size={iconSize.sm}
      />
    </Pressable>
  );
}
