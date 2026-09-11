import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { useExchangeRates } from '@/features/exchangeRates/hooks/useExchangeRates';
import {
  getVenezuelaDisplayValue,
  type VenezuelaDisplayMode,
} from '@/features/exchangeRates/utils/venezuelaDisplayMode';
import type { SessionTransaction } from '@/features/transactions/types';
import { formatCurrency } from '@/lib/currency/formatCurrency';
import { iconSize } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import { createStyles } from './TransactionDetailModal.styles';

type TransactionDetailAmountProps = {
  /** Divisa en la que se lee el importe; no altera el guardado. */
  mode: VenezuelaDisplayMode;
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

/** Importe del movimiento, leído a las tasas congeladas de su snapshot o vigentes. */
export function TransactionDetailAmount({
  mode,
  onPress,
  transaction,
}: TransactionDetailAmountProps) {
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const isIncome = transaction.type === 'income';

  const exchangeRatesState = useExchangeRates();
  const apiRates =
    exchangeRatesState.status === 'success' ||
    exchangeRatesState.status === 'stale'
      ? exchangeRatesState.rates.rates
      : null;

  const snapshotBcv = transaction.exchangeSnapshot?.rates?.BCV;
  const snapshotEur = transaction.exchangeSnapshot?.rates?.EURO;

  const bcvRateNumber =
    Number(snapshotBcv?.rate) > 0
      ? Number(snapshotBcv?.rate)
      : apiRates?.BCV?.rate
        ? Number(apiRates.BCV.rate)
        : null;

  const eurRateNumber =
    Number(snapshotEur?.rate) > 0
      ? Number(snapshotEur?.rate)
      : apiRates?.EURO?.rate
        ? Number(apiRates.EURO.rate)
        : null;

  const displayValue = transaction.exchangeSnapshot
    ? getVenezuelaDisplayValue({
        accountingAmountMinorUsd: transaction.accountingAmountMinorUsd,
        amountMinor: transaction.amountMinor,
        currency: transaction.currency,
        exchangeSnapshot: transaction.exchangeSnapshot,
        mode,
      })
    : null;

  let effectiveAmountMinor =
    displayValue?.amountMinor ?? transaction.amountMinor;
  let effectiveCurrency = displayValue?.currency ?? transaction.currency;

  if (!displayValue) {
    if (mode === 'USD') {
      if (transaction.currency === 'USD') {
        effectiveAmountMinor = transaction.amountMinor;
        effectiveCurrency = 'USD';
      } else if (bcvRateNumber && bcvRateNumber > 0) {
        effectiveAmountMinor = Math.round(
          transaction.amountMinor / bcvRateNumber,
        );
        effectiveCurrency = 'USD';
      }
    } else if (mode === 'VES_BCV') {
      if (transaction.currency === 'VES') {
        effectiveAmountMinor = transaction.amountMinor;
        effectiveCurrency = 'VES';
      } else if (bcvRateNumber && bcvRateNumber > 0) {
        effectiveAmountMinor = Math.round(
          transaction.amountMinor * bcvRateNumber,
        );
        effectiveCurrency = 'VES';
      }
    } else if (mode === 'EUR') {
      const activeRate = eurRateNumber ?? bcvRateNumber;
      if (transaction.currency === 'USD') {
        if (activeRate && activeRate > 0) {
          effectiveAmountMinor = Math.round(
            transaction.amountMinor * activeRate,
          );
          effectiveCurrency = 'VES';
        }
      } else if (transaction.currency === 'VES') {
        if (bcvRateNumber && eurRateNumber && bcvRateNumber > 0) {
          effectiveAmountMinor = Math.round(
            (transaction.amountMinor / bcvRateNumber) * eurRateNumber,
          );
          effectiveCurrency = 'VES';
        }
      }
    }
  }

  const amount = formatCurrency(
    effectiveAmountMinor,
    effectiveCurrency,
    'es-ES',
  );

  const rateFooterInfo = useMemo(() => {
    const rawDate =
      mode === 'EUR'
        ? (snapshotEur?.observedAt ?? transaction.occurredOn)
        : (snapshotBcv?.observedAt ?? transaction.occurredOn);
    const dateFormatted = formatRateDate(rawDate);

    if (mode === 'VES_BCV') {
      if (bcvRateNumber && bcvRateNumber > 0) {
        return {
          dateText: dateFormatted,
          rateText: `1 $ BCV = Bs ${formatRateNumber(bcvRateNumber)}`,
        };
      }
    } else if (mode === 'EUR') {
      const activeEurRate = eurRateNumber ?? bcvRateNumber;
      if (activeEurRate && activeEurRate > 0) {
        return {
          dateText: dateFormatted,
          rateText: `1 € BCV = Bs ${formatRateNumber(activeEurRate)}`,
        };
      }
    } else if (mode === 'USD' && transaction.currency === 'VES') {
      if (bcvRateNumber && bcvRateNumber > 0) {
        return {
          dateText: dateFormatted,
          rateText: `1 $ BCV = Bs ${formatRateNumber(bcvRateNumber)}`,
        };
      }
    }
    return null;
  }, [
    bcvRateNumber,
    eurRateNumber,
    mode,
    snapshotBcv?.observedAt,
    snapshotEur?.observedAt,
    transaction.currency,
    transaction.occurredOn,
  ]);

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
            testID="transaction-detail-rate-text"
            tone="secondary"
            variant="caption"
          >
            {rateFooterInfo.rateText}
          </Text>
          <Text
            testID="transaction-detail-rate-date"
            tone="secondary"
            variant="caption"
          >
            {rateFooterInfo.dateText}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
