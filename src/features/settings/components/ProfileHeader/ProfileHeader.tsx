import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  type AlertButton,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { Avatar } from '@/components/ui/Avatar/Avatar';
import { Text } from '@/components/ui/Text/Text';
import { useProfileAvatar } from '@/features/profile/hooks/useProfileAvatar';
import { useProfileDisplayName } from '@/features/profile/hooks/useProfileDisplayName';
import { ProfileDisplayNameModal } from '@/features/settings/components/ProfileDisplayNameModal/ProfileDisplayNameModal';
import { ProfileEditIcon } from '@/features/settings/components/ProfileEditIcon/ProfileEditIcon';
import { iconSize } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

const profileAvatarSize = 112;
const avatarEditBadgeSize = 32;

/**
 * Cabecera de perfil de Ajustes: foto y nombre, centrados, a la manera de la
 * cabecera de un modal de detalle en vez de una fila de lista.
 *
 * Junta la foto y el nombre en un mismo componente porque comparten esa
 * disposición central; cada uno conserva su propio hook y sus propias fases
 * —elegir, subir, guardar, error— para que ninguno tenga que conocer el
 * circuito del otro.
 */
export function ProfileHeader() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const avatar = useProfileAvatar();
  const name = useProfileDisplayName();
  const [isNameModalVisible, setNameModalVisible] = useState(false);

  const handleChangeAvatar = () => {
    // El bloqueo real vive en el hook, pero abrir el selector durante una
    // subida dejaría a la persona eligiendo una foto que se iba a descartar.
    if (avatar.isBusy) return;

    const options: AlertButton[] = [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Tomar foto', onPress: () => avatar.changeAvatar('camera') },
      {
        text: 'Elegir de la galería',
        onPress: () => avatar.changeAvatar('library'),
      },
    ];
    if (avatar.avatarUri) {
      options.push({
        text: 'Quitar foto',
        style: 'destructive',
        onPress: () => avatar.removeAvatar(),
      });
    }

    Alert.alert(
      'Foto de perfil',
      'Para elegir una imagen, Juntoss necesita acceder a tus fotos o a la cámara. Se usará solo como tu foto de perfil.',
      options,
    );
  };

  const handleSaveName = async (value: string) => {
    const saved = await name.saveDisplayName(value);
    if (saved) setNameModalVisible(false);
  };

  const handleCloseNameModal = () => {
    setNameModalVisible(false);
    name.dismissError();
  };

  return (
    <>
      <View style={styles.container}>
        <Pressable
          accessibilityLabel="Cambiar foto de perfil"
          accessibilityRole="button"
          accessibilityState={{ disabled: avatar.isBusy }}
          disabled={avatar.isBusy}
          onPress={handleChangeAvatar}
          style={({ pressed }) => [
            styles.avatarButton,
            pressed ? styles.pressed : null,
          ]}
          testID="settings-avatar-button"
        >
          <Avatar
            size={profileAvatarSize}
            testID="settings-avatar"
            uri={avatar.avatarUri}
          />
          {avatar.isBusy ? (
            <View style={styles.avatarBusyOverlay}>
              <ActivityIndicator color={colors.onBrand} size="small" />
            </View>
          ) : (
            <View style={styles.avatarEditBadge}>
              <ProfileEditIcon color={colors.onBrand} size={iconSize.xs} />
            </View>
          )}
        </Pressable>

        <Pressable
          accessibilityLabel="Editar nombre"
          accessibilityRole="button"
          onPress={() => setNameModalVisible(true)}
          style={({ pressed }) => [
            styles.nameRow,
            pressed ? styles.pressed : null,
          ]}
          testID="settings-display-name-button"
        >
          <Text
            numberOfLines={1}
            testID="settings-display-name"
            variant="subheading"
            weight="semibold"
          >
            {name.displayName ?? 'Agregar tu nombre'}
          </Text>
          <ProfileEditIcon color={colors.textSecondary} size={iconSize.sm} />
        </Pressable>

        <Text
          align="center"
          testID="settings-avatar-status"
          tone={avatar.errorCopy ? 'expense' : 'secondary'}
          variant="footnote"
        >
          {avatar.errorCopy
            ? `${avatar.errorCopy.title}. ${avatar.errorCopy.message}`
            : (avatar.progressLabel ?? 'Toca tu foto para cambiarla')}
        </Text>
      </View>

      <ProfileDisplayNameModal
        error={name.error}
        isSaving={name.isSaving}
        onClose={handleCloseNameModal}
        onSave={(value) => void handleSaveName(value)}
        value={name.displayName}
        visible={isNameModalVisible}
      />
    </>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.lg,
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
      borderColor: colors.background,
      backgroundColor: colors.brand,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    pressed: { opacity: 0.68 },
  });
}
