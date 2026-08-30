import {
  isCurrencyCode,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import { apiClient } from '@/services/api/juntossApiClient';

export type RemoteAccountSpace = {
  remoteId: string;
  name: string;
  type: 'personal' | 'couple' | 'other';
  currency: CurrencyCode;
};

export type RemoteAccountCategory = {
  remoteId: string;
  spaceRemoteId: string;
  name: string;
  icon: string;
  colorToken: string;
  isDefault: boolean;
  templateKey: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  /** Presupuesto por moneda; el modelo antiguo solo admitía uno. */
  budgets: readonly { currency: CurrencyCode; budgetMinor: number }[];
};

export type RemoteAccountMoneyAccount = {
  remoteId: string;
  spaceRemoteId: string;
  name: string;
  kind: string;
  icon: string;
  colorToken: string;
  currency: CurrencyCode;
  balances: readonly {
    currency: CurrencyCode;
    openingBalanceMinor: number;
  }[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RemoteAccountSeries = {
  remoteId: string;
  spaceRemoteId: string;
  categoryRemoteId: string;
  moneyAccountRemoteId: string | null;
  createdBy: string | null;
  type: string;
  amountMinor: number;
  currency: string;
  title: string;
  frequency: string;
  startsOn: string;
  generatedOccurrences: number;
  nextOccurrenceOn: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type RemoteAccountTransaction = {
  remoteId: string;
  spaceRemoteId: string;
  categoryRemoteId: string;
  moneyAccountRemoteId: string | null;
  createdBy: string | null;
  type: string;
  amountMinor: number;
  currency: string;
  title: string;
  occurredOn: string;
  note: string | null;
  recurrence: string;
  recurrenceGroupId: string | null;
  recurrenceSeriesRemoteId: string | null;
  sourceTransactionId: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type RemoteAccountSnapshot = {
  spaces: readonly RemoteAccountSpace[];
  categories: readonly RemoteAccountCategory[];
  moneyAccounts: readonly RemoteAccountMoneyAccount[];
  recurringSeries: readonly RemoteAccountSeries[];
  transactions: readonly RemoteAccountTransaction[];
};

/**
 * La API serializa los importes como cadena para no perder precisión de 64
 * bits; el SQLite local los guarda como entero.
 */
function minorAmount(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error('[sync] La API devolvió un importe que no es numérico');
  }
  return parsed;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function currency(value: unknown, context: string): CurrencyCode {
  // Una moneda corrupta es lo que da sentido a un saldo: se detiene aquí en
  // vez de propagarse hasta la interfaz ya tipada.
  if (typeof value !== 'string' || !isCurrencyCode(value)) {
    throw new Error(
      `[sync] Integridad comprometida en ${context}: currency=${String(value)}`,
    );
  }
  return value;
}

type RawSnapshot = {
  spaces: Record<string, unknown>[];
  categories: Record<string, unknown>[];
  moneyAccounts: Record<string, unknown>[];
  recurringSeries: Record<string, unknown>[];
  transactions: Record<string, unknown>[];
};

/** Estado remoto completo. Sustituye a las cinco lecturas PostgREST anteriores. */
export async function fetchRemoteAccountSnapshot(): Promise<RemoteAccountSnapshot> {
  const response = await apiClient.get<{ data: RawSnapshot }>(
    '/v1/sync/snapshot',
  );
  const snapshot = response.data;

  return {
    spaces: snapshot.spaces.map((space) => {
      const type = space.type;
      if (type !== 'personal' && type !== 'couple' && type !== 'other') {
        throw new Error(
          `[sync] Integridad comprometida en espacio remoto ${text(space.id)}: type=${String(type)}`,
        );
      }
      return {
        remoteId: text(space.id),
        name: text(space.name),
        type,
        currency: currency(space.currency, `espacio ${text(space.id)}`),
      };
    }),

    categories: snapshot.categories.map((category) => ({
      remoteId: text(category.id),
      spaceRemoteId: text(category.spaceId),
      name: text(category.name),
      icon: text(category.icon),
      colorToken: text(category.colorToken),
      isDefault: Boolean(category.isDefault),
      templateKey: optionalString(category.templateKey),
      isArchived: Boolean(category.isArchived),
      createdAt: text(category.createdAt),
      updatedAt: text(category.updatedAt),
      budgets: (Array.isArray(category.budgets) ? category.budgets : []).map(
        (budget: Record<string, unknown>) => ({
          currency: currency(
            budget.currency,
            `presupuesto ${text(category.id)}`,
          ),
          budgetMinor: minorAmount(budget.budgetAmountMinor),
        }),
      ),
    })),

    moneyAccounts: snapshot.moneyAccounts.map((account) => ({
      remoteId: text(account.id),
      spaceRemoteId: text(account.spaceId),
      name: text(account.name),
      kind: text(account.kind),
      icon: text(account.icon),
      colorToken: text(account.colorToken),
      currency: currency(account.primaryCurrency, `cuenta ${text(account.id)}`),
      // Ya llegan ordenados por posición desde la API.
      balances: (Array.isArray(account.balances) ? account.balances : []).map(
        (balance: Record<string, unknown>) => ({
          currency: currency(balance.currency, `cuenta ${text(account.id)}`),
          openingBalanceMinor: minorAmount(balance.openingBalanceMinor),
        }),
      ),
      isArchived: Boolean(account.isArchived),
      createdAt: text(account.createdAt),
      updatedAt: text(account.updatedAt),
    })),

    recurringSeries: snapshot.recurringSeries.map((series) => ({
      remoteId: text(series.id),
      spaceRemoteId: text(series.spaceId),
      categoryRemoteId: text(series.categoryId),
      moneyAccountRemoteId: optionalString(series.moneyAccountId),
      createdBy: optionalString(series.createdBy),
      type: text(series.type),
      amountMinor: minorAmount(series.amountMinor),
      currency: text(series.currency),
      title: text(series.title),
      frequency: text(series.frequency),
      startsOn: text(series.startsOn),
      generatedOccurrences: Number(series.generatedOccurrences ?? 0),
      nextOccurrenceOn: optionalString(series.nextOccurrenceOn),
      isArchived: Boolean(series.isArchived),
      createdAt: text(series.createdAt),
      updatedAt: text(series.updatedAt),
      archivedAt: optionalString(series.archivedAt),
    })),

    transactions: snapshot.transactions.map((transaction) => ({
      remoteId: text(transaction.id),
      spaceRemoteId: text(transaction.spaceId),
      categoryRemoteId: text(transaction.categoryId),
      moneyAccountRemoteId: optionalString(transaction.moneyAccountId),
      createdBy: optionalString(transaction.createdBy),
      type: text(transaction.type),
      amountMinor: minorAmount(transaction.amountMinor),
      currency: text(transaction.currency),
      title: text(transaction.title),
      occurredOn: text(transaction.occurredOn),
      note: optionalString(transaction.note),
      recurrence: text(transaction.recurrence) || 'once',
      recurrenceGroupId: optionalString(transaction.recurrenceGroupId),
      recurrenceSeriesRemoteId: optionalString(transaction.recurrenceSeriesId),
      sourceTransactionId: optionalString(transaction.sourceLocalTransactionId),
      isArchived: Boolean(transaction.isArchived),
      createdAt: text(transaction.createdAt),
      updatedAt: text(transaction.updatedAt),
      archivedAt: optionalString(transaction.archivedAt),
    })),
  };
}
