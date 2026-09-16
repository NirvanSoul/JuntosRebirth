import { EnvelopeSimple } from 'phosphor-react-native/src/icons/EnvelopeSimple';
import { ShieldCheck } from 'phosphor-react-native/src/icons/ShieldCheck';

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
  return (
    <SettingsSection icon="help-circle-outline" title="Ayuda">
      <SettingsRow
        iconComponent={EnvelopeSimple}
        iconBackgroundColor={categoryColors.brown}
        label="Contactar con el desarrollador"
        onPress={onContactDeveloper}
      />
      <SettingsDivider />
      <SettingsRow
        iconComponent={ShieldCheck}
        iconBackgroundColor={categoryColors.violet}
        label="Política de privacidad"
        onPress={onOpenPrivacy}
      />
      <SettingsDivider />
      <RestartOnboardingRow onRestart={onRestartOnboarding} />
    </SettingsSection>
  );
}
