import type { SQLiteDatabase } from 'expo-sqlite';

import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import { recurrences } from '@/features/transactions/repositories/transactionRowMapper';
import type { CreateTransactionDraft } from '@/features/transactions/types';
import { isValidLocalDate } from '@/features/transactions/utils/transactionRecurrence';
import { isCurrencyCode } from '@/lib/currency/currencyCatalog';
import { getOrCreateInstallationId } from '@/lib/storage/localIdentity';

/**
 * Identidad que se graba en `created_by` al crear una fila en este dispositivo.
 *
 * Prefiere el uuid de usuario porque es lo que guarda el servidor y lo que baja
 * en cada restauración: usar el id de instalación dejaba la columna con dos
 * tipos de identificador según el origen de la fila, y la interfaz no podía
 * distinguirlos. En modo invitado no hay uuid todavía, y ahí el id de
 * instalación sigue siendo el único ancla disponible.
 */
export async function resolveLocalAuthorId(
  database: SQLiteDatabase,
): Promise<string> {
  return (
    (await getAuthenticatedUserId()) ??
    (await getOrCreateInstallationId(database))
  );
}

export function assertTransaction(input: CreateTransactionDraft): void {
  if (
    !input.spaceId ||
    !input.categoryId ||
    !Number.isSafeInteger(input.amountMinor) ||
    input.amountMinor <= 0 ||
    !isValidLocalDate(input.occurredOn) ||
    !recurrences.has(input.recurrence) ||
    !isCurrencyCode(input.currency)
  ) {
    throw new Error('El movimiento local no es válido');
  }
}

/**
 * Comprueba la cuenta asignada antes de escribir.
 *
 * En SQLite la columna solo tiene una foránea de una columna, así que nada
 * impide a nivel de esquema asignar la cuenta de otro espacio; esta guarda
 * ocupa el lugar de la clave compuesta que sí protege a `category_id`. La
 * moneda se comprueba aquí por la misma razón: cada saldo de la cuenta es de
 * una divisa concreta, y un importe en otra no entraría en ninguno.
 */
export async function assertMoneyAccountAssignment(
  database: SQLiteDatabase,
  input: CreateTransactionDraft,
): Promise<void> {
  if (!input.moneyAccountId) {
    return;
  }

  const account = await database.getFirstAsync<{ id: string }>(
    `SELECT id FROM money_accounts WHERE id = ? AND space_id = ?`,
    input.moneyAccountId,
    input.spaceId,
  );
  if (!account) {
    throw new Error('La cuenta no pertenece a este espacio');
  }

  // Una cuenta puede guardar varias monedas, como hace un banco: basta con
  // que la del movimiento sea una de ellas.
  const balance = await database.getFirstAsync<{ currency: string }>(
    `SELECT currency FROM money_account_balances
      WHERE money_account_id = ? AND currency = ?`,
    input.moneyAccountId,
    input.currency,
  );
  if (!balance) {
    throw new Error('El movimiento debe usar una moneda de su cuenta');
  }
}
