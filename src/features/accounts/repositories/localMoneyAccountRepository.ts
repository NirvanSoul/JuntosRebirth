import { randomUUID } from 'expo-crypto';

import {
  moneyAccountIconNames,
  moneyAccountKinds,
  type CreateMoneyAccountInput,
  type MoneyAccount,
  type MoneyAccountIconName,
  type MoneyAccountKind,
} from '@/features/accounts/types';
import {
  isCurrencyCode,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import { getLocalDatabase } from '@/lib/storage/localDatabase';
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
  currency: string;
  opening_balance_minor: number;
  is_archived: number;
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
function mapMoneyAccount(row: MoneyAccountRow): MoneyAccount {
  if (
    !kinds.has(row.kind) ||
    !iconNames.has(row.icon) ||
    !colorTokens.has(row.color_token) ||
    !isCurrencyCode(row.currency)
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
    currency: row.currency as CurrencyCode,
    openingBalanceMinor: row.opening_balance_minor,
    isArchived: row.is_archived === 1,
  };
}

function assertMoneyAccount(input: CreateLocalMoneyAccountInput): void {
  if (!input.spaceId || !input.name.trim()) {
    throw new Error('La cuenta local no es válida');
  }
  if (!isCurrencyCode(input.currency)) {
    throw new Error('La moneda de la cuenta no está reconocida');
  }
  if (!Number.isSafeInteger(input.openingBalanceMinor)) {
    throw new Error('El saldo inicial debe expresarse en unidades menores');
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
  const rows = await database.getAllAsync<MoneyAccountRow>(
    `SELECT id, space_id, name, kind, icon, color_token, currency,
            opening_balance_minor, is_archived
       FROM money_accounts
      ORDER BY created_at ASC`,
  );

  return rows.map(mapMoneyAccount);
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

  await database.runAsync(
    `INSERT INTO money_accounts (
       id, space_id, name, kind, icon, color_token, currency,
       opening_balance_minor, created_by, sync_status, is_archived,
       created_at, updated_at, archived_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'local_only', 0, ?, ?, NULL)`,
    id,
    input.spaceId,
    name,
    input.kind,
    input.icon,
    input.colorToken,
    input.currency,
    input.openingBalanceMinor,
    createdBy,
    now,
    now,
  );

  return {
    id,
    spaceId: input.spaceId,
    name,
    kind: input.kind,
    icon: input.icon,
    colorToken: input.colorToken,
    currency: input.currency,
    openingBalanceMinor: input.openingBalanceMinor,
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
  const result = await database.runAsync(
    `UPDATE money_accounts
        SET name = ?, kind = ?, icon = ?, color_token = ?, currency = ?,
            opening_balance_minor = ?, updated_at = ?,
            sync_status = CASE
              WHEN sync_status = 'local_only' THEN 'local_only'
              ELSE 'pending'
            END
      WHERE id = ? AND space_id = ? AND is_archived = 0`,
    name,
    account.kind,
    account.icon,
    account.colorToken,
    account.currency,
    account.openingBalanceMinor,
    now,
    account.id,
    account.spaceId,
  );
  if (result.changes !== 1) {
    throw new Error('La cuenta local ya no está disponible');
  }

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
