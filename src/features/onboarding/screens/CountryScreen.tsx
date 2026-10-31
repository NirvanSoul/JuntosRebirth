import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Keyboard, StyleSheet, View } from 'react-native';

import { SelectableOption } from '@/components/ui/SelectableOption/SelectableOption';
import { Text } from '@/components/ui/Text/Text';
import { CountrySearchField } from '@/features/onboarding/components/CountrySearchField';
import { OnboardingScreenLayout } from '@/features/onboarding/components/OnboardingScreenLayout';
import { SelectedCountryField } from '@/features/onboarding/components/SelectedCountryField';
import type { OnboardingStackParamList } from '@/features/onboarding/OnboardingNavigator';
import { updateProfileCountry } from '@/features/profile/services/updateProfileCountry';
import type { AppLanguage } from '@/lib/i18n/languages';
import { useAppLanguage } from '@/lib/i18n/useAppLanguage';
import { LanguagePreferenceModal } from '@/features/settings/components/LanguagePreferenceModal/LanguagePreferenceModal';
import {
  getCountryFlag,
  searchCountryCatalog,
  type CountryCatalogEntry,
} from '@/lib/geography/countryCatalog';
import { spacing } from '@/theme/spacing';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Country'>;

const countryIllustrationAspectRatio = 1300 / 1148;

/** Países de habla inglesa donde se pregunta en qué idioma usar la app. */
const languagePromptCountryCodes = new Set(['US', 'GB', 'CA']);

export function CountryScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CountryCatalogEntry | null>(null);
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setFocused] = useState(false);
  const [isLanguagePromptVisible, setLanguagePromptVisible] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<AppLanguage | null>(
    null,
  );
  const { setLanguage } = useAppLanguage();
  const countries = useMemo(
    () => (query.trim() ? searchCountryCatalog(query) : []),
    [query],
  );

  const handleSelectCountry = (country: CountryCatalogEntry) => {
    setSelected(country);
    setQuery('');
    setFocused(false);
    Keyboard.dismiss();
    if (languagePromptCountryCodes.has(country.iso2)) {
      setLanguagePromptVisible(true);
    }
  };

  const handleContinue = async () => {
    if (!selected || isSaving) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfileCountry(selected.iso2, { sync: 'deferred' });
      navigation.navigate('Juntos');
      // Al cambiar de idioma se vuelve a montar la navegación, ya en la
      // siguiente lámina.
      if (pendingLanguage) await setLanguage(pendingLanguage);
    } catch (error) {
      console.error('[onboarding] No se pudo guardar el país/moneda', error);
      setError(t('onboarding.country.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingScreenLayout
      actionDisabled={!selected || isSaving}
      actionLabel={isSaving ? t('common.saving') : t('common.continue')}
      onAction={() => void handleContinue()}
      onBack={() => navigation.goBack()}
      currentStep={2}
      illustrationAspectRatio={countryIllustrationAspectRatio}
      illustrationSource={require('../../../../assets/Onboarding/2_Pais.png')}
      isCompact={isFocused}
      subtitle={t('onboarding.country.subtitle')}
      testID="onboarding-country"
      title={t('onboarding.country.title')}
    >
      <View style={styles.listArea}>
        {selected ? (
          <SelectedCountryField
            country={selected}
            onClear={() => setSelected(null)}
            testID="onboarding-country-selected"
          />
        ) : (
          <CountrySearchField
            onBlur={() => setFocused(false)}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            value={query}
          />
        )}
        {error ? (
          <Text tone="expense" variant="footnote">
            {error}
          </Text>
        ) : null}
        {!selected && query.trim() ? (
          countries.length > 0 ? (
            <FlatList
              contentContainerStyle={styles.listContent}
              data={countries}
              keyExtractor={(item) => item.iso2}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <SelectableOption
                  accessibilityLabel={`${item.name}, ${item.currencyCode}`}
                  label={`${getCountryFlag(item.iso2)}  ${item.name} · ${item.currencyCode}`}
                  onPress={() => handleSelectCountry(item)}
                  selected={false}
                  testID={`onboarding-country-${item.iso2}`}
                />
              )}
              showsVerticalScrollIndicator={false}
              style={styles.list}
            />
          ) : (
            <Text align="center" tone="secondary" variant="body">
              {t('onboarding.country.noResults')}
            </Text>
          )
        ) : null}
      </View>
      <LanguagePreferenceModal
        onClose={() => setLanguagePromptVisible(false)}
        onSelectLanguage={setPendingLanguage}
        selectedLanguage={pendingLanguage ?? undefined}
        subtitle={t('onboarding.country.languagePromptSubtitle')}
        testID="onboarding-language-prompt"
        title={t('onboarding.country.languagePromptTitle')}
        visible={isLanguagePromptVisible}
      />
    </OnboardingScreenLayout>
  );
}

const styles = StyleSheet.create({
  listArea: { flex: 1, gap: spacing.lg, minHeight: 0 },
  list: { flex: 1 },
  listContent: { gap: spacing.sm, paddingBottom: spacing.xxl },
});
