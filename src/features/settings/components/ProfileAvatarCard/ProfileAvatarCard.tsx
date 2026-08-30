import Ionicons from '@expo/vector-icons/Ionicons';
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
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

const profileIconSize = 56;

type ProfileAvatarCardProps = {
  /** `false` pinta la etiqueta de invitado: sin cuenta la foto no se publica. */
  hasSession: boolean;
};

/**
 * Tarjeta de perfil de Ajustes: la foto y su estado.
 *
 * Vive fuera de `SettingsScreen` porque el circuito de la foto tiene fases
 * propias —elegir, preparar, subir, error— y mezclarlas con el resto de la
 * pantalla obligaría a leer las dos cosas a la vez para entender cualquiera.
 */
export function ProfileAvatarCard({ hasSession }: ProfileAvatarCardProps) {
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const avatar = useProfileAvatar();

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

  return (
    <View style={styles.profileCard}>
      <Pressable
        accessibilityLabel="Cambiar foto de perfil"
        accessibilityRole="button"
        accessibilityState={{ disabled: avatar.isBusy }}
        disabled={avatar.isBusy}
        onPress={handleChangeAvatar}
        style={({ pressed }) => [
          styles.avatarButton,
          pressed ? styles.rowPressed : null,
        ]}
        testID="settings-avatar-button"
      >
        <Avatar
          size={profileIconSize}
          testID="settings-avatar"
          uri={avatar.avatarUri}
        />
        {avatar.isBusy ? (
          <View style={styles.avatarBusyOverlay}>
            <ActivityIndicator color={colors.onBrand} size="small" />
          </View>
        ) : (
          <View style={styles.avatarEditBadge}>
            <Ionicons color={colors.onBrand} name="camera" size={14} />
          </View>
        )}
      </Pressable>
      <View style={styles.profileText}>
        <Text variant="bodyStrong" weight="semibold">
          Tu perfil
        </Text>
        <Text
          testID="settings-avatar-status"
          tone={avatar.errorCopy ? 'expense' : 'secondary'}
          variant="footnote"
        >
          {avatar.errorCopy
            ? `${avatar.errorCopy.title}. ${avatar.errorCopy.message}`
            : (avatar.progressLabel ?? 'Toca tu foto para cambiarla')}
        </Text>
      </View>
      {hasSession ? null : (
        <View style={styles.guestBadge}>
          <Text tone="cta" variant="caption" weight="semibold">
            Invitado
          </Text>
        </View>
      )}
    </View>
  );
}

function createStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    profileCard: {
      ...shadows.subtle,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      padding: spacing.lg,
    },
    avatarButton: {
      position: 'relative',
      width: profileIconSize,
      height: profileIconSize,
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
      right: -spacing.xxs,
      bottom: -spacing.xxs,
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
      borderWidth: 2,
      borderColor: colors.surface,
      backgroundColor: colors.brand,
    },
    profileText: {
      minWidth: 0,
      flex: 1,
      gap: spacing.xxs,
    },
    guestBadge: {
      borderRadius: radii.round,
      backgroundColor: colors.ctaSoft,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    rowPressed: {
      opacity: 0.68,
    },
  });
}
