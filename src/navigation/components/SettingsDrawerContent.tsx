import { SettingsScreen } from '@/features/settings/screens/SettingsScreen';
import type { CurrencyPreferences } from '@/state/appPreferences/currencyPreferences';
import type { Space } from '@/features/spaces/types';
import type { SaveLocalNotificationRuleInput } from '@/features/transactions/repositories/localTransactionNotificationRuleRepository';
import type { TransactionNotificationRule } from '@/features/transactions/types';

type SettingsDrawerContentProps = {
  activeSpaceId: string;
  activeSpaceType: Space['type'];
  currencyPreferences: CurrencyPreferences;
  hasSharedSpace: boolean;
  notificationRules: readonly TransactionNotificationRule[];
  onBack: () => void;
  onCountryChanged: () => Promise<void>;
  onLeaveCoupleSpace: () => Promise<void>;
  onSaveCurrencyPreferences: (preferences: CurrencyPreferences) => void;
  onSaveNotificationRule: (
    input: SaveLocalNotificationRuleInput,
  ) => boolean | Promise<boolean>;
  onToggleHomeComparisonIndicators: (enabled: boolean) => void;
  showHomeComparisonIndicators: boolean;
};

export function SettingsDrawerContent({
  activeSpaceId,
  activeSpaceType,
  currencyPreferences,
  hasSharedSpace,
  notificationRules,
  onBack,
  onCountryChanged,
  onLeaveCoupleSpace,
  onSaveCurrencyPreferences,
  onSaveNotificationRule,
  onToggleHomeComparisonIndicators,
  showHomeComparisonIndicators,
}: SettingsDrawerContentProps) {
  return (
    <SettingsScreen
      activeSpaceId={activeSpaceId}
      activeSpaceType={activeSpaceType}
      currencyPreferences={currencyPreferences}
      hasSharedSpace={hasSharedSpace}
      notificationRules={notificationRules}
      onBack={onBack}
      onCountryChanged={onCountryChanged}
      onLeaveCoupleSpace={onLeaveCoupleSpace}
      onSaveCurrencyPreferences={onSaveCurrencyPreferences}
      onSaveNotificationRule={onSaveNotificationRule}
      onToggleHomeComparisonIndicators={onToggleHomeComparisonIndicators}
      showHomeComparisonIndicators={showHomeComparisonIndicators}
    />
  );
}
