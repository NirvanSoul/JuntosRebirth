import { CreateMoneyAccountModal } from '@/features/accounts/components/CreateMoneyAccountModal/CreateMoneyAccountModal';
import { MoneyAccountDetailModal } from '@/features/accounts/components/MoneyAccountDetailModal/MoneyAccountDetailModal';
import type { useMoneyAccounts } from '@/features/accounts/hooks/useMoneyAccounts';
import type { Category } from '@/features/categories/types';
import { useCurrencyCapabilities } from '@/features/profile/hooks/useCurrencyCapabilities';
import type { SessionTransaction } from '@/features/transactions/types';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';

type MoneyAccountModalsProps = {
  availableCurrencies: readonly CurrencyCode[];
  categories: readonly Category[];
  controller: ReturnType<typeof useMoneyAccounts>;
  onAddTransaction?: (moneyAccountId: string) => void;
  onOpenTransactionDetail: (transactionId: string) => void;
  spaceId: string;
  spaceCurrency: CurrencyCode;
  spaceName: string;
  transactions: readonly SessionTransaction[];
};

/** Los dos modales globales de cuentas, montados como hermanos del resto. */
export function MoneyAccountModals({
  availableCurrencies,
  categories,
  controller,
  onAddTransaction,
  onOpenTransactionDetail,
  spaceId,
  spaceCurrency,
  spaceName,
  transactions,
}: MoneyAccountModalsProps) {
  const { accountingCurrency, allowsMultipleAccountCurrencies } =
    useCurrencyCapabilities();

  return (
    <>
      <MoneyAccountDetailModal
        account={controller.detailAccount}
        categories={categories}
        onAddTransaction={(moneyAccountId) => {
          controller.openDetail(null);
          onAddTransaction?.(moneyAccountId);
        }}
        onClose={() => controller.openDetail(null)}
        onDelete={controller.archive}
        onEdit={controller.startEditing}
        onOpenTransactionDetail={(transactionId) => {
          controller.openDetail(null);
          onOpenTransactionDetail(transactionId);
        }}
        transactions={transactions}
        visible={controller.detailAccount !== null}
      />
      <CreateMoneyAccountModal
        account={controller.editingAccount}
        accounts={controller.moneyAccounts}
        availableCurrencies={availableCurrencies}
        fixedCurrency={
          allowsMultipleAccountCurrencies === false
            ? accountingCurrency
            : undefined
        }
        isCurrencyLocked={controller.isCurrencyLocked}
        onClose={controller.closeModal}
        onSubmit={controller.submit}
        spaceId={spaceId}
        spaceCurrency={spaceCurrency}
        spaceName={spaceName}
        visible={controller.isModalVisible}
      />
    </>
  );
}
