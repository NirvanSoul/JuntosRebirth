import { getLocalDatabase } from '@/lib/storage/localDatabase';

/** SQLite admite como mucho 999 parámetros por sentencia en builds antiguas. */
const maxIdsPerStatement = 500;

/**
 * Firma los movimientos del demo con sus dos personas ficticias.
 *
 * Los repositorios de movimientos firman con la identidad de la sesión, y el
 * demo se siembra antes de abrirla: así la navegación no pinta un catálogo a
 * medio escribir. Esta corrección deja todo a nombre de quien usa el demo y
 * luego asigna a la pareja sus filas y sus series, para que las ocurrencias
 * futuras que materialice la serie también le pertenezcan.
 */
export async function assignDemoAuthorship(input: {
  selfUserId: string;
  partnerUserId: string;
  partnerTransactionIds: readonly string[];
  partnerSeriesIds: readonly string[];
}): Promise<void> {
  const database = await getLocalDatabase();
  await database.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync(
      'UPDATE transactions SET created_by = ?',
      input.selfUserId,
    );
    await transaction.runAsync(
      'UPDATE recurring_transaction_series SET created_by = ?',
      input.selfUserId,
    );
    const updates = [
      { table: 'transactions', ids: input.partnerTransactionIds },
      { table: 'recurring_transaction_series', ids: input.partnerSeriesIds },
    ] as const;
    for (const { table, ids } of updates) {
      for (let start = 0; start < ids.length; start += maxIdsPerStatement) {
        const chunk = ids.slice(start, start + maxIdsPerStatement);
        await transaction.runAsync(
          `UPDATE ${table} SET created_by = ?
            WHERE id IN (${chunk.map(() => '?').join(', ')})`,
          input.partnerUserId,
          ...chunk,
        );
      }
    }
  });
}
