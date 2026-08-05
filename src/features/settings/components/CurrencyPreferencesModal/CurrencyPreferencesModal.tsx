import {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { SelectableOption } from '@/components/ui/SelectableOption/SelectableOption';
import { Text } from '@/components/ui/Text/Text';
import {
  maxActiveCurrencies,
  searchCurrencyCatalog,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import type { CurrencyPreferences } from '@/state/appPreferences/currencyPreferences';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { ColorTokens } from '@/theme/types';
import { iconSize } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';

type CurrencyPreferencesModalProps = {
  onClose: () => void;
  onSave: (preferences: CurrencyPreferences) => void;
  preferences: CurrencyPreferences;
  visible: boolean;
};

type LimitNotice = 'max' | 'min' | null;

function createSearchStyles(colors: ColorTokens) {
  return StyleSheet.create({
    searchField: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.round,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
    },
    searchInput: {
      flex: 1,
      color: colors.textPrimary,
    },
  });
}

export function CurrencyPreferencesModal({
  onClose,
  onSave,
  preferences,
  visible,
}: CurrencyPreferencesModalProps) {
  const { colors } = useTheme();
  const searchStyles = useThemedStyles(createSearchStyles);
  const [selectedCurrencies, setSelectedCurrencies] = useState<
    readonly CurrencyCode[]
  >(preferences.currencies);
  const [searchQuery, setSearchQuery] = useState('');
  const [notice, setNotice] = useState<LimitNotice>(null);

  useEffect(() => {
    if (!visible) return;
    setSelectedCurrencies(preferences.currencies);
    setSearchQuery('');
    setNotice(null);
  }, [preferences, visible]);

  const filteredCatalog = useMemo(
    () => searchCurrencyCatalog(searchQuery),
    [searchQuery],
  );

  const handleToggle = (code: CurrencyCode) => {
    setSelectedCurrencies((current) => {
      if (current.includes(code)) {
        if (current.length <= 1) {
          setNotice('min');
          void AccessibilityInfo.announceForAccessibility(
            'Debes mantener al menos una moneda activa.',
          );
          return current;
        }
        setNotice(null);
        return current.filter((selectedCode) => selectedCode !== code);
      }

      if (current.length >= maxActiveCurrencies) {
        setNotice('max');
        void AccessibilityInfo.announceForAccessibility(
          `Ya elegiste ${maxActiveCurrencies} monedas. Quita una para añadir otra.`,
        );
        return current;
      }

      setNotice(null);
      return [...current, code];
    });
  };

  const handleSave = () => {
    onSave({ currencies: selectedCurrencies });
  };

  return (
    <AppModal
      containsScrollable
      onClose={onClose}
      testID="currency-preferences-modal"
      variant="expanded"
      visible={visible}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text accessibilityRole="header" variant="heading">
              Moneda
            </Text>
            <Text tone="secondary" variant="label">
              {notice === 'max'
                ? `Ya elegiste ${maxActiveCurrencies} monedas. Quita una para añadir otra.`
                : notice === 'min'
                  ? 'Debes mantener al menos una moneda activa.'
                  : 'Elige hasta tres monedas para usar en tus movimientos.'}
            </Text>
          </View>
          <ModalCloseButton onPress={onClose} />
        </View>

        <View style={searchStyles.searchField}>
          <Ionicons color={colors.textMuted} name="search" size={iconSize.md} />
          <BottomSheetTextInput
            accessibilityLabel="Buscar moneda"
            onChangeText={setSearchQuery}
            placeholder="Busca por país, moneda o código"
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            style={searchStyles.searchInput}
            testID="currency-search-input"
            value={searchQuery}
          />
        </View>

        <BottomSheetScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          testID="currency-preferences-scroll"
        >
          <View style={styles.optionsList}>
            {filteredCatalog.map((entry) => {
              const selected = selectedCurrencies.includes(entry.code);
              const disabled =
                !selected && selectedCurrencies.length >= maxActiveCurrencies;

              return (
                <SelectableOption
                  accessibilityLabel={`${entry.flag} ${entry.name} (${entry.code})`}
                  disabled={disabled}
                  key={entry.code}
                  label={`${entry.flag}  ${entry.name} · ${entry.code}`}
                  onPress={() => handleToggle(entry.code)}
                  role="checkbox"
                  selected={selected}
                  testID={`currency-option-${entry.code}`}
                />
              );
            })}
            {filteredCatalog.length === 0 ? (
              <Text
                align="center"
                style={styles.emptyState}
                tone="secondary"
                variant="label"
              >
                No encontramos ninguna moneda con esa búsqueda.
              </Text>
            ) : null}
          </View>
        </BottomSheetScrollView>

        <ModalPrimaryAction
          accessibilityLabel="Guardar monedas"
          label="Guardar"
          onPress={handleSave}
          style={styles.saveButton}
          testID="currency-preferences-save"
        />
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  headerText: { flex: 1, gap: spacing.xs },
  scrollContent: { paddingBottom: spacing.md },
  optionsList: { gap: spacing.sm },
  emptyState: { marginTop: spacing.xl },
  saveButton: { marginTop: spacing.sm },
});
