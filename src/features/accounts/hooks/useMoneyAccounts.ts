import { useCallback, useMemo, useRef, useState } from 'react';

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
import {
  listMoneyAccountsBySpace,
  validateMoneyAccountName,
} from '@/features/accounts/utils/moneyAccountCatalog';

type UseMoneyAccountsInput = {
  activeSpaceId: string;
  /** Sube los cambios al espacio compartido tras cada mutación local. */
  onChangesPublished: () => void;
  onError: () => void;
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
  onChangesPublished,
  onError,
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
            currency: isCurrencyLocked
              ? currentAccount.currency
              : input.currency,
            openingBalanceMinor: input.openingBalanceMinor,
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
        const created = await createLocalMoneyAccount({
          ...input,
          name: validation.name,
        });
        setMoneyAccounts((current) => [...current, created]);
        notifyRef.current.onChangesPublished();
        setModalVisible(false);
      } catch (error) {
        console.error('[accounts] No se pudo crear la cuenta', error);
        notifyRef.current.onError();
      }
    },
    [activeSpaceId, closeModal, editingId, isCurrencyLocked, moneyAccounts],
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

  return {
    activeSpaceMoneyAccounts,
    archive,
    closeModal,
    detailAccount,
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
