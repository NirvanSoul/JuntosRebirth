import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { FlatList, Keyboard, StyleSheet, View } from 'react-native';

import { SelectableOption } from '@/components/ui/SelectableOption/SelectableOption';
import { Text } from '@/components/ui/Text/Text';
import { CountrySearchField } from '@/features/onboarding/components/CountrySearchField';
import { OnboardingScreenLayout } from '@/features/onboarding/components/OnboardingScreenLayout';
import { SelectedCountryField } from '@/features/onboarding/components/SelectedCountryField';
import type { OnboardingStackParamList } from '@/features/onboarding/OnboardingNavigator';
import {
  getCountryFlag,
  searchCountryCatalog,
  type CountryCatalogEntry,
} from '@/lib/geography/countryCatalog';
import { saveCurrencyPreferences } from '@/state/appPreferences/currencyPreferencesRepository';
import { spacing } from '@/theme/spacing';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Country'>;

const countryIllustrationAspectRatio = 1300 / 1148;

export function CountryScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CountryCatalogEntry | null>(null);
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setFocused] = useState(false);
  const countries = useMemo(
    () => (query.trim() ? searchCountryCatalog(query) : []),
    [query],
  );

  const handleSelectCountry = (country: CountryCatalogEntry) => {
    setSelected(country);
    setQuery('');
    setFocused(false);
    Keyboard.dismiss();
  };

  const handleContinue = async () => {
    if (!selected || isSaving) return;
    setSaving(true);
    setError(null);
    try {
      await saveCurrencyPreferences({ currencies: [selected.currencyCode] });
      navigation.navigate('Welcome');
    } catch (error) {
      console.error('[onboarding] No se pudo guardar el país/moneda', error);
      setError('No pudimos guardar tu moneda. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingScreenLayout
      actionDisabled={!selected || isSaving}
      actionLabel={isSaving ? 'Guardando…' : 'Continuar'}
      onAction={() => void handleContinue()}
      onBack={() => navigation.goBack()}
      currentStep={2}
      illustrationAspectRatio={countryIllustrationAspectRatio}
      illustrationSource={require('../../../../assets/Onboarding/2 Pais.png')}
      isCompact={isFocused}
      subtitle="Escribe el nombre de tu país y te mostraremos opciones similares."
      testID="onboarding-country"
      title="¿Desde dónde usarás Juntos?"
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
              No encontramos un país con ese nombre.
            </Text>
          )
        ) : null}
      </View>
    </OnboardingScreenLayout>
  );
}

const styles = StyleSheet.create({
  listArea: { flex: 1, gap: spacing.lg, minHeight: 0 },
  list: { flex: 1 },
  listContent: { gap: spacing.sm, paddingBottom: spacing.xxl },
});
