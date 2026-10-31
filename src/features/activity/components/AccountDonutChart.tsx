import { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';

import {
  DonutBreakdownChart,
  type DonutBreakdownMode,
} from '@/components/ui/Charts/DonutBreakdownChart';
import { CreatePreviewBadge } from '@/components/ui/CreatePreviewBadge/CreatePreviewBadge';
import type { MoneyAccount } from '@/features/accounts/types';
import { summarizeMoneyAccountTotals } from '@/features/accounts/utils/moneyAccountSummary';
import { useBreakdownPeriod } from '@/features/activity/components/useBreakdownPeriod';
import { CategoryDetailPeriodFilter } from '@/features/categories/components/CategoryDetailModal/CategoryDetailPeriodFilter';
import type { SessionTransaction } from '@/features/transactions/types';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { categoryColors } from '@/theme/categoryColors';
import { spacing } from '@/theme/spacing';

type AccountDonutChartProps = {
  accounts: readonly MoneyAccount[];
  currency: CurrencyCode;
  onCreateMovement?: () => void;
  onDataAvailabilityChange?: (hasData: boolean) => void;
  onOpenMoneyAccountDetail?: (moneyAccountId: string) => void;
  /** Cambia (p. ej. al reenfocar la pantalla) para reiniciar el revelado. */
  resetKey?: number;
  transactions: readonly SessionTransaction[];
};

/**
 * Reparto por cuenta del mes elegido, sobre el mismo donut que categorías: qué
 * cuenta genera más ingresos y de cuál salen más gastos. Nunca mezcla divisas,
 * porque solo reparte los importes de la moneda recibida.
 */
export function AccountDonutChart({
  accounts,
  currency,
  onCreateMovement,
  onDataAvailabilityChange,
  onOpenMoneyAccountDetail,
  resetKey,
  transactions,
}: AccountDonutChartProps) {
  const [mode, setMode] = useState<DonutBreakdownMode>('expense');
  const { filter, nextDisabled, periodKey, periodTransactions, setFilter } =
    useBreakdownPeriod(transactions);
  const slices = useMemo(
    () =>
      summarizeMoneyAccountTotals(accounts, periodTransactions, currency).map(
        (account) => ({
          color: categoryColors[account.colorToken],
          id: account.id,
          label: account.name,
          valueMinor:
            mode === 'expense' ? account.expenseMinor : account.incomeMinor,
        }),
      ),
    [accounts, currency, mode, periodTransactions],
  );

  return (
    <DonutBreakdownChart
      currency={currency}
      emptyContent={
        <CreatePreviewBadge
          accessibilityLabel="Crear movimiento"
          bordered
          label="Crear movimiento"
          onPress={onCreateMovement}
          testID="activity-add-money-account"
        />
      }
      idPrefix="account"
      mode={mode}
      onModeChange={setMode}
      onDataAvailabilityChange={onDataAvailabilityChange}
      onSlicePress={onOpenMoneyAccountDetail}
      periodControl={
        <CategoryDetailPeriodFilter
          filter={filter}
          nextDisabled={nextDisabled}
          onChange={setFilter}
          optionsStyle={styles.periodOptions}
          testID="account-period-selector"
        />
      }
      periodKey={periodKey}
      resetKey={resetKey}
      slicePressHint="Abre el detalle de la cuenta"
      slices={slices}
    />
  );
}

const styles = StyleSheet.create({
  periodOptions: { marginBottom: spacing.lg },
});
