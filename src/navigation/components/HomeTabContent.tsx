import { PendingInvitationBanner } from '@/features/spaces/components/PendingInvitationBanner';
import { AwaitingPartnerScreen } from '@/features/spaces/screens/AwaitingPartnerScreen';
import { InvitePartnerScreen } from '@/features/spaces/screens/InvitePartnerScreen';
import type { Space } from '@/features/spaces/types';
import { HomeScreen } from '@/features/dashboard/screens/HomeScreen';
import type { Category } from '@/features/categories/types';
import type { MoneyAccount } from '@/features/accounts/types';
import type { SessionTransaction } from '@/features/transactions/types';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import type { CreateActionType } from '@/navigation/createActions';

type HomeTabContentProps = {
  activeSpace: Space;
  activeSpaceCategories: readonly Category[];
  activeSpaceTransactions: readonly SessionTransaction[];
  coupleSpace: Space | null;
  createCoupleSpaceInvitation: (
    inviteeEmail: string,
    name?: string,
  ) => Promise<Space>;
  effectiveHomeCurrency: CurrencyCode;
  focusResetKey: number;
  handleCreateAction: (action: CreateActionType) => void;
  handleScrollDirectionChange: (direction: 'down' | 'up') => void;
  isAwaitingPartner: boolean;
  isInvitePartnerVisible: boolean;
  moneyAccounts: readonly MoneyAccount[];
  navigateToActivitySection: (
    section: 'accounts' | 'categories' | 'movements',
  ) => void;
  onAcceptPendingInvitation?: (spaceId?: string) => Promise<void>;
  onCancelInvitation: () => Promise<void>;
  onDismissInvitePartner: () => void;
  onOpenCategoryDetail: (categoryId: string) => void;
  onOpenCountrySettings: () => void;
  onOpenCreateMoneyAccount: () => void;
  onOpenMoneyAccountDetail: (moneyAccountId: string) => void;
  onOpenTransactionDetail: (transactionId: string) => void;
  onRefreshCoupleSpaceAndData: () => Promise<void>;
  onRequestInvitePartner: () => void;
  showHomeComparisonIndicators: boolean;
};

export function HomeTabContent({
  activeSpace,
  activeSpaceCategories,
  activeSpaceTransactions,
  coupleSpace,
  createCoupleSpaceInvitation,
  effectiveHomeCurrency,
  focusResetKey,
  handleCreateAction,
  handleScrollDirectionChange,
  isAwaitingPartner,
  isInvitePartnerVisible,
  moneyAccounts,
  navigateToActivitySection,
  onAcceptPendingInvitation,
  onCancelInvitation,
  onDismissInvitePartner,
  onOpenCategoryDetail,
  onOpenCountrySettings,
  onOpenCreateMoneyAccount,
  onOpenMoneyAccountDetail,
  onOpenTransactionDetail,
  onRefreshCoupleSpaceAndData,
  onRequestInvitePartner,
  showHomeComparisonIndicators,
}: HomeTabContentProps) {
  const handleAccepted =
    onAcceptPendingInvitation ?? onRefreshCoupleSpaceAndData;

  const content = isInvitePartnerVisible ? (
    <InvitePartnerScreen
      coupleSpace={coupleSpace}
      onCancel={onDismissInvitePartner}
      onCreateCoupleSpaceInvitation={createCoupleSpaceInvitation}
      onFinished={onDismissInvitePartner}
    />
  ) : isAwaitingPartner ? (
    <AwaitingPartnerScreen
      onCancelInvitation={onCancelInvitation}
      onChangeInvitation={onRequestInvitePartner}
      onRefresh={onRefreshCoupleSpaceAndData}
      space={activeSpace}
    />
  ) : (
    <HomeScreen
      categories={activeSpaceCategories}
      currency={effectiveHomeCurrency}
      focusResetKey={focusResetKey}
      moneyAccounts={moneyAccounts}
      onCreateCategory={() => handleCreateAction('category')}
      onCreateExpense={() => handleCreateAction('expense')}
      onCreateIncome={() => handleCreateAction('income')}
      onCreateMoneyAccount={onOpenCreateMoneyAccount}
      onCreateMovement={() => handleCreateAction('expense')}
      onOpenCategoryDetail={onOpenCategoryDetail}
      onOpenMoneyAccountDetail={onOpenMoneyAccountDetail}
      onOpenTransactionDetail={onOpenTransactionDetail}
      onScrollDirectionChange={handleScrollDirectionChange}
      onViewAccounts={() => navigateToActivitySection('accounts')}
      onViewCategories={() => navigateToActivitySection('categories')}
      onViewMovements={() => navigateToActivitySection('movements')}
      revealKey={`${activeSpace.id}:${effectiveHomeCurrency}`}
      showComparisonIndicators={showHomeComparisonIndicators}
      spaceCurrency={activeSpace.currency}
      transactions={activeSpaceTransactions}
    />
  );

  return (
    <>
      {content}
      <PendingInvitationBanner
        onAccepted={handleAccepted}
        onOpenCountrySettings={onOpenCountrySettings}
      />
    </>
  );
}
