import {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import {
  AppearancePicker,
  type AppearanceColorOption,
} from '@/components/ui/AppearancePicker/AppearancePicker';
import { Text } from '@/components/ui/Text/Text';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon/CategoryIcon';
import type {
  Category,
  CategoryEditorTarget,
  CategoryIconName,
  CreateCategoryInput,
} from '@/features/categories/types';
import { categoryIconSections } from '@/features/categories/types';
import { validateCategoryName } from '@/features/categories/utils/categoryCatalog';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import {
  categoryColors,
  categoryColorTokens,
  type CategoryColorToken,
} from '@/theme/categoryColors';
import { iconSize, layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { maxFontScale, typography } from '@/theme/typography';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type CreateCategoryModalProps = {
  categories: readonly Category[];
  category?: Category | null;
  initialEditor?: CategoryEditorTarget;
  spaceId: string;
  spaceName: string;
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: CreateCategoryInput) => void;
};

const colorOptions: readonly AppearanceColorOption<CategoryColorToken>[] =
  categoryColorTokens.map((value) => ({
    color: categoryColors[value],
    value,
  }));
const defaultIcon: CategoryIconName = 'shopping-bag';
const defaultColor: CategoryColorToken = 'violet';

export function CreateCategoryModal({
  categories,
  category = null,
  initialEditor,
  spaceId,
  spaceName,
  visible,
  onClose,
  onSubmit,
}: CreateCategoryModalProps) {
  const density = useLayoutDensity();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [step, setStep] = useState<'name' | 'appearance'>('name');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<CategoryIconName>(defaultIcon);
  const [colorToken, setColorToken] =
    useState<CategoryColorToken>(defaultColor);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const validation = validateCategoryName(
    name,
    categories,
    spaceId,
    category?.id,
  );

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, () =>
      setKeyboardVisible(true),
    );
    const hideSubscription = Keyboard.addListener(hideEvent, () =>
      setKeyboardVisible(false),
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setStep(initialEditor ?? 'name');
      setName(category?.name ?? '');
      setIcon(category?.icon ?? defaultIcon);
      setColorToken(category?.colorToken ?? defaultColor);
      setHasAttemptedSubmit(false);
    } else {
      setKeyboardVisible(false);
    }
  }, [category, initialEditor, visible]);

  const handleContinue = () => {
    setHasAttemptedSubmit(true);
    if (validation.valid) setStep('appearance');
  };

  const handleSubmit = () => {
    if (!validation.valid) return;

    onSubmit({ spaceId, name: validation.name, icon, colorToken });
  };

  return (
    <AppModal
      containsScrollable
      onClose={onClose}
      stackBehavior="push"
      testID="create-category-modal"
      variant="expanded"
      visible={visible}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Volver"
            accessibilityRole="button"
            onPress={step === 'name' ? onClose : () => setStep('name')}
            style={styles.headerButton}
          >
            <Ionicons
              color={colors.textPrimary}
              name="arrow-back"
              size={iconSize.lg}
            />
          </Pressable>
          <View style={styles.headerText}>
            <Text accessibilityRole="header" variant="heading">
              {step === 'name'
                ? category
                  ? 'Edita la categoría'
                  : 'Ponle un nombre'
                : category
                  ? 'Actualiza su estilo'
                  : 'Dale tu estilo'}
            </Text>
            <Text style={styles.subtitle} tone="secondary" variant="label">
              Solo existirá en el espacio {spaceName}.
            </Text>
          </View>
        </View>

        {step === 'name' ? (
          <View style={styles.nameStep}>
            <BottomSheetTextInput
              accessibilityLabel="Nombre de la categoría"
              autoFocus
              maxFontSizeMultiplier={maxFontScale.body}
              maxLength={40}
              onChangeText={(value) => {
                setName(value);
                setHasAttemptedSubmit(false);
              }}
              onSubmitEditing={handleContinue}
              placeholder="Por ejemplo, Jardinería"
              placeholderTextColor={colors.textMuted}
              returnKeyType="next"
              style={[
                styles.input,
                { minHeight: layout.controlHeight[density] },
                hasAttemptedSubmit && !validation.valid && styles.inputError,
              ]}
              value={name}
            />
            {hasAttemptedSubmit && !validation.valid && (
              <Text
                accessibilityLiveRegion="polite"
                style={styles.error}
                tone="expense"
                variant="footnote"
              >
                {validation.error}
              </Text>
            )}
            <View
              style={[
                styles.bottomAction,
                isKeyboardVisible && styles.keyboardAction,
              ]}
              testID="category-name-action"
            >
              <ModalPrimaryAction
                accessibilityLabel="Continuar personalización"
                disabled={!validation.valid}
                label="Continuar"
                onPress={handleContinue}
                style={[
                  styles.primaryButtonLayout,
                  isKeyboardVisible && styles.keyboardPrimaryButton,
                ]}
              />
            </View>
          </View>
        ) : (
          <View style={styles.appearanceStep}>
            <BottomSheetScrollView
              contentContainerStyle={styles.appearanceContent}
              showsVerticalScrollIndicator={false}
              style={styles.appearanceScroll}
              testID="category-appearance-picker"
            >
              <View style={styles.preview}>
                <View
                  style={[
                    styles.previewIcon,
                    { backgroundColor: categoryColors[colorToken] },
                  ]}
                  testID="category-appearance-preview-icon"
                >
                  <CategoryIcon
                    color={colors.onBrand}
                    name={icon}
                    size={iconSize.xl}
                  />
                </View>
                <Text variant="subheading">{name.trim()}</Text>
              </View>

              <AppearancePicker
                colorOptions={colorOptions}
                iconSections={categoryIconSections}
                onSelectColor={setColorToken}
                onSelectIcon={setIcon}
                renderIcon={(option, color) => (
                  <CategoryIcon
                    color={color}
                    name={option}
                    size={iconSize.md}
                  />
                )}
                selectedColor={colorToken}
                selectedIcon={icon}
                testID="category-appearance"
              />
            </BottomSheetScrollView>

            <ModalPrimaryAction
              accessibilityLabel={
                category ? 'Guardar cambios de categoría' : 'Crear categoría'
              }
              label={category ? 'Guardar cambios' : 'Crear categoría'}
              onPress={handleSubmit}
              style={styles.primaryButtonLayout}
            />
          </View>
        )}
      </View>
    </AppModal>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    headerButton: {
      width: layout.minTouchTarget,
      height: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: { flex: 1 },
    subtitle: { marginTop: spacing.xs },
    nameStep: { flex: 1 },
    input: {
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      fontFamily: typography.body.fontFamily,
      fontSize: typography.body.fontSize,
      letterSpacing: typography.body.letterSpacing,
      marginTop: spacing.xxl,
      paddingHorizontal: spacing.lg,
    },
    inputError: { borderColor: colors.expense },
    error: { marginTop: spacing.sm },
    bottomAction: { flex: 1, justifyContent: 'flex-end' },
    keyboardAction: { flex: 0, justifyContent: 'flex-start' },
    keyboardPrimaryButton: { marginTop: spacing.md },
    primaryButtonLayout: { marginTop: spacing.xl },
    appearanceStep: { flex: 1, overflow: 'visible' },
    appearanceScroll: { flex: 1, overflow: 'visible' },
    appearanceContent: { paddingTop: spacing.xxxl, paddingBottom: spacing.md },
    preview: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    previewIcon: {
      width: 56,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
    },
  });
}
