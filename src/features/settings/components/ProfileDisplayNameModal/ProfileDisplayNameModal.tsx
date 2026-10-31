import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import { useDepsChanged } from '@/hooks/useDepsChanged';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { iconSize, layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { maxFontScale, typography } from '@/theme/typography';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type ProfileDisplayNameModalProps = {
  error?: string | null;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  value: string | null;
  visible: boolean;
};

const displayNameMaxLength = 60;

/** Mismo patrón que `NoteEditorModal`, en una línea: cabecera con volver,
 * campo único y acción principal fija abajo. */
export function ProfileDisplayNameModal({
  error,
  isSaving = false,
  onClose,
  onSave,
  value,
  visible,
}: ProfileDisplayNameModalProps) {
  const density = useLayoutDensity();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const [name, setName] = useState(value ?? '');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const trimmedName = name.trim();

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

  if (useDepsChanged([visible, value])) {
    if (visible) {
      setName(value ?? '');
    } else {
      setKeyboardVisible(false);
    }
  }

  const handleSave = () => {
    if (!trimmedName || isSaving) return;
    onSave(trimmedName);
  };

  return (
    <AppModal
      containsScrollable
      onClose={onClose}
      testID="profile-display-name-modal"
      variant="expanded"
      visible={visible}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel={t('common.close')}
            accessibilityRole="button"
            onPress={onClose}
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
              {t('settings.displayName.title')}
            </Text>
            <Text style={styles.subtitle} tone="secondary" variant="label">
              {t('settings.displayName.subtitle')}
            </Text>
          </View>
        </View>

        <View style={styles.step}>
          <BottomSheetTextInput
            accessibilityLabel={t('settings.displayName.inputLabel')}
            autoCapitalize="words"
            autoFocus
            editable={!isSaving}
            maxFontSizeMultiplier={maxFontScale.body}
            maxLength={displayNameMaxLength}
            onChangeText={setName}
            onSubmitEditing={handleSave}
            placeholder={t('settings.displayName.placeholder')}
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            style={[styles.input, { minHeight: layout.controlHeight[density] }]}
            testID="profile-display-name-input"
            textContentType="name"
            value={name}
          />
          {error ? (
            <Text
              accessibilityLiveRegion="polite"
              style={styles.error}
              tone="expense"
              variant="footnote"
            >
              {error}
            </Text>
          ) : null}
          <View
            style={[
              styles.bottomAction,
              isKeyboardVisible && styles.keyboardAction,
            ]}
            testID="profile-display-name-action"
          >
            <ModalPrimaryAction
              accessibilityLabel={t('settings.displayName.saveLabel')}
              disabled={!trimmedName || isSaving}
              label={isSaving ? t('common.saving') : t('common.save')}
              onPress={handleSave}
              style={[
                styles.primaryButtonLayout,
                isKeyboardVisible && styles.keyboardPrimaryButton,
              ]}
              testID="profile-display-name-save-button"
            />
          </View>
        </View>
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
    step: { flex: 1 },
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
    error: { marginTop: spacing.sm },
    bottomAction: { flex: 1, justifyContent: 'flex-end' },
    keyboardAction: { flex: 0, justifyContent: 'flex-start' },
    keyboardPrimaryButton: { marginTop: spacing.md },
    primaryButtonLayout: { marginTop: spacing.xl },
  });
}
