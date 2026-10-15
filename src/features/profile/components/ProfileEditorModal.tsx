import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  type AlertButton,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Avatar } from '@/components/ui/Avatar/Avatar';
import { Text } from '@/components/ui/Text/Text';
import { useProfileAvatar } from '@/features/profile/hooks/useProfileAvatar';
import { useProfileDisplayName } from '@/features/profile/hooks/useProfileDisplayName';
import { useDepsChanged } from '@/hooks/useDepsChanged';
import { iconSize, layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { maxFontScale, typography } from '@/theme/typography';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type ProfileEditorModalProps = {
  onClose: () => void;
  visible: boolean;
};

const profileAvatarSize = 88;
const avatarEditBadgeSize = 32;
const displayNameMaxLength = 60;

/** Edición breve de la identidad visible, accesible desde el menú lateral. */
export function ProfileEditorModal({
  onClose,
  visible,
}: ProfileEditorModalProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const avatar = useProfileAvatar();
  const name = useProfileDisplayName();
  const [draftName, setDraftName] = useState(name.displayName ?? '');
  const trimmedName = draftName.trim();

  if (useDepsChanged([visible, name.displayName])) {
    if (visible) setDraftName(name.displayName ?? '');
    avatar.dismissError();
    name.dismissError();
  }

  const handleChangeAvatar = () => {
    if (avatar.isBusy) return;

    const options: AlertButton[] = [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Tomar foto', onPress: () => avatar.changeAvatar('camera') },
      {
        text: 'Elegir de la galería',
        onPress: () => avatar.changeAvatar('library'),
      },
    ];
    Alert.alert(
      'Foto de perfil',
      'Elige una foto desde la cámara o la galería.',
      options,
    );
  };

  const handleSave = async () => {
    if (!trimmedName || name.isSaving) return;
    if (await name.saveDisplayName(trimmedName)) onClose();
  };

  return (
    <AppModal onClose={onClose} testID="profile-editor-modal" visible={visible}>
      <View style={styles.header}>
        <Text accessibilityRole="header" variant="heading">
          Editar perfil
        </Text>
        <ModalCloseButton onPress={onClose} />
      </View>

      <View style={styles.content}>
        <Pressable
          accessibilityLabel="Cambiar foto de perfil"
          accessibilityRole="button"
          accessibilityState={{ disabled: avatar.isBusy }}
          disabled={avatar.isBusy}
          onPress={handleChangeAvatar}
          style={({ pressed }) => [
            styles.avatarButton,
            pressed && styles.pressed,
          ]}
          testID="profile-editor-avatar-button"
        >
          <Avatar
            size={profileAvatarSize}
            testID="profile-editor-avatar"
            uri={avatar.avatarUri}
          />
          {avatar.isBusy ? (
            <View style={styles.avatarBusyOverlay}>
              <ActivityIndicator color={colors.onBrand} size="small" />
            </View>
          ) : (
            <View style={styles.avatarEditBadge}>
              <Ionicons
                color={colors.onBrand}
                name="pencil"
                size={iconSize.xs}
              />
            </View>
          )}
        </Pressable>

        <Text align="center" tone="secondary" variant="footnote">
          Toca la foto para cambiarla
        </Text>
        {avatar.avatarUri ? (
          <Pressable
            accessibilityLabel="Quitar foto de perfil"
            accessibilityRole="button"
            accessibilityState={{ disabled: avatar.isBusy }}
            disabled={avatar.isBusy}
            onPress={avatar.removeAvatar}
            style={({ pressed }) => [
              styles.removeAvatarButton,
              avatar.isBusy && styles.disabled,
              pressed && styles.pressed,
            ]}
            testID="profile-editor-remove-avatar"
          >
            <Text tone="expense" variant="footnote" weight="semibold">
              Quitar foto
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.field}>
          <Text variant="label" weight="semibold">
            Nombre
          </Text>
          <BottomSheetTextInput
            accessibilityLabel="Nombre de perfil"
            autoCapitalize="words"
            editable={!name.isSaving}
            maxFontSizeMultiplier={maxFontScale.body}
            maxLength={displayNameMaxLength}
            onChangeText={setDraftName}
            onSubmitEditing={() => void handleSave()}
            placeholder="Escribe tu nombre"
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            style={styles.input}
            testID="profile-editor-name-input"
            textContentType="name"
            value={draftName}
          />
          {name.error ? (
            <Text
              accessibilityLiveRegion="polite"
              tone="expense"
              variant="footnote"
            >
              {name.error}
            </Text>
          ) : null}
          {avatar.errorCopy ? (
            <Text
              accessibilityLiveRegion="polite"
              tone="expense"
              variant="footnote"
            >
              {`${avatar.errorCopy.title}. ${avatar.errorCopy.message}`}
            </Text>
          ) : avatar.progressLabel ? (
            <Text
              accessibilityLiveRegion="polite"
              tone="secondary"
              variant="footnote"
            >
              {avatar.progressLabel}
            </Text>
          ) : null}
        </View>

        <ModalPrimaryAction
          accessibilityLabel="Guardar perfil"
          disabled={!trimmedName || name.isSaving}
          label={name.isSaving ? 'Guardando…' : 'Guardar'}
          onPress={() => void handleSave()}
          style={styles.saveButton}
          testID="profile-editor-save-button"
        />
      </View>
    </AppModal>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    header: {
      minHeight: layout.minTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    content: {
      alignItems: 'center',
      gap: spacing.sm,
      paddingTop: spacing.lg,
    },
    avatarButton: {
      position: 'relative',
      width: profileAvatarSize,
      height: profileAvatarSize,
    },
    avatarBusyOverlay: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
      backgroundColor: colors.overlay,
    },
    avatarEditBadge: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: avatarEditBadgeSize,
      height: avatarEditBadgeSize,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
      borderWidth: 2,
      borderColor: colors.modalBackground,
      backgroundColor: colors.brand,
    },
    field: {
      alignSelf: 'stretch',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    removeAvatarButton: {
      minHeight: layout.minTouchTarget,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
    },
    input: {
      minHeight: layout.controlHeight.regular,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      fontFamily: typography.body.fontFamily,
      fontSize: typography.body.fontSize,
      letterSpacing: typography.body.letterSpacing,
      paddingHorizontal: spacing.lg,
    },
    saveButton: { alignSelf: 'stretch' },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.68 },
  });
}
