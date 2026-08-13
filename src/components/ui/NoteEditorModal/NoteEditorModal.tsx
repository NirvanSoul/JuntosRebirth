import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text, type TextTone } from '@/components/ui/Text/Text';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { iconSize, layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { maxFontScale, typography } from '@/theme/typography';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type NoteEditorModalProps = {
  onClose: () => void;
  onSave: (note: string | null) => void;
  saveColor: string;
  saveTone?: TextTone;
  subtitle?: string;
  testID?: string;
  title?: string;
  value?: string;
  visible: boolean;
};

/** Mismo patrón que el paso de nombre de `CreateCategoryModal`: cabecera con
 * volver, campo único y acción principal fija abajo. */
export function NoteEditorModal({
  onClose,
  onSave,
  saveColor,
  saveTone,
  subtitle,
  testID = 'note-editor-modal',
  title = 'Nota',
  value,
  visible,
}: NoteEditorModalProps) {
  const density = useLayoutDensity();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [note, setNote] = useState(value ?? '');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

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
      setNote(value ?? '');
    } else {
      setKeyboardVisible(false);
    }
  }, [value, visible]);

  const handleSave = () => {
    const trimmed = note.trim();
    onSave(trimmed.length > 0 ? trimmed : null);
  };

  return (
    <AppModal
      containsScrollable
      onClose={onClose}
      stackBehavior="push"
      testID={testID}
      variant="expanded"
      visible={visible}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Cerrar"
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
              {title}
            </Text>
            {subtitle ? (
              <Text
                numberOfLines={1}
                style={styles.subtitle}
                tone="secondary"
                variant="label"
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.step}>
          <BottomSheetTextInput
            accessibilityLabel="Texto de la nota"
            autoFocus
            maxFontSizeMultiplier={maxFontScale.body}
            maxLength={2000}
            multiline
            onChangeText={setNote}
            placeholder="Escribe una nota, una lista o algún detalle…"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              { minHeight: layout.controlHeight[density] * 3 },
            ]}
            testID={`${testID}-input`}
            value={note}
          />
          <View
            style={[
              styles.bottomAction,
              isKeyboardVisible && styles.keyboardAction,
            ]}
            testID={`${testID}-action`}
          >
            <ModalPrimaryAction
              accessibilityLabel="Guardar nota"
              gradientColor={saveColor}
              gradientTestID={`${testID}-save-gradient`}
              gradientTextTone={saveTone}
              label="Guardar"
              onPress={handleSave}
              style={[
                styles.primaryButtonLayout,
                isKeyboardVisible && styles.keyboardPrimaryButton,
              ]}
              testID={`${testID}-save-button`}
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
      paddingVertical: spacing.md,
      textAlignVertical: 'top',
    },
    bottomAction: { flex: 1, justifyContent: 'flex-end' },
    keyboardAction: { flex: 0, justifyContent: 'flex-start' },
    keyboardPrimaryButton: { marginTop: spacing.md },
    primaryButtonLayout: { marginTop: spacing.xl },
  });
}
