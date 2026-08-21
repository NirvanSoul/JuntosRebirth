import { useEffect, useState } from 'react';

import type { MoneyAccount } from '@/features/accounts/types';
import { TransactionDatePickerModal } from '@/features/transactions/components/CreateTransactionModal/TransactionDatePickerModal';
import {
  recurrenceOptions,
  TransactionMoneyAccountPickerModal,
  TransactionRecurrencePickerModal,
} from '@/features/transactions/components/CreateTransactionModal/TransactionOptionPickers';
import type {
  SessionTransaction,
  TransactionQuickEdit,
} from '@/features/transactions/types';

/**
 * Campos cuyo selector abre el propio detalle. La categoría también se edita
 * sin pasar por el formulario, pero su selector lo posee la navegación —lleva
 * consigo la creación de categorías y sus plantillas—, así que no se apila
 * desde aquí.
 */
export type TransactionQuickEditField = 'date' | 'money-account' | 'recurrence';

type TransactionDetailQuickEditorsProps = {
  /** Solo las cuentas activas del espacio en la moneda del movimiento. */
  assignableMoneyAccounts: readonly MoneyAccount[];
  field: TransactionQuickEditField | null;
  onClose: () => void;
  onCreateMoneyAccount?: () => void;
  onSubmit: (change: TransactionQuickEdit) => void;
  transaction: SessionTransaction;
};

/**
 * Los selectores que el detalle abre encima de sí mismo. Se apilan sobre el
 * detalle (`stackBehavior="push"`), así que al guardar o cerrar el usuario
 * vuelve al movimiento que estaba mirando y nunca al formulario completo.
 *
 * Son los mismos componentes que usa el formulario: aquí solo cambia quién
 * recibe la selección.
 */
export function TransactionDetailQuickEditors({
  assignableMoneyAccounts,
  field,
  onClose,
  onCreateMoneyAccount,
  onSubmit,
  transaction,
}: TransactionDetailQuickEditorsProps) {
  // Las fechas personalizadas se eligen en un modal encima del de recurrencia,
  // pero no se guardan hasta que se confirma la recurrencia: hasta entonces
  // viven aquí y no en el movimiento.
  const [draftCustomDates, setDraftCustomDates] = useState<
    readonly string[] | null
  >(null);

  useEffect(() => {
    if (field === null) setDraftCustomDates(null);
  }, [field]);

  const customOccurrenceDates =
    draftCustomDates ?? transaction.customOccurrenceDates ?? [];

  return (
    <>
      <TransactionDatePickerModal
        onClose={onClose}
        onSelect={(occurredOn) => onSubmit({ field: 'date', occurredOn })}
        selectedDate={transaction.occurredOn}
        visible={field === 'date'}
      />
      <TransactionMoneyAccountPickerModal
        accounts={assignableMoneyAccounts}
        moneyAccountId={transaction.moneyAccountId}
        onClose={onClose}
        onCreateMoneyAccount={onCreateMoneyAccount}
        onSelectMoneyAccount={(moneyAccountId) =>
          onSubmit({ field: 'money-account', moneyAccountId })
        }
        visible={field === 'money-account'}
      />
      <TransactionRecurrencePickerModal
        customOccurrenceDates={customOccurrenceDates}
        initialDate={transaction.occurredOn}
        onClose={onClose}
        onSelectCustomDates={setDraftCustomDates}
        onSelectRecurrence={(index) => {
          const recurrence = recurrenceOptions[index]!.value;

          onSubmit({
            customOccurrenceDates:
              recurrence === 'custom' ? customOccurrenceDates : undefined,
            field: 'recurrence',
            recurrence,
          });
        }}
        recurrenceIndex={Math.max(
          recurrenceOptions.findIndex(
            (option) => option.value === transaction.recurrence,
          ),
          0,
        )}
        visible={field === 'recurrence'}
      />
    </>
  );
}
