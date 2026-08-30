import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  archiveLocalMoneyAccount,
  countLocalMoneyAccountUsages,
  createLocalMoneyAccount,
  updateLocalMoneyAccount,
} from '@/features/accounts/repositories/localMoneyAccountRepository';
import type {
  CreateMoneyAccountInput,
  MoneyAccount,
} from '@/features/accounts/types';
import type { Category } from '@/features/categories/types';
import { createOpeningBalanceTransactions } from '@/features/accounts/utils/openingBalanceTransactions';
import { createLocalTransactions } from '@/features/transactions/repositories/localTransactionRepository';
import type { SessionTransaction } from '@/features/transactions/types';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { getLocalTodayKey } from '@/lib/date/localDate';
import {
  listMoneyAccountsBySpace,
  validateMoneyAccountName,
} from '@/features/accounts/utils/moneyAccountCatalog';

type UseMoneyAccountsInput = {
  activeSpaceId: string;
  categories: readonly Category[];
  /** Sube los cambios al espacio compartido tras cada mutación local. */
  onChangesPublished: () => void;
  onError: () => void;
  onTransactionsCreated: (transactions: readonly SessionTransaction[]) => void;
  transactions: readonly SessionTransaction[];
};

/**
 * Estado y mutaciones de las cuentas del espacio activo.
 *
 * Sigue el patrón de controlador de `useSpaces`: repositorio local más
 * `useState`, sin store global. El catálogo completo se carga una vez desde
 * `MainTabsNavigator` (`setMoneyAccounts`) junto al resto de datos locales.
 */
export function useMoneyAccounts({
  activeSpaceId,
  categories,
  onChangesPublished,
  onError,
  onTransactionsCreated,
  transactions,
}: UseMoneyAccountsInput) {
  const [moneyAccounts, setMoneyAccounts] = useState<MoneyAccount[]>([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [isCurrencyLocked, setCurrencyLocked] = useState(false);
  /**
   * Las notificaciones al navegador viven en una ref porque el hook se llama
   * antes de que sus funciones estén declaradas: leerlas en el momento de la
   * mutación evita la zona muerta temporal y mantiene estables las
   * dependencias de los `useCallback`.
   */
  const notifyRef = useRef({ onChangesPublished, onError });
  notifyRef.current = { onChangesPublished, onError };
  const materializingOpeningBalances = useRef(new Set<string>());

  const spaceMoneyAccounts = useMemo(
    () => moneyAccounts.filter((account) => account.spaceId === activeSpaceId),
    [activeSpaceId, moneyAccounts],
  );
  const activeSpaceMoneyAccounts = useMemo(
    () => listMoneyAccountsBySpace(moneyAccounts, activeSpaceId),
    [activeSpaceId, moneyAccounts],
  );
  const editingAccount =
    activeSpaceMoneyAccounts.find((account) => account.id === editingId) ??
    null;
  const detailAccount =
    spaceMoneyAccounts.find((account) => account.id === detailId) ?? null;

  /**
   * Convierte los saldos iniciales creados antes de esta regla en movimientos.
   * La cuenta se pone a cero después de guardar las filas, de modo que una
   * carga posterior no puede volver a materializarlas. Si la app se cerrase
   * entre ambas operaciones, el título estable permite terminar la conversión
   * sin crear un duplicado.
   */
  useEffect(() => {
    const pendingAccounts = activeSpaceMoneyAccounts.filter(
      (account) =>
        account.balances.some((balance) => balance.openingBalanceMinor !== 0) &&
        !materializingOpeningBalances.current.has(account.id),
    );
    if (pendingAccounts.length === 0) return;

    void Promise.all(
      pendingAccounts.map(async (account) => {
        materializingOpeningBalances.current.add(account.id);
        try {
          const drafts = createOpeningBalanceTransactions({
            accountId: account.id,
            accountName: account.name,
            balances: account.balances,
            categories,
            occurredOn: getLocalTodayKey(),
            spaceId: account.spaceId,
          });
          const missingDrafts = drafts.filter(
            (draft) =>
              !transactions.some(
                (transaction) =>
                  transaction.moneyAccountId === draft.moneyAccountId &&
                  transaction.currency === draft.currency &&
                  transaction.type === draft.type &&
                  transaction.amountMinor === draft.amountMinor &&
                  transaction.title === draft.title,
              ),
          );
          const createdTransactions =
            await createLocalTransactions(missingDrafts);
          const updated = await updateLocalMoneyAccount({
            ...account,
            balances: account.balances.map((balance) => ({
              ...balance,
              openingBalanceMinor: 0,
            })),
          });
          setMoneyAccounts((current) =>
            current.map((candidate) =>
              candidate.id === updated.id ? updated : candidate,
            ),
          );
          if (createdTransactions.length > 0) {
            onTransactionsCreated(createdTransactions);
          }
          notifyRef.current.onChangesPublished();
        } catch (error) {
          console.error(
            '[accounts] No se pudo materializar el saldo inicial',
            error,
          );
          notifyRef.current.onError();
          materializingOpeningBalances.current.delete(account.id);
        }
      }),
    );
  }, [
    activeSpaceMoneyAccounts,
    categories,
    onTransactionsCreated,
    transactions,
  ]);

  const openCreation = useCallback(() => {
    setEditingId(null);
    setCurrencyLocked(false);
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setEditingId(null);
  }, []);

  const startEditing = useCallback(async (moneyAccountId: string) => {
    setDetailId(null);
    setEditingId(moneyAccountId);
    // La moneda solo puede cambiarse mientras la cuenta no tenga importes
    // asignados: cambiarla después reinterpretaría dinero ya registrado. Si
    // la consulta falla, se bloquea, que es el lado seguro.
    try {
      const usages = await countLocalMoneyAccountUsages(moneyAccountId);
      setCurrencyLocked(usages > 0);
    } catch {
      setCurrencyLocked(true);
    }
    setModalVisible(true);
  }, []);

  const submit = useCallback(
    async (input: CreateMoneyAccountInput) => {
      const validation = validateMoneyAccountName(
        input.name,
        moneyAccounts,
        input.spaceId,
        editingId ?? undefined,
      );
      if (!validation.valid || input.spaceId !== activeSpaceId) {
        return;
      }

      if (editingId) {
        const currentAccount = moneyAccounts.find(
          (account) => account.id === editingId,
        );
        if (!currentAccount) return;

        try {
          const updated = await updateLocalMoneyAccount({
            ...currentAccount,
            name: validation.name,
            kind: input.kind,
            icon: input.icon,
            colorToken: input.colorToken,
            // Los saldos existentes no se reescriben al tener movimientos.
            // Si la cuenta solo guardaba una divisa, se permite añadir una
            // segunda con su saldo inicial, sin alterar la original.
            balances: isCurrencyLocked
              ? [
                  ...currentAccount.balances,
                  ...input.balances
                    .filter(
                      (balance) =>
                        !currentAccount.balances.some(
                          (existing) => existing.currency === balance.currency,
                        ),
                    )
                    .slice(0, currentAccount.balances.length === 1 ? 1 : 0),
                ]
              : input.balances,
          });
          setMoneyAccounts((current) =>
            current.map((account) =>
              account.id === updated.id ? updated : account,
            ),
          );
          notifyRef.current.onChangesPublished();
          closeModal();
        } catch (error) {
          // El aviso al usuario es deliberadamente genérico, pero la causa
          // real tiene que quedar en el log: sin ella, un fallo de esquema es
          // indistinguible de uno de validación.
          console.error('[accounts] No se pudo actualizar la cuenta', error);
          notifyRef.current.onError();
        }
        return;
      }

      try {
        // El saldo inicial no se persiste en la cuenta para no contar dos
        // veces. Se materializa como ingreso o gasto y así también entra en
        // el balance global, Actividad y sincronización.
        const openingBalanceTransactions = createOpeningBalanceTransactions({
          accountId: '',
          accountName: validation.name,
          balances: input.balances,
          categories,
          occurredOn: getLocalTodayKey(),
          spaceId: input.spaceId,
        });
        const created = await createLocalMoneyAccount({
          ...input,
          name: validation.name,
          balances: input.balances.map((balance) => ({
            ...balance,
            openingBalanceMinor: 0,
          })),
        });
        const createdTransactions = await createLocalTransactions(
          openingBalanceTransactions.map((transaction) => ({
            ...transaction,
            moneyAccountId: created.id,
          })),
        );
        setMoneyAccounts((current) => [...current, created]);
        onTransactionsCreated(createdTransactions);
        notifyRef.current.onChangesPublished();
        setModalVisible(false);
      } catch (error) {
        console.error('[accounts] No se pudo crear la cuenta', error);
        notifyRef.current.onError();
      }
    },
    [
      activeSpaceId,
      categories,
      closeModal,
      editingId,
      isCurrencyLocked,
      moneyAccounts,
      onTransactionsCreated,
    ],
  );

  const archive = useCallback(
    async (moneyAccountId: string) => {
      try {
        await archiveLocalMoneyAccount(moneyAccountId, activeSpaceId);
        setMoneyAccounts((current) =>
          current.map((account) =>
            account.id === moneyAccountId
              ? { ...account, isArchived: true }
              : account,
          ),
        );
        notifyRef.current.onChangesPublished();
        setDetailId(null);
      } catch (error) {
        console.error('[accounts] No se pudo archivar la cuenta', error);
        notifyRef.current.onError();
      }
    },
    [activeSpaceId],
  );

  /** Añade una divisa con saldo inicial cero al asignar el primer movimiento. */
  const ensureCurrency = useCallback(
    async (
      moneyAccountId: string,
      currency: CurrencyCode,
    ): Promise<boolean> => {
      const account = moneyAccounts.find(
        (candidate) => candidate.id === moneyAccountId,
      );
      if (!account || account.spaceId !== activeSpaceId) return false;
      if (account.balances.some((balance) => balance.currency === currency)) {
        return true;
      }

      try {
        const updated = await updateLocalMoneyAccount({
          ...account,
          balances: [...account.balances, { currency, openingBalanceMinor: 0 }],
        });
        setMoneyAccounts((current) =>
          current.map((candidate) =>
            candidate.id === updated.id ? updated : candidate,
          ),
        );
        notifyRef.current.onChangesPublished();
        return true;
      } catch (error) {
        console.error('[accounts] No se pudo añadir la moneda', error);
        notifyRef.current.onError();
        return false;
      }
    },
    [activeSpaceId, moneyAccounts],
  );

  return {
    activeSpaceMoneyAccounts,
    archive,
    closeModal,
    detailAccount,
    ensureCurrency,
    editingAccount,
    isCurrencyLocked,
    isModalVisible,
    moneyAccounts,
    openCreation,
    openDetail: setDetailId,
    setMoneyAccounts,
    spaceMoneyAccounts,
    startEditing,
    submit,
  };
}
