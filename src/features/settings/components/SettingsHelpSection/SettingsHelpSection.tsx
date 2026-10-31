import { EnvelopeSimple } from 'phosphor-react-native/src/icons/EnvelopeSimple';
import { ShieldCheck } from 'phosphor-react-native/src/icons/ShieldCheck';
import { useTranslation } from 'react-i18next';

import {
  SettingsDivider,
  SettingsRow,
  SettingsSection,
} from '@/components/layout/SettingsList/SettingsList';
import { RestartOnboardingRow } from '@/features/settings/components/RestartOnboardingRow/RestartOnboardingRow';
import { categoryColors } from '@/theme/categoryColors';

type SettingsHelpSectionProps = {
  onContactDeveloper: () => void;
  onOpenPrivacy: () => void;
  onRestartOnboarding: () => void;
};

export function SettingsHelpSection({
  onContactDeveloper,
  onOpenPrivacy,
  onRestartOnboarding,
}: SettingsHelpSectionProps) {
  const { t } = useTranslation();

  return (
    <SettingsSection
      icon="help-circle-outline"
      title={t('settings.sections.help')}
    >
      <SettingsRow
        iconComponent={EnvelopeSimple}
        iconBackgroundColor={categoryColors.brown}
        label={t('settings.rows.contactDeveloper')}
        onPress={onContactDeveloper}
      />
      <SettingsDivider />
      <SettingsRow
        iconComponent={ShieldCheck}
        iconBackgroundColor={categoryColors.violet}
        label={t('settings.rows.privacyPolicy')}
        onPress={onOpenPrivacy}
      />
      <SettingsDivider />
      <RestartOnboardingRow onRestart={onRestartOnboarding} />
    </SettingsSection>
  );
}
