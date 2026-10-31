import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { SelectableOption } from '@/components/ui/SelectableOption/SelectableOption';
import { Text } from '@/components/ui/Text/Text';
import {
  appLanguageLabels,
  appLanguages,
  type AppLanguage,
} from '@/lib/i18n/languages';
import { useAppLanguage } from '@/lib/i18n/useAppLanguage';
import { spacing } from '@/theme/spacing';

type LanguagePreferenceModalProps = {
  onClose: () => void;
  visible: boolean;
  /** Textos alternativos, como la pregunta que hace el onboarding al elegir país. */
  title?: string;
  subtitle?: string;
  testID?: string;
  /**
   * Sustituye el cambio inmediato: el onboarding guarda la elección y la
   * aplica al continuar, para no volver a montar la pantalla a medio rellenar.
   */
  onSelectLanguage?: (language: AppLanguage) => void;
  selectedLanguage?: AppLanguage;
};

/** Elegir un idioma lo aplica y lo guarda en el dispositivo al instante. */
export function LanguagePreferenceModal({
  onClose,
  visible,
  title,
  subtitle,
  testID = 'language-preference-modal',
  onSelectLanguage,
  selectedLanguage,
}: LanguagePreferenceModalProps) {
  const { t } = useTranslation();
  const { language, setLanguage } = useAppLanguage();

  const handleSelect = (next: AppLanguage) => {
    if (onSelectLanguage) {
      onSelectLanguage(next);
      onClose();
      return;
    }
    void setLanguage(next).catch((error: unknown) => {
      console.error('[language] No se pudo guardar el idioma', error);
    });
    onClose();
  };

  return (
    <AppModal
      onClose={onClose}
      testID={testID}
      variant="compact"
      visible={visible}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text accessibilityRole="header" variant="heading">
            {title ?? t('language.title')}
          </Text>
          <Text tone="secondary" variant="body">
            {subtitle ?? t('language.subtitle')}
          </Text>
        </View>
        <View accessibilityRole="radiogroup" style={styles.options}>
          {appLanguages.map((option) => (
            <SelectableOption
              accessibilityLabel={appLanguageLabels[option]}
              key={option}
              label={appLanguageLabels[option]}
              onPress={() => handleSelect(option)}
              selected={option === (selectedLanguage ?? language)}
              testID={`${testID}-${option}`}
            />
          ))}
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  header: { gap: spacing.xs },
  options: { gap: spacing.sm },
});
