import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text, type TextTone } from '@/components/ui/Text/Text';
import { useVenezuelaRatesAt } from '@/features/exchangeRates/hooks/useVenezuelaRatesAt';
import {
  getValueAtRates,
  getVenezuelaDisplayValue,
  type VenezuelaDisplayMode,
} from '@/features/exchangeRates/utils/venezuelaDisplayMode';
import { RateDatePickerModal } from '@/features/transactions/components/TransactionDetailModal/RateDatePickerModal';
import type { SessionTransaction } from '@/features/transactions/types';
import { useDepsChanged } from '@/hooks/useDepsChanged';
import { useCurrencySymbolPreference } from '@/state/appPreferences/CurrencySymbolPreferenceProvider';
import { iconSize } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import { createStyles } from './TransactionDetailModal.styles';

type TransactionDetailAmountProps = {
  /** Degradado de la categoría para el botón principal del selector de fecha. */
  accentColor?: string;
  accentTextTone?: TextTone;
  /** Divisa en la que se lee el importe; no altera el guardado. */
  mode?: VenezuelaDisplayMode;
  onPress: () => void;
  transaction: SessionTransaction;
};

function formatRateNumber(rateValue: number): string {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rateValue);
}

function formatRateDate(dateStr: string): string {
  const date = dateStr.includes('T')
    ? new Date(dateStr)
    : new Date(`${dateStr}T12:00:00`);
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function toRate(value: string | null | undefined): number | null {
  return Number(value) > 0 ? Number(value) : null;
}

/** «1 $ BCV = Bs 893,22»: la tasa que valora el importe en cada modo. */
function formatModeRate(
  mode: VenezuelaDisplayMode,
  rate: number,
  showCurrencySymbols: boolean,
): string {
  const value = formatRateNumber(rate);
  if (mode === 'VES_USDT') return `1 USDT = Bs ${value}`;
  if (mode === 'EUR') {
    return showCurrencySymbols
      ? `1 € BCV = Bs ${value}`
      : `Tasa euro BCV: ${value}`;
  }
  return showCurrencySymbols ? `1 $ BCV = Bs ${value}` : `Tasa BCV: ${value}`;
}

/**
 * Importe del movimiento. Por defecto se lee desde su valor original o su
 * snapshot; el badge de la fecha permite leerlo con las tasas de otro día
 * («cuánto me habría costado»), y entonces el badge se tiñe.
 */
export function TransactionDetailAmount({
  accentColor,
  accentTextTone,
  mode,
  onPress,
  transaction,
}: TransactionDetailAmountProps) {
  const { formatCurrency, showCurrencySymbols } = useCurrencySymbolPreference();
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const isIncome = transaction.type === 'income';
  /** Día elegido para valorar el importe; `null` es la fecha del movimiento. */
  const [rateDate, setRateDate] = useState<string | null>(null);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);

  if (useDepsChanged([transaction.id])) {
    setRateDate(null);
    setDatePickerVisible(false);
  }

  const snapshotRates = transaction.exchangeSnapshot?.rates;
  const bcvRateNumber = toRate(snapshotRates?.BCV?.rate);
  const eurRateNumber = toRate(snapshotRates?.EURO?.rate);
  const frozenUsdtRate = toRate(snapshotRates?.USDT?.rate);

  // El servidor aún no congela USDT en todos los movimientos. Sin tasa
  // congelada se pide la que regía el día (y la hora) del movimiento, nunca
  // la de hoy. Con otro día elegido se piden las tres tasas de ese día.
  const isCustomDate = rateDate !== null;
  const needsDatedUsdt =
    !isCustomDate && mode === 'VES_USDT' && frozenUsdtRate === null;
  const datedRates = useVenezuelaRatesAt({
    date: rateDate ?? transaction.occurredOn,
    enabled: Boolean(mode) && (isCustomDate || needsDatedUsdt),
    time: isCustomDate ? undefined : transaction.occurredTime,
  });
  const historicalUsdtRate = needsDatedUsdt
    ? toRate(datedRates?.usdt?.rate)
    : null;

  const usdAmountMinor =
    transaction.currency === 'USD'
      ? transaction.amountMinor
      : transaction.accountingAmountMinorUsd;
  const snapshotValue =
    mode && transaction.exchangeSnapshot
      ? getVenezuelaDisplayValue({
          accountingAmountMinorUsd: transaction.accountingAmountMinorUsd,
          amountMinor: transaction.amountMinor,
          currency: transaction.currency,
          exchangeSnapshot: transaction.exchangeSnapshot,
          mode,
        })
      : null;
  const defaultValue =
    snapshotValue ??
    (historicalUsdtRate && typeof usdAmountMinor === 'number'
      ? {
          amountMinor: Math.round(usdAmountMinor * historicalUsdtRate),
          currency: 'VES' as const,
        }
      : null);
  const customValue =
    isCustomDate && mode && datedRates
      ? getValueAtRates({
          accountingAmountMinorUsd: transaction.accountingAmountMinorUsd,
          amountMinor: transaction.amountMinor,
          currency: transaction.currency,
          mode,
          rates: {
            bcvUsd: toRate(datedRates.bcvUsd),
            bcvEur: toRate(datedRates.bcvEur),
            usdt: toRate(datedRates.usdt?.rate),
          },
        })
      : null;
  const displayValue = customValue ?? defaultValue;

  const amount = formatCurrency(
    displayValue?.amountMinor ?? transaction.amountMinor,
    displayValue?.currency ?? transaction.currency,
    'es-ES',
  );

  const getDefaultFooter = (): {
    dateText: string;
    rateText: string | null;
  } | null => {
    if (!mode) return null;
    if (mode === 'VES_USDT') {
      const usdtRate = frozenUsdtRate ?? historicalUsdtRate;
      return {
        dateText: formatRateDate(
          (frozenUsdtRate ? snapshotRates?.USDT?.observedAt : null) ??
            transaction.occurredOn,
        ),
        rateText: usdtRate
          ? formatModeRate(mode, usdtRate, showCurrencySymbols)
          : datedRates === undefined
            ? 'Buscando tasa USDT…'
            : 'Sin tasa USDT',
      };
    }
    const rate =
      mode === 'EUR'
        ? (eurRateNumber ?? bcvRateNumber)
        : mode === 'VES_BCV' || transaction.currency === 'VES'
          ? bcvRateNumber
          : null;
    if (!rate) return null;
    const observedAt =
      mode === 'EUR'
        ? snapshotRates?.EURO?.observedAt
        : snapshotRates?.BCV?.observedAt;
    return {
      dateText: formatRateDate(observedAt ?? transaction.occurredOn),
      rateText: formatModeRate(mode, rate, showCurrencySymbols),
    };
  };

  const rateFooterInfo =
    isCustomDate && mode
      ? {
          dateText: formatRateDate(rateDate),
          rateText:
            datedRates === undefined
              ? 'Buscando tasas…'
              : !customValue
                ? 'Sin tasa ese día'
                : customValue.rate
                  ? formatModeRate(mode, customValue.rate, showCurrencySymbols)
                  : null,
        }
      : getDefaultFooter();

  const selectRateDate = (date: string) => {
    setDatePickerVisible(false);
    // Volver a la fecha del movimiento es volver a su lectura por defecto.
    setRateDate(date === transaction.occurredOn ? null : date);
  };

  return (
    <Pressable
      accessibilityLabel={`Editar importe: ${isIncome ? 'Ingreso' : 'Gasto'} de ${amount}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.amountCard, pressed && styles.pressed]}
      testID="transaction-detail-amount"
    >
      <Text tone="secondary" variant="caption">
        {isIncome ? 'Importe ingresado' : 'Importe gastado'}
      </Text>
      <View style={styles.amountRow}>
        <Text testID="transaction-detail-rate-badge" variant="amount">
          {amount}
        </Text>
        <View
          style={styles.directionIcon}
          testID="transaction-detail-direction-icon"
        >
          <View style={styles.diagonalArrow}>
            <Ionicons
              color={isIncome ? colors.income : colors.expense}
              name={isIncome ? 'arrow-up' : 'arrow-down'}
              size={iconSize.sm}
              testID="transaction-detail-direction-glyph"
            />
          </View>
        </View>
      </View>
      {rateFooterInfo ? (
        <View style={styles.rateFooter} testID="transaction-detail-rate-footer">
          <Text
            style={styles.rateText}
            testID="transaction-detail-rate-text"
            tone="secondary"
            variant="caption"
          >
            {rateFooterInfo.rateText ?? ''}
          </Text>
          <Pressable
            accessibilityLabel={`Cambiar la fecha de la tasa: ${rateFooterInfo.dateText}`}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setDatePickerVisible(true)}
            style={({ pressed }) => [
              styles.rateDateBadge,
              isCustomDate && styles.rateDateBadgeChanged,
              pressed && styles.pressed,
            ]}
            testID="transaction-detail-rate-date-button"
          >
            <Ionicons
              color={isCustomDate ? colors.cta : colors.textMuted}
              name="calendar-outline"
              size={iconSize.xs}
            />
            <Text
              testID="transaction-detail-rate-date"
              tone={isCustomDate ? 'cta' : 'secondary'}
              variant="caption"
            >
              {rateFooterInfo.dateText}
            </Text>
          </Pressable>
        </View>
      ) : null}
      <RateDatePickerModal
        accentColor={accentColor}
        accentTextTone={accentTextTone}
        onClose={() => setDatePickerVisible(false)}
        onSelect={selectRateDate}
        selectedDate={rateDate ?? transaction.occurredOn}
        visible={isDatePickerVisible}
      />
    </Pressable>
  );
}
