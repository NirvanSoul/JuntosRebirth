import Ionicons from '@expo/vector-icons/Ionicons';
import { Fragment, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar/Avatar';
import { Text } from '@/components/ui/Text/Text';
import { ProfileEditorModal } from '@/features/profile/components/ProfileEditorModal';
import { SpaceCreationView } from '@/features/spaces/components/SpaceCreationView';
import { isAwaitingPartnerSpace, type Space } from '@/features/spaces/types';
import { iconSize, minTouchTarget } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type SpaceSideMenuProps = {
  activeSpaceId: string;
  isInvitePartnerActive?: boolean;
  onClose: () => void;
  onCreateSpace: (name: string) => Promise<Space>;
  onInvitePartner: () => void;
  onOpenSettings: () => void;
  onSelectSpace: (spaceId: string) => Promise<void>;
  profileAvatarUri?: string | null;
  profileName?: string | null;
  spaces: readonly Space[];
  storageError?: string | null;
};

const spaceRowHeight = 64,
  spaceIconSize = 36,
  profileAvatarSize = 56;

function getSpaceLabel(space: Space): string {
  if (space.type === 'personal') return 'Personal';
  if (space.type === 'couple') return 'Juntos';
  return space.name;
}

export function SpaceSideMenu({
  activeSpaceId,
  isInvitePartnerActive = false,
  onClose,
  onCreateSpace,
  onInvitePartner,
  onOpenSettings,
  onSelectSpace,
  profileAvatarUri = null,
  profileName = null,
  spaces,
  storageError = null,
}: SpaceSideMenuProps) {
  const { colors, isDark, setAppearance, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const [isCreating, setCreating] = useState(false);
  const [isProfileEditorVisible, setProfileEditorVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasCoupleSpace = spaces.some((space) => space.type === 'couple');
  const orderedSpaces = [...spaces].sort((first, second) => {
    const order = { personal: 0, couple: 1, other: 2 };
    return order[first.type] - order[second.type];
  });
  const showSelectionError = () =>
    setError('No pudimos cambiar de espacio. Inténtalo de nuevo.');

  const selectSpace = (spaceId: string) => {
    setError(null);
    return Promise.resolve(onSelectSpace(spaceId))
      .then(onClose)
      .catch(showSelectionError);
  };

  return (
    <SafeAreaView edges={['top', 'bottom', 'left']} style={styles.safeArea}>
      <View style={styles.header}>
        <Text accessibilityRole="header" variant="heading">
          {isCreating ? 'Nuevo espacio' : 'Espacios'}
        </Text>
        <Pressable
          accessibilityLabel="Cerrar menú de espacios"
          accessibilityRole="button"
          hitSlop={spacing.sm}
          onPress={onClose}
          style={({ pressed }) => [
            styles.iconButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <Ionicons
            color={colors.textMuted}
            name="close"
            size={iconSize.md}
            testID="side-menu-close-icon"
          />
        </Pressable>
      </View>

      {isCreating ? (
        <SpaceCreationView
          onCancel={() => setCreating(false)}
          onSubmit={async (createdName) => {
            await onCreateSpace(createdName);
            setCreating(false);
            onClose();
          }}
        />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.menuContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.spaceScroll}
          >
            <View accessibilityRole="radiogroup" style={styles.spaceList}>
              {orderedSpaces.map((space) => {
                const isActive =
                  !isInvitePartnerActive && space.id === activeSpaceId;
                const label = getSpaceLabel(space);

                return (
                  <Fragment key={space.id}>
                    <Pressable
                      accessibilityLabel={`Seleccionar espacio ${label}`}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isActive }}
                      onPress={() => void selectSpace(space.id)}
                      style={({ pressed }) => [
                        styles.spaceRow,
                        isActive && styles.spaceRowActive,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View
                        style={[
                          styles.spaceIcon,
                          isActive && styles.spaceIconActive,
                        ]}
                      >
                        <Ionicons
                          color={isActive ? colors.onBrand : colors.cta}
                          name={
                            space.type === 'personal'
                              ? 'person'
                              : space.type === 'couple'
                                ? 'people'
                                : 'wallet'
                          }
                          size={iconSize.sm}
                          testID={`space-icon-${space.id}`}
                        />
                      </View>
                      <View style={styles.spaceName}>
                        <Text
                          numberOfLines={1}
                          tone={isActive ? 'onBrand' : 'primary'}
                          variant={isActive ? 'subheading' : 'label'}
                          weight="semibold"
                        >
                          {label}
                        </Text>
                        {isAwaitingPartnerSpace(space) ? (
                          <Text
                            tone={isActive ? 'onBrand' : 'secondary'}
                            variant={isActive ? 'subheading' : 'footnote'}
                          >
                            Esperando a que acepten
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>

                    {space.type === 'personal' && !hasCoupleSpace ? (
                      <Pressable
                        accessibilityHint="Invita a tu pareja a compartir un espacio"
                        accessibilityLabel="Seleccionar espacio Juntos"
                        accessibilityRole="button"
                        accessibilityState={{ selected: isInvitePartnerActive }}
                        onPress={onInvitePartner}
                        style={({ pressed }) => [
                          styles.coupleSpaceButton,
                          isInvitePartnerActive && styles.spaceRowActive,
                          pressed && styles.pressed,
                        ]}
                      >
                        <View
                          style={[
                            styles.spaceIcon,
                            isInvitePartnerActive && styles.spaceIconActive,
                          ]}
                        >
                          <Ionicons
                            color={
                              isInvitePartnerActive
                                ? colors.onBrand
                                : colors.cta
                            }
                            name="people"
                            size={iconSize.sm}
                            testID="space-icon-invite-juntos"
                          />
                        </View>
                        <Text
                          numberOfLines={1}
                          style={styles.spaceName}
                          tone={isInvitePartnerActive ? 'onBrand' : 'primary'}
                          variant={
                            isInvitePartnerActive ? 'subheading' : 'label'
                          }
                          weight="semibold"
                        >
                          Juntos
                        </Text>
                      </Pressable>
                    ) : null}
                  </Fragment>
                );
              })}
            </View>
            {error ? (
              <Text tone="expense" variant="footnote">
                {error}
              </Text>
            ) : storageError ? (
              <Text tone="expense" variant="footnote">
                {storageError}
              </Text>
            ) : null}

            <View style={styles.divider} />

            <Pressable
              accessibilityHint="Abre la pantalla de ajustes"
              accessibilityRole="button"
              onPress={onOpenSettings}
              style={({ pressed }) => [
                styles.actionRow,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                color={colors.textPrimary}
                name="settings-outline"
                size={iconSize.sm}
                testID="settings-menu-icon"
              />
              <Text
                style={styles.actionLabel}
                variant="label"
                weight="semibold"
              >
                Ajustes
              </Text>
              <Ionicons
                color={colors.textMuted}
                name="chevron-forward"
                size={iconSize.xs}
              />
            </Pressable>

            <View style={styles.actionRow}>
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={styles.actionIcon}
                testID={`appearance-menu-icon-${isDark ? 'dark' : 'light'}`}
              >
                <Ionicons
                  color={colors.textPrimary}
                  name={isDark ? 'moon-outline' : 'sunny-outline'}
                  size={iconSize.sm}
                />
              </View>
              <Text
                style={styles.actionLabel}
                variant="label"
                weight="semibold"
              >
                Modo oscuro
              </Text>
              <Switch
                accessibilityLabel="Modo oscuro"
                ios_backgroundColor={colors.textMuted}
                onValueChange={(enabled) => {
                  void setAppearance(enabled ? 'dark' : 'light');
                }}
                testID="side-menu-dark-mode-toggle"
                thumbColor={colors.surface}
                trackColor={{ false: colors.textMuted, true: colors.cta }}
                style={styles.themeSwitch}
                value={isDark}
              />
            </View>
          </ScrollView>

          <View style={styles.profileFooter}>
            <Pressable
              accessibilityHint="Abre la edición de tu foto y tu nombre"
              accessibilityLabel="Editar perfil"
              accessibilityRole="button"
              onPress={() => setProfileEditorVisible(true)}
              style={({ pressed }) => [
                styles.profileButton,
                pressed && styles.pressed,
              ]}
              testID="side-menu-profile-button"
            >
              <Avatar
                size={profileAvatarSize}
                testID="side-menu-profile-avatar"
                uri={profileAvatarUri}
              />
              <View style={styles.profileText}>
                <Text numberOfLines={1} variant="bodyStrong" weight="semibold">
                  {profileName?.trim() || 'Tu perfil'}
                </Text>
                <Text tone="secondary" variant="footnote">
                  Editar perfil
                </Text>
              </View>
            </Pressable>
          </View>
        </>
      )}

      <ProfileEditorModal
        onClose={() => setProfileEditorVisible(false)}
        visible={isProfileEditorVisible}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.xl,
    },
    header: {
      minHeight: minTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      marginBottom: spacing.lg,
      marginTop: spacing.sm,
    },
    profileButton: {
      minWidth: 0,
      minHeight: profileAvatarSize,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    profileText: { minWidth: 0, flex: 1 },
    iconButton: {
      width: minTouchTarget,
      height: minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
    },
    pressed: {
      opacity: 0.68,
    },
    menuContent: {
      gap: spacing.sm,
      paddingBottom: spacing.xl,
    },
    spaceList: { gap: spacing.sm },
    spaceScroll: {
      flex: 1,
    },
    spaceRow: {
      minHeight: spaceRowHeight,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    spaceRowActive: {
      ...shadows.none,
      backgroundColor: colors.cta,
      borderColor: 'transparent',
    },
    spaceIcon: {
      width: spaceIconSize,
      height: spaceIconSize,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
      backgroundColor: colors.surface,
    },
    spaceIconActive: { backgroundColor: 'transparent' },
    spaceName: {
      minWidth: 0,
      flex: 1,
    },
    coupleSpaceButton: {
      ...shadows.subtle,
      minHeight: spaceRowHeight,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    divider: {
      borderColor: colors.border,
      borderTopWidth: 1,
      marginVertical: spacing.sm,
    },
    actionRow: {
      minHeight: minTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
    },
    actionLabel: { minWidth: 0, flex: 1 },
    actionIcon: {
      width: iconSize.sm,
      height: iconSize.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeSwitch: {
      marginTop: spacing.sm,
      transform: [{ scale: 0.84 }],
    },
    profileFooter: {
      borderColor: colors.border,
      borderTopWidth: 1,
      paddingTop: spacing.lg,
    },
  });
}
