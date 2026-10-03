import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Pressable,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';

import { Text } from '@/components/ui/Text/Text';
import type { CurrencyExchangeModalStyles } from '@/features/exchangeRates/components/CurrencyExchangeModal/CurrencyExchangeModal.styles';
import type { VenezuelaCurrencyCode } from '@/features/exchangeRates/types';
import { formatExchangeAmountInputForDisplay } from '@/features/exchangeRates/utils/currencyExchangeForm';
import { getCurrencySymbol } from '@/lib/currency/currencyCatalog';
import { iconSize } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/useTheme';
import { useCurrencySymbolPreference } from '@/state/appPreferences/CurrencySymbolPreferenceProvider';

type CurrencyExchangeAmountBlockProps = {
  /** Nombre de la cuenta elegida para este lado, si hay alguna. */
  accountName: string | null;
  /** Este bloque recibe las teclas del teclado numérico. */
  active: boolean;
  /** Pulso del importe con cada tecla, propio de la moneda del bloque. */
  amountPulseStyle: AnimatedStyle<ViewStyle>;
  /** Salida y entrada del bloque mientras las dos monedas cambian de sitio. */
  swapStyle: AnimatedStyle<ViewStyle>;
  currency: VenezuelaCurrencyCode;
  role: 'give' | 'receive';
  /** Sin cuentas en el espacio el botón no aparece, igual que en el modal de movimiento. */
  showAccountButton: boolean;
  styles: CurrencyExchangeModalStyles;
  value: string;
  /** Colocación del bloque: el modal mide con ella el salto del intercambio. */
  onLayout: (event: LayoutChangeEvent) => void;
  onPress: () => void;
  onPressAccount: () => void;
};

const roleLabels = { give: 'Entregas', receive: 'Recibes' } as const;
/** Nombres cortos del plan Venezuela (§6), no los del catálogo general. */
export const currencyExchangePluralNames = {
  USD: 'dólares',
  VES: 'bolívares',
} as const;
/** Lo que se entrega resta y lo que se recibe suma: mismos tonos que un movimiento. */
const roleTones: Record<'give' | 'receive', 'expense' | 'income'> = {
  give: 'expense',
  receive: 'income',
};
/** Límite visual antes de bajar de escala, como en el modal de movimiento. */
const amountMaxLength = 11;
const accountHitSlop = spacing.sm;

/**
 * Un lado de la operación: título con la moneda, importe grande que el
 * teclado edita cuando el bloque está activo y su cuenta opcional al lado.
 */
export function CurrencyExchangeAmountBlock({
  accountName,
  active,
  amountPulseStyle,
  currency,
  role,
  showAccountButton,
  styles,
  swapStyle,
  value,
  onLayout,
  onPress,
  onPressAccount,
}: CurrencyExchangeAmountBlockProps) {
  const { showCurrencySymbols } = useCurrencySymbolPreference();
  const { colors } = useTheme();
  const testID = `currency-exchange-${role}`;
  const pluralName = currencyExchangePluralNames[currency];
  const title = `${roleLabels[role]} ${pluralName}`;
  const displayValue = formatExchangeAmountInputForDisplay(value);
  const amountVariant =
    displayValue.length > amountMaxLength ? 'heading' : 'amount';
  const tone = roleTones[role];

  return (
    <Animated.View
      onLayout={onLayout}
      style={[styles.block, swapStyle]}
      testID={testID}
    >
      <Text tone="secondary" variant="label" weight="medium">
        {title}
      </Text>
      <View style={styles.amountRow}>
        <Pressable
          accessibilityHint="Escribe este importe con el teclado"
          accessibilityLabel={
            value ? `${title}: ${displayValue}` : `${title}, sin importe`
          }
          accessibilityRole="button"
          accessibilityState={{ selected: active }}
          onPress={onPress}
          style={styles.amountArea}
          testID={`${testID}-amount`}
        >
          <Animated.View style={[styles.amountValue, amountPulseStyle]}>
            <Text
              numberOfLines={1}
              style={styles.amount}
              testID={`${testID}-amount-value`}
              tone={value ? 'primary' : 'muted'}
              variant={amountVariant}
              weight="medium"
            >
              {displayValue || '0'}
            </Text>
            {showCurrencySymbols ? (
              <Text
                testID={`${testID}-amount-currency`}
                tone={active ? tone : 'muted'}
                variant="label"
                weight="semibold"
              >
                {getCurrencySymbol(currency)}
              </Text>
            ) : null}
          </Animated.View>
          <View
            style={[
              styles.amountUnderline,
              active && { backgroundColor: colors[tone] },
            ]}
            testID={`${testID}-amount-underline`}
          />
        </Pressable>
        {showAccountButton ? (
          <Pressable
            accessibilityHint={`Elige la cuenta de los ${pluralName}`}
            accessibilityLabel={
              accountName ? `Cuenta: ${accountName}` : 'Cuenta: ninguna'
            }
            accessibilityRole="button"
            hitSlop={accountHitSlop}
            onPress={onPressAccount}
            style={({ pressed }) => [
              styles.accountButton,
              pressed && styles.pressed,
            ]}
            testID={`${testID}-account`}
          >
            <Ionicons
              color={accountName ? colors.textPrimary : colors.textSecondary}
              name="wallet-outline"
              size={iconSize.sm}
            />
            <Text
              numberOfLines={1}
              style={styles.accountButtonLabel}
              tone={accountName ? 'primary' : 'secondary'}
              variant="footnote"
              weight="medium"
            >
              {accountName ?? 'Cuenta'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}
