import {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { SelectableOption } from '@/components/ui/SelectableOption/SelectableOption';
import { Text } from '@/components/ui/Text/Text';
import { useDepsChanged } from '@/hooks/useDepsChanged';
import {
  getCountryFlag,
  searchCountryCatalog,
} from '@/lib/geography/countryCatalog';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { ColorTokens } from '@/theme/types';
import { iconSize } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';

type CountryPreferencesModalProps = {
  countryCode: string | null;
  error?: string | null;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (countryCode: string) => void | Promise<void>;
  visible: boolean;
};

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

export function CountryPreferencesModal({
  countryCode,
  error = null,
  isSaving = false,
  onClose,
  onSave,
  visible,
}: CountryPreferencesModalProps) {
  const { colors } = useTheme();
  const searchStyles = useThemedStyles(createSearchStyles);
  const [selectedIso2, setSelectedIso2] = useState<string | null>(countryCode);
  const [searchQuery, setSearchQuery] = useState('');

  if (useDepsChanged([visible, countryCode])) {
    if (visible) {
      setSelectedIso2(countryCode);
      setSearchQuery('');
    }
  }

  const filteredCatalog = useMemo(
    () => searchCountryCatalog(searchQuery),
    [searchQuery],
  );

  const handleSave = async () => {
    if (!selectedIso2) return;
    await onSave(selectedIso2);
  };

  return (
    <AppModal
      containsScrollable
      onClose={onClose}
      testID="country-preferences-modal"
      variant="expanded"
      visible={visible}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text accessibilityRole="header" variant="heading">
              País
            </Text>
            <Text tone="secondary" variant="label">
              Elige el país desde donde usas Juntos.
            </Text>
          </View>
          <ModalCloseButton onPress={onClose} />
        </View>

        <View style={searchStyles.searchField}>
          <Ionicons color={colors.textMuted} name="search" size={iconSize.md} />
          <BottomSheetTextInput
            accessibilityLabel="Buscar país"
            editable={!isSaving}
            onChangeText={setSearchQuery}
            placeholder="Busca por nombre de país"
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            style={searchStyles.searchInput}
            testID="country-search-input"
            value={searchQuery}
          />
        </View>
        {error ? (
          <Text tone="expense" variant="footnote">
            {error}
          </Text>
        ) : null}

        <BottomSheetScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          testID="country-preferences-scroll"
        >
          <View style={styles.optionsList}>
            {filteredCatalog.map((entry) => {
              const selected = selectedIso2 === entry.iso2;

              return (
                <SelectableOption
                  accessibilityLabel={`${entry.name}, ${entry.iso2}`}
                  key={entry.iso2}
                  label={`${getCountryFlag(entry.iso2)}  ${entry.name}`}
                  onPress={() => setSelectedIso2(entry.iso2)}
                  role="radio"
                  selected={selected}
                  testID={`country-option-${entry.iso2}`}
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
                No encontramos ningún país con esa búsqueda.
              </Text>
            ) : null}
          </View>
        </BottomSheetScrollView>

        <ModalPrimaryAction
          accessibilityLabel="Guardar país"
          disabled={!selectedIso2 || isSaving}
          label={isSaving ? 'Guardando…' : 'Guardar'}
          onPress={() => void handleSave()}
          style={styles.saveButton}
          testID="country-preferences-save"
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
