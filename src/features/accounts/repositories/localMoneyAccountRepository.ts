import { randomUUID } from 'expo-crypto';

import {
  getPrimaryMoneyAccountCurrency,
  moneyAccountIconNames,
  moneyAccountKinds,
  type CreateMoneyAccountInput,
  type MoneyAccount,
  type MoneyAccountBalance,
  type MoneyAccountIconName,
  type MoneyAccountKind,
} from '@/features/accounts/types';
import {
  isCurrencyCode,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import { getLocalDatabase } from '@/lib/storage/localDatabase';
import type { LocalSqlExecutor } from '@/lib/storage/localSqlExecutor';
import { getOrCreateInstallationId } from '@/lib/storage/localIdentity';
import {
  categoryColors,
  type CategoryColorToken,
} from '@/theme/categoryColors';

type MoneyAccountRow = {
  id: string;
  space_id: string;
  name: string;
  kind: string;
  icon: string;
  color_token: string;
  is_archived: number;
};

type MoneyAccountBalanceRow = {
  money_account_id: string;
  currency: string;
  opening_balance_minor: number;
};

export type CreateLocalMoneyAccountInput = CreateMoneyAccountInput & {
  id?: string;
};

const iconNames = new Set<string>(moneyAccountIconNames);
const kinds = new Set<string>(moneyAccountKinds);
const colorTokens = new Set<string>(Object.keys(categoryColors));

/**
 * `getAllAsync<MoneyAccountRow>` es un cast, no una comprobación: la fila
 * puede venir de una versión anterior o de una sincronización con datos
 * inesperados, así que se validan los valores cerrados antes de exponerlos.
 */
function mapMoneyAccount(
  row: MoneyAccountRow,
  balances: readonly MoneyAccountBalanceRow[],
): MoneyAccount {
  const accountBalances = balances
    .filter((balance) => balance.money_account_id === row.id)
    .map((balance) => {
      if (!isCurrencyCode(balance.currency)) {
        throw new Error('La cuenta local contiene valores no reconocidos');
      }

      return {
        currency: balance.currency as CurrencyCode,
        openingBalanceMinor: balance.opening_balance_minor,
      };
    });

  if (
    !kinds.has(row.kind) ||
    !iconNames.has(row.icon) ||
    !colorTokens.has(row.color_token) ||
    accountBalances.length === 0
  ) {
    throw new Error('La cuenta local contiene valores no reconocidos');
  }

  return {
    id: row.id,
    spaceId: row.space_id,
    name: row.name,
    kind: row.kind as MoneyAccountKind,
    icon: row.icon as MoneyAccountIconName,
    colorToken: row.color_token as CategoryColorToken,
    balances: accountBalances,
    isArchived: row.is_archived === 1,
  };
}

function assertMoneyAccount(input: CreateLocalMoneyAccountInput): void {
  if (!input.spaceId || !input.name.trim()) {
    throw new Error('La cuenta local no es válida');
  }
  if (input.balances.length === 0) {
    throw new Error('La cuenta necesita al menos una moneda');
  }

  const seen = new Set<string>();
  for (const balance of input.balances) {
    if (!isCurrencyCode(balance.currency)) {
      throw new Error('La moneda de la cuenta no está reconocida');
    }
    if (seen.has(balance.currency)) {
      throw new Error('La cuenta no puede repetir una moneda');
    }
    seen.add(balance.currency);

    if (!Number.isSafeInteger(balance.openingBalanceMinor)) {
      throw new Error('El saldo inicial debe expresarse en unidades menores');
    }
  }
}

/**
 * Incluye cuentas archivadas: un movimiento ya creado con una cuenta
 * archivada sigue necesitando resolverla para mostrarse y editarse.
 * `listMoneyAccountsBySpace` filtra `isArchived` para cualquier catálogo
 * seleccionable.
 */
export async function listLocalMoneyAccounts(): Promise<MoneyAccount[]> {
  const database = await getLocalDatabase();
  const [rows, balances] = await Promise.all([
    database.getAllAsync<MoneyAccountRow>(
      `SELECT id, space_id, name, kind, icon, color_token, is_archived
         FROM money_accounts
        ORDER BY created_at ASC`,
    ),
    database.getAllAsync<MoneyAccountBalanceRow>(
      `SELECT money_account_id, currency, opening_balance_minor
         FROM money_account_balances
        ORDER BY position ASC, currency ASC`,
    ),
  ]);

  return rows.map((row) => mapMoneyAccount(row, balances));
}

/**
 * Reescribe por completo las monedas de una cuenta. Sustituir el conjunto
 * entero, en vez de calcular altas y bajas, evita quedarse con una moneda
 * huérfana cuando el usuario la retira mientras edita.
 */
async function replaceMoneyAccountBalances(
  executor: LocalSqlExecutor,
  accountId: string,
  balances: readonly MoneyAccountBalance[],
  now: string,
): Promise<void> {
  await executor.runAsync(
    `DELETE FROM money_account_balances WHERE money_account_id = ?`,
    accountId,
  );

  for (const [position, balance] of balances.entries()) {
    await executor.runAsync(
      `INSERT INTO money_account_balances (
         id, money_account_id, currency, opening_balance_minor, position,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      `${accountId}--${balance.currency}`,
      accountId,
      balance.currency,
      balance.openingBalanceMinor,
      position,
      now,
      now,
    );
  }
}

export async function createLocalMoneyAccount(
  input: CreateLocalMoneyAccountInput,
): Promise<MoneyAccount> {
  assertMoneyAccount(input);

  const database = await getLocalDatabase();
  const createdBy = await getOrCreateInstallationId(database);
  const id = input.id ?? randomUUID();
  const name = input.name.trim();
  const now = new Date().toISOString();

  await database.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync(
      `INSERT INTO money_accounts (
         id, space_id, name, kind, icon, color_token, currency,
         opening_balance_minor, created_by, sync_status, is_archived,
         created_at, updated_at, archived_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'local_only', 0, ?, ?, NULL)`,
      id,
      input.spaceId,
      name,
      input.kind,
      input.icon,
      input.colorToken,
      getPrimaryMoneyAccountCurrency(input),
      createdBy,
      now,
      now,
    );
    await replaceMoneyAccountBalances(transaction, id, input.balances, now);
  });

  return {
    id,
    spaceId: input.spaceId,
    name,
    kind: input.kind,
    icon: input.icon,
    colorToken: input.colorToken,
    balances: input.balances,
    isArchived: false,
  };
}

export async function updateLocalMoneyAccount(
  account: MoneyAccount,
): Promise<MoneyAccount> {
  assertMoneyAccount(account);

  const database = await getLocalDatabase();
  const name = account.name.trim();
  const now = new Date().toISOString();

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const result = await transaction.runAsync(
      `UPDATE money_accounts
          SET name = ?, kind = ?, icon = ?, color_token = ?, currency = ?,
              updated_at = ?,
              sync_status = CASE
                WHEN sync_status = 'local_only' THEN 'local_only'
                ELSE 'pending'
              END
        WHERE id = ? AND space_id = ? AND is_archived = 0`,
      name,
      account.kind,
      account.icon,
      account.colorToken,
      getPrimaryMoneyAccountCurrency(account),
      now,
      account.id,
      account.spaceId,
    );
    if (result.changes !== 1) {
      throw new Error('La cuenta local ya no está disponible');
    }
    await replaceMoneyAccountBalances(
      transaction,
      account.id,
      account.balances,
      now,
    );
  });

  return { ...account, name };
}

/**
 * Archiva la cuenta y conserva sus movimientos, igual que hace una categoría.
 * Los movimientos siguen contando en balances y totales; solo dejan de
 * mostrar la cuenta como destino seleccionable.
 */
export async function archiveLocalMoneyAccount(
  accountId: string,
  spaceId: string,
): Promise<void> {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  const result = await database.runAsync(
    `UPDATE money_accounts
        SET is_archived = 1, archived_at = ?, updated_at = ?,
            sync_status = CASE
              WHEN sync_status = 'local_only' THEN 'local_only'
              ELSE 'pending'
            END
      WHERE id = ? AND space_id = ? AND is_archived = 0`,
    now,
    now,
    accountId,
    spaceId,
  );
  if (result.changes !== 1) {
    throw new Error('La cuenta local ya no está disponible');
  }
}

/**
 * Cuenta los movimientos y las series recurrentes que apuntan a la cuenta.
 * La moneda solo puede cambiarse mientras el resultado sea cero: si ya hay
 * importes asignados, cambiarla reinterpretaría dinero ya registrado.
 */
export async function countLocalMoneyAccountUsages(
  accountId: string,
): Promise<number> {
  const database = await getLocalDatabase();
  const row = await database.getFirstAsync<{ total: number }>(
    `SELECT (
       (SELECT COUNT(*) FROM transactions WHERE money_account_id = ?) +
       (SELECT COUNT(*) FROM recurring_transaction_series
         WHERE money_account_id = ?)
     ) AS total`,
    accountId,
    accountId,
  );

  return row?.total ?? 0;
}
