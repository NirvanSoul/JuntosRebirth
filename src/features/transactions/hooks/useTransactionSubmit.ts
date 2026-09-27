import { useCallback } from 'react';

import {
  moneyAccountSupportsCurrency,
  type MoneyAccount,
} from '@/features/accounts/types';
import {
  createDefaultCategoryInputForSpace,
  currencyExchangeCategoryDefinition,
} from '@/features/categories/constants/defaultCategories';
import { createLocalCategories } from '@/features/categories/repositories/localCategoryRepository';
import type { Category } from '@/features/categories/types';
import type {
  CurrencyExchangeLeg,
  CurrencyExchangeSubmission,
} from '@/features/exchangeRates/utils/currencyExchangeForm';
import {
  createLocalTransaction,
  createLocalTransactions,
  type CreateLocalTransactionInput,
} from '@/features/transactions/repositories/localTransactionRepository';
import { reconcileNotificationRules } from '@/features/transactions/services/notificationRuleService';
import type {
  CreateTransactionDraft,
  SessionTransaction,
  TransactionType,
} from '@/features/transactions/types';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { getLocalTodayKey } from '@/lib/date/localDate';

type UseTransactionSubmitInput = {
  activeSpaceId: string;
  applyTransactionUpdate: (
    transactionId: string,
    draft: CreateTransactionDraft,
  ) => Promise<SessionTransaction | null>;
  categories: readonly Category[];
  editingTransactionId: string | null;
  /** Añade a la cuenta la divisa del movimiento con saldo inicial cero. */
  ensureCurrency: (
    moneyAccountId: string,
    currency: CurrencyCode,
  ) => Promise<boolean>;
  moneyAccounts: readonly MoneyAccount[];
  onCategoriesCreated: (created: readonly Category[]) => void;
  /** Sube los cambios al espacio compartido tras cada mutación local. */
  onChangesPublished: () => void;
  onError: () => void;
  /** Cierra el formulario y limpia la selección tras guardar. */
  onTransactionSaved: (mode: 'created' | 'updated') => void;
  setTransactions: (
    update: (current: SessionTransaction[]) => SessionTransaction[],
  ) => void;
};

const currencyExchangeTitles = {
  BUY_USD: 'Compra de dólares',
  SELL_USD: 'Venta de dólares',
} as const;

/**
 * Guardado del formulario de movimiento y de la compra/venta de dólares.
 *
 * Ambos comparten la misma salida: asegurar la divisa en la cuenta elegida,
 * crear las filas, publicar el cambio y reconciliar recordatorios. La
 * compra/venta no es un tipo nuevo: son dos movimientos normales creados en
 * una sola transacción SQLite.
 */
export function useTransactionSubmit({
  activeSpaceId,
  applyTransactionUpdate,
  categories,
  editingTransactionId,
  ensureCurrency,
  moneyAccounts,
  onCategoriesCreated,
  onChangesPublished,
  onError,
  onTransactionSaved,
  setTransactions,
}: UseTransactionSubmitInput) {
  const ensureAccountCurrency = useCallback(
    async (
      moneyAccountId: string | undefined,
      currency: CurrencyCode,
    ): Promise<boolean> => {
      if (!moneyAccountId) return true;
      const account = moneyAccounts.find(
        (candidate) => candidate.id === moneyAccountId,
      );
      if (!account || moneyAccountSupportsCurrency(account, currency)) {
        return true;
      }
      if (await ensureCurrency(moneyAccountId, currency)) return true;

      console.error(
        '[useTransactionSubmit] No se pudo asegurar la moneda para la cuenta:',
        currency,
      );
      return false;
    },
    [ensureCurrency, moneyAccounts],
  );

  const commitCreated = useCallback(
    (created: readonly SessionTransaction[]) => {
      let nextTransactions: SessionTransaction[] = [];
      setTransactions((current) => {
        nextTransactions = [...created, ...current];
        return nextTransactions;
      });
      void reconcileNotificationRules({
        categories,
        transactions: nextTransactions,
      }).catch(() => undefined);
      onChangesPublished();
    },
    [categories, onChangesPublished, setTransactions],
  );

  const submitTransaction = useCallback(
    async (draft: CreateTransactionDraft) => {
      const targetCategory = categories.find(
        (category) => category.id === draft.categoryId,
      );
      if (!targetCategory) {
        console.error(
          '[useTransactionSubmit] La categoría seleccionada no existe:',
          draft.categoryId,
        );
        onError();
        return;
      }

      const safeDraft: CreateTransactionDraft = {
        ...draft,
        spaceId: activeSpaceId,
      };

      if (
        !(await ensureAccountCurrency(
          safeDraft.moneyAccountId,
          safeDraft.currency,
        ))
      ) {
        onError();
        return;
      }

      if (editingTransactionId) {
        const updated = await applyTransactionUpdate(
          editingTransactionId,
          safeDraft,
        );
        if (updated) onTransactionSaved('updated');
        return;
      }

      try {
        commitCreated(await createLocalTransaction(safeDraft));
        onTransactionSaved('created');
      } catch (error) {
        console.error(
          '[useTransactionSubmit] createLocalTransaction falló:',
          error,
        );
        onError();
      }
    },
    [
      activeSpaceId,
      applyTransactionUpdate,
      categories,
      commitCreated,
      editingTransactionId,
      ensureAccountCurrency,
      onError,
      onTransactionSaved,
    ],
  );

  /**
   * Categoría «Cambio de divisa» del espacio activo; se crea la primera vez
   * para que la persona no tenga que elegir una en cada operación.
   */
  const resolveCurrencyExchangeCategory =
    useCallback(async (): Promise<Category> => {
      const existing = categories.find(
        (category) =>
          category.spaceId === activeSpaceId &&
          category.templateKey === currencyExchangeCategoryDefinition.key &&
          !category.isArchived,
      );
      if (existing) return existing;

      const [created] = await createLocalCategories([
        createDefaultCategoryInputForSpace(
          activeSpaceId,
          currencyExchangeCategoryDefinition,
        ),
      ]);
      if (!created) {
        throw new Error('No se pudo crear la categoría de cambio de divisa');
      }
      onCategoriesCreated([created]);
      return created;
    }, [activeSpaceId, categories, onCategoriesCreated]);

  /** Devuelve `true` cuando los dos movimientos quedaron guardados. */
  const submitCurrencyExchange = useCallback(
    async (submission: CurrencyExchangeSubmission): Promise<boolean> => {
      try {
        if (
          !(await ensureAccountCurrency(
            submission.expense.moneyAccountId,
            submission.expense.currency,
          )) ||
          !(await ensureAccountCurrency(
            submission.income.moneyAccountId,
            submission.income.currency,
          ))
        ) {
          onError();
          return false;
        }

        const category = await resolveCurrencyExchangeCategory();
        const occurredOn = getLocalTodayKey();
        const toInput = (
          leg: CurrencyExchangeLeg,
          type: TransactionType,
        ): CreateLocalTransactionInput => ({
          spaceId: activeSpaceId,
          type,
          amountMinor: leg.amountMinor,
          currency: leg.currency,
          title: currencyExchangeTitles[submission.operation],
          categoryId: category.id,
          moneyAccountId: leg.moneyAccountId,
          occurredOn,
          recurrence: 'once',
        });

        commitCreated(
          await createLocalTransactions([
            toInput(submission.expense, 'expense'),
            toInput(submission.income, 'income'),
          ]),
        );
        return true;
      } catch (error) {
        console.error(
          '[useTransactionSubmit] createLocalTransactions falló:',
          error,
        );
        onError();
        return false;
      }
    },
    [
      activeSpaceId,
      commitCreated,
      ensureAccountCurrency,
      onError,
      resolveCurrencyExchangeCategory,
    ],
  );

  return { submitCurrencyExchange, submitTransaction };
}
