import { useMemo, useState } from 'react';

import {
  DonutBreakdownChart,
  type DonutBreakdownMode,
} from '@/components/ui/Charts/DonutBreakdownChart';
import { CreatePreviewBadge } from '@/components/ui/CreatePreviewBadge/CreatePreviewBadge';
import type { MoneyAccount } from '@/features/accounts/types';
import { summarizeMoneyAccountTotals } from '@/features/accounts/utils/moneyAccountSummary';
import {
  formatMonthKey,
  getCurrentMonthKey,
  listTransactionsByMonth,
  shiftMonthKey,
} from '@/features/categories/utils/categorySummary';
import type { SessionTransaction } from '@/features/transactions/types';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { categoryColors } from '@/theme/categoryColors';

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
  const currentMonthKey = getCurrentMonthKey();
  const [monthKey, setMonthKey] = useState(currentMonthKey);
  const slices = useMemo(
    () =>
      summarizeMoneyAccountTotals(
        accounts,
        listTransactionsByMonth(transactions, monthKey),
        currency,
      ).map((account) => ({
        color: categoryColors[account.colorToken],
        id: account.id,
        label: account.name,
        valueMinor:
          mode === 'expense' ? account.expenseMinor : account.incomeMinor,
      })),
    [accounts, currency, mode, monthKey, transactions],
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
      isCurrentMonth={monthKey === currentMonthKey}
      mode={mode}
      monthLabel={formatMonthKey(monthKey)}
      onModeChange={setMode}
      onDataAvailabilityChange={onDataAvailabilityChange}
      onMonthChange={(offset) =>
        setMonthKey((current) => shiftMonthKey(current, offset))
      }
      onSlicePress={onOpenMoneyAccountDetail}
      resetKey={resetKey}
      slicePressHint="Abre el detalle de la cuenta"
      slices={slices}
    />
  );
}
