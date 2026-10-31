import type { Category } from '@/features/categories/types';
import type { SessionTransaction } from '@/features/transactions/types';
import { getTransactionCopyKey } from '@/features/transactions/utils/transactionCopyIdentity';
import {
  addDays,
  projectRecurringTransactions,
} from '@/features/transactions/utils/transactionRecurrence';

/**
 * Días de antelación con los que un movimiento futuro cuenta como aviso nuevo
 * (el punto de la campana). Los más lejanos solo se listan como información.
 */
export const upcomingNoticeLeadDays = 2;

/** Días hacia delante que lista la bandeja de notificaciones. */
export const upcomingNoticeHorizonDays = 30;

/**
 * Aviso de la bandeja de notificaciones: un gasto o ingreso futuro, guardado o
 * proyectado de una serie recurrente, que llega en `daysUntil` días.
 */
export type UpcomingNotice = {
  /**
   * Cambia cada día que se acerca el movimiento, así que el aviso de
   * «mañana» vuelve a contar como nuevo aunque ya se viera el de «en 2 días».
   */
  key: string;
  category: Category | null;
  daysUntil: number;
  /**
   * Igual para el mismo movimiento copiado en varios espacios en la misma
   * fecha: la bandeja los muestra como un hilo.
   */
  threadKey: string;
  transaction: SessionTransaction;
};

type BuildUpcomingNoticesInput = {
  categories: readonly Category[];
  today: string;
  transactions: readonly SessionTransaction[];
};

export function buildUpcomingNotices({
  categories,
  today,
  transactions,
}: BuildUpcomingNoticesInput): UpcomingNotice[] {
  const startOn = addDays(today, 1);
  const endOn = addDays(today, upcomingNoticeHorizonDays);
  const categoryById = new Map(
    categories.map((category) => [category.id, category] as const),
  );
  const transactionById = new Map(
    transactions.map((transaction) => [transaction.id, transaction] as const),
  );
  // Una copia apunta a su original; el original de la cadena identifica el
  // movimiento en todos los espacios, como al copiarlo.
  const getOriginal = (transaction: SessionTransaction) => {
    let original = transaction;
    const visited = new Set<string>();
    while (original.sourceTransactionId && !visited.has(original.id)) {
      visited.add(original.id);
      const source = transactionById.get(original.sourceTransactionId);
      if (!source) break;
      original = source;
    }
    return original;
  };

  return projectRecurringTransactions({ endOn, startOn, transactions })
    .filter(
      (transaction) =>
        transaction.occurredOn >= startOn && transaction.occurredOn <= endOn,
    )
    .map((transaction) => {
      const daysUntil = getDaysBetween(today, transaction.occurredOn);
      return {
        key: `${transaction.id}:${transaction.occurredOn}:${daysUntil}`,
        category: categoryById.get(transaction.categoryId) ?? null,
        daysUntil,
        threadKey: `${getTransactionCopyKey(getOriginal(transaction))}:${transaction.occurredOn}`,
        transaction,
      };
    })
    .sort(
      (left, right) =>
        left.transaction.occurredOn.localeCompare(
          right.transaction.occurredOn,
        ) || left.transaction.title.localeCompare(right.transaction.title),
    );
}

/** Días entre dos claves `YYYY-MM-DD`, sin depender de la zona horaria. */
function getDaysBetween(fromOn: string, toOn: string): number {
  const toUtc = (dateKey: string) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    return Date.UTC(year!, month! - 1, day!);
  };
  return Math.round((toUtc(toOn) - toUtc(fromOn)) / 86_400_000);
}

/**
 * Agrupa en hilos los avisos del mismo movimiento en varios espacios. Cada
 * hilo conserva la posición de su primer aviso y ordena los suyos según
 * `spaceOrder`: el primero queda arriba y el resto se revela debajo.
 */
export function groupNoticeThreads(
  notices: readonly UpcomingNotice[],
  spaceOrder: readonly string[],
): UpcomingNotice[][] {
  const threads = new Map<string, UpcomingNotice[]>();
  for (const notice of notices) {
    const thread = threads.get(notice.threadKey) ?? [];
    thread.push(notice);
    threads.set(notice.threadKey, thread);
  }

  const rank = (notice: UpcomingNotice) => {
    const index = spaceOrder.indexOf(notice.transaction.spaceId);
    return index === -1 ? spaceOrder.length : index;
  };
  return [...threads.values()].map((thread) =>
    thread.sort((left, right) => rank(left) - rank(right)),
  );
}
