import { ActivityScreen } from '@/features/activity/screens/ActivityScreen';
import type { MoneyAccount } from '@/features/accounts/types';
import type { Category } from '@/features/categories/types';
import type { ActivitySectionsPreference } from '@/state/appPreferences/activitySectionsPreference';
import type { CreateActionType } from '@/navigation/createActions';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import type { SessionTransaction } from '@/features/transactions/types';

type ActivityTabContentProps = {
  categories: readonly Category[];
  currency: CurrencyCode;
  focusResetKey: number;
  moneyAccounts: readonly MoneyAccount[];
  onCreateAction: (type: CreateActionType) => void;
  onCreateMoneyAccount: () => void;
  onImport: () => void;
  onOpenCategoryDetail: (categoryId: string, currency?: CurrencyCode) => void;
  onOpenMoneyAccountDetail: (moneyAccountId: string) => void;
  onOpenTransactionDetail: (transactionId: string) => void;
  onScrollDirectionChange: (direction: 'down' | 'up') => void;
  onSummaryPinnedChange: (pinned: boolean) => void;
  preference: ActivitySectionsPreference;
  savePreference: (preference: ActivitySectionsPreference) => void;
  spaceCurrency: CurrencyCode;
  summaryPinned: boolean;
  targetRequestId?: number;
  targetSection?: 'accounts' | 'categories' | 'movements';
  transactions: readonly SessionTransaction[];
};

export function ActivityTabContent({
  categories,
  currency,
  focusResetKey,
  moneyAccounts,
  onCreateAction,
  onCreateMoneyAccount,
  onImport,
  onOpenCategoryDetail,
  onOpenMoneyAccountDetail,
  onOpenTransactionDetail,
  onScrollDirectionChange,
  onSummaryPinnedChange,
  preference,
  savePreference,
  spaceCurrency,
  summaryPinned,
  targetRequestId,
  targetSection,
  transactions,
}: ActivityTabContentProps) {
  return (
    <ActivityScreen
      accountsExpanded={preference.accountsExpanded}
      categories={categories}
      categoriesExpanded={preference.categoriesExpanded}
      categoryView={preference.categoryView}
      currency={currency}
      focusResetKey={focusResetKey}
      moneyAccounts={moneyAccounts}
      onAccountsExpandedChange={(accountsExpanded) =>
        savePreference({ ...preference, accountsExpanded })
      }
      onCategoriesExpandedChange={(categoriesExpanded) =>
        savePreference({ ...preference, categoriesExpanded })
      }
      onCategoryViewChange={(categoryView) =>
        savePreference({ ...preference, categoryView })
      }
      onCreateCategory={() => onCreateAction('category')}
      onCreateExpense={() => onCreateAction('expense')}
      onCreateIncome={() => onCreateAction('income')}
      onCreateMoneyAccount={onCreateMoneyAccount}
      onCreateMovement={() => onCreateAction('expense')}
      onImport={onImport}
      onOpenCategoryDetail={onOpenCategoryDetail}
      onOpenMoneyAccountDetail={onOpenMoneyAccountDetail}
      onOpenTransactionDetail={onOpenTransactionDetail}
      onScrollDirectionChange={onScrollDirectionChange}
      onSummaryPinnedChange={onSummaryPinnedChange}
      spaceCurrency={spaceCurrency}
      summaryPinned={summaryPinned}
      targetRequestId={targetRequestId}
      targetSection={targetSection}
      transactions={transactions}
    />
  );
}
