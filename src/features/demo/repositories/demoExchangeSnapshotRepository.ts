import type { TransactionExchangeSnapshot } from '@/features/transactions/types';
import { getLocalDatabase } from '@/lib/storage/localDatabase';

type DemoSnapshotInput = {
  amountMinor: number;
  currency: 'USD' | 'VES';
  occurredOn: string;
};

type DemoSnapshot = {
  accountingAmountMinorUsd: number;
  exchangeSnapshot: TransactionExchangeSnapshot;
};

/**
 * Congela en cada movimiento del demo venezolano lo que el servidor guardaría
 * al sincronizarlo: su valor contable en USD y los equivalentes del día. Sin
 * ello, los modos «Bs. BCV» y «EUR» mostrarían todo como pendiente de tasa.
 *
 * Incluye las ocurrencias ya materializadas de las series recurrentes.
 */
export async function applyDemoExchangeSnapshots(
  buildSnapshot: (input: DemoSnapshotInput) => DemoSnapshot,
): Promise<void> {
  const database = await getLocalDatabase();
  await database.withExclusiveTransactionAsync(async (transaction) => {
    const rows = await transaction.getAllAsync<{
      id: string;
      amount_minor: number;
      currency: 'USD' | 'VES';
      occurred_on: string;
    }>(
      `SELECT id, amount_minor, currency, occurred_on
         FROM transactions
        WHERE currency IN ('USD', 'VES')`,
    );
    for (const row of rows) {
      const snapshot = buildSnapshot({
        amountMinor: row.amount_minor,
        currency: row.currency,
        occurredOn: row.occurred_on,
      });
      await transaction.runAsync(
        `UPDATE transactions
            SET accounting_amount_minor_usd = ?, exchange_snapshot_json = ?
          WHERE id = ?`,
        snapshot.accountingAmountMinorUsd,
        JSON.stringify(snapshot.exchangeSnapshot),
        row.id,
      );
    }
  });
}
