import { Pressable, StyleSheet, View } from 'react-native';

import { usePreviewActionsTrigger } from '@/components/overlays/PreviewActions/previewActions';
import { Text } from '@/components/ui/Text/Text';
import { MoneyAccountIcon } from '@/features/accounts/components/MoneyAccountIcon/MoneyAccountIcon';
import { getMoneyAccountKindLabel } from '@/features/accounts/constants/moneyAccountKindDefinitions';
import {
  getPrimaryBalance,
  type MoneyAccountSummary,
} from '@/features/accounts/utils/moneyAccountSummary';
import { calculatePeriodComparison } from '@/features/transactions/utils/periodComparison';
import { useCurrencySymbolPreference } from '@/state/appPreferences/CurrencySymbolPreferenceProvider';
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

/** Tamaño de la tarjeta para una anchura dada, con la misma proporción. */
export function getMoneyAccountCardSize(width: number) {
  return {
    width,
    height:
      width * (moneyAccountCardLayout.height / moneyAccountCardLayout.width),
  };
}

/** Anchura de la versión reducida para los selectores de cuenta. */
const compactMoneyAccountCardWidth = 160;

type MoneyAccountCardProps = {
  account: MoneyAccountSummary;
  bordered?: boolean;
  compact?: boolean;
  onPress?: () => void;
  /** Anchura de la versión compacta cuando debe ajustarse a su contenedor. */
  compactWidth?: number;
  /**
   * Convierte la tarjeta en una opción de selección: se rellena con el color
   * de la cuenta cuando está elegida y deja de ofrecer editar o eliminar.
   */
  selected?: boolean;
};

export function MoneyAccountCard({
  account,
  bordered = false,
  compact = false,
  compactWidth = compactMoneyAccountCardWidth,
  onPress,
  selected,
}: MoneyAccountCardProps) {
  const isSelectable = selected !== undefined;
  // La pulsación larga abre eliminar y editar sobre una copia elevada.
  const previewActions = usePreviewActionsTrigger(
    isSelectable ? undefined : { kind: 'moneyAccount', id: account.id },
    () => <MoneyAccountCard account={account} bordered={bordered} />,
  );
  const { formatCurrency } = useCurrencySymbolPreference();
  const { colors, shadows } = useTheme();
  const themedStyles = useThemedStyles((palette) =>
    createThemedStyles(palette, shadows),
  );
  const cardColor = categoryColors[account.colorToken];
  // Seleccionada, la tarjeta toma el color de la cuenta y el contenido pasa a
  // blanco.
  const accentColor = selected ? colors.onBrand : cardColor;
  const textTone = selected ? 'onBrand' : undefined;
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
  const changeAmount = comparison
    ? formatCurrency(
        Math.abs(comparison.changeMinor),
        primary.currency,
        'es-ES',
      )
    : '';
  const comparisonLabel = comparison
    ? `${comparison.direction === 'up' ? '+' : comparison.direction === 'down' ? '-' : ''}${changeAmount}`
    : null;
  const comparisonDescription = comparison
    ? comparison.direction === 'up'
      ? `${changeAmount} más`
      : comparison.direction === 'down'
        ? `${changeAmount} menos`
        : 'sin cambios'
    : null;

  return (
    <Pressable
      accessibilityLabel={`${account.name}, ${kindLabel}, saldo ${balance}${comparisonDescription ? `, ${comparisonDescription} respecto al mes anterior` : ''}`}
      accessibilityRole={
        isSelectable ? 'radio' : onPress ? 'button' : undefined
      }
      accessibilityState={isSelectable ? { checked: selected } : undefined}
      disabled={!onPress && !previewActions}
      onPress={onPress}
      {...previewActions}
      style={({ pressed }) => [
        themedStyles.pressable,
        compact ? getMoneyAccountCardSize(compactWidth) : null,
        selected ? { backgroundColor: cardColor } : null,
        bordered && !selected
          ? {
              borderColor: colors.categoryPreviewBorder,
              borderWidth: StyleSheet.hairlineWidth,
            }
          : null,
        pressed && styles.pressed,
      ]}
      testID={`money-account-card-${account.id}`}
    >
      <View style={[styles.content, compact ? styles.compactContent : null]}>
        <View style={styles.topRow}>
          <MoneyAccountIcon
            color={accentColor}
            name={account.icon}
            size={compact ? iconSize.sm : iconSize.md}
          />
          {/* En el selector el nombre sube junto al icono y no hay divisas,
              así el tipo y el saldo respiran en una tarjeta tan pequeña. */}
          {compact ? (
            <Text
              numberOfLines={1}
              style={styles.compactTitle}
              testID={`money-account-card-${account.id}-title`}
              tone={textTone}
              variant="bodyStrong"
              weight="bold"
            >
              {account.name}
            </Text>
          ) : (
            <Text
              numberOfLines={1}
              style={[styles.currency, { color: accentColor }]}
              testID={`money-account-card-${account.id}-currencies`}
              variant="label"
              weight="medium"
            >
              {currencies}
            </Text>
          )}
        </View>

        <View style={styles.copy}>
          {compact ? null : (
            <Text
              numberOfLines={1}
              testID={`money-account-card-${account.id}-title`}
              tone={textTone}
              variant="subheading"
              weight="bold"
            >
              {account.name}
            </Text>
          )}
          <Text
            numberOfLines={1}
            tone={selected ? 'onBrandMuted' : 'secondary'}
            variant={compact ? 'caption' : 'label'}
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
            tone={textTone}
            variant={compact ? 'body' : 'subheading'}
            weight="medium"
          >
            {balance}
          </Text>
          {comparisonLabel && !compact ? (
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
  compactContent: { padding: spacing.sm },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currency: { opacity: 0.88 },
  compactTitle: { flexShrink: 1, marginLeft: spacing.xs, marginRight: 'auto' },
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
