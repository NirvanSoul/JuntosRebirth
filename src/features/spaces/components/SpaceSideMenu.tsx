import Ionicons from '@expo/vector-icons/Ionicons';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar/Avatar';
import { Text } from '@/components/ui/Text/Text';
import { ProfileEditorModal } from '@/features/profile/components/ProfileEditorModal';
import { SideMenuLinkRow } from '@/features/spaces/components/SideMenuLinkRow';
import { SpaceCreationView } from '@/features/spaces/components/SpaceCreationView';
import { SpaceMenuRow } from '@/features/spaces/components/SpaceMenuRow';
import {
  SpaceSelectionPill,
  type SpaceRowLayout,
} from '@/features/spaces/components/SpaceSelectionPill';
import { isAwaitingPartnerSpace, type Space } from '@/features/spaces/types';
import {
  getSpaceLabel,
  sortSpacesForMenu,
} from '@/features/spaces/utils/spaceMenuLabels';
import { iconSize, minTouchTarget } from '@/theme/layout';
import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type SpaceSideMenuProps = {
  activeSpaceId: string;
  isInvitePartnerActive?: boolean;
  onClose: () => void;
  onCreateSpace: (name: string) => Promise<Space>;
  onInvitePartner: () => Promise<void> | void;
  onOpenSettings: () => void;
  onSelectSpace: (spaceId: string) => Promise<void>;
  profileAvatarUri?: string | null;
  profileName?: string | null;
  spaces: readonly Space[];
  storageError?: string | null;
};

const profileAvatarSize = 56,
  inviteSelectionKey = 'invite-juntos';

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
  const { colors, isDark, setAppearance } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [isCreating, setCreating] = useState(false);
  const [isProfileEditorVisible, setProfileEditorVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasCoupleSpace = spaces.some((space) => space.type === 'couple');
  const orderedSpaces = useMemo(() => sortSpacesForMenu(spaces), [spaces]);
  const committedKey = isInvitePartnerActive
    ? inviteSelectionKey
    : activeSpaceId;
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const transitionTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const selectedKey = pendingKey ?? committedKey;
  const [rowLayouts, setRowLayouts] = useState<Record<string, SpaceRowLayout>>(
    {},
  );

  const storeRowLayout = (key: string, { height, y }: SpaceRowLayout) =>
    setRowLayouts((current) =>
      current[key]?.y === y && current[key]?.height === height
        ? current
        : { ...current, [key]: { height, y } },
    );

  useEffect(() => {
    const timers = transitionTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const cancelScheduled = () => {
    transitionTimers.current.forEach(clearTimeout);
    transitionTimers.current = [];
  };
  const schedule = (callback: () => void, delay: number) => {
    transitionTimers.current.push(setTimeout(callback, delay));
  };

  /**
   * Desliza la píldora al botón elegido y, a la vez, pinta el espacio nuevo
   * detrás del menú; al asentarse la píldora el menú se retira y ya se ve la
   * entrada del espacio nuevo, sin rastro del anterior. Un toque nuevo antes
   * de cerrar sustituye al anterior: nunca se ignora.
   */
  const transitionTo = (key: string, commit: () => Promise<void> | void) => {
    cancelScheduled();
    if (key === committedKey) {
      setPendingKey(null);
      onClose();
      return;
    }

    setError(null);
    setPendingKey(key);
    let failed = false;
    // Un turno después del toque, para que la píldora arranque antes de que
    // el repintado del espacio nuevo ocupe el hilo de JS.
    schedule(() => {
      Promise.resolve()
        .then(commit)
        .catch(() => {
          failed = true;
          setError('No pudimos cambiar de espacio. Inténtalo de nuevo.');
        })
        // Se suelta al terminar, haya cambiado o no el padre: una selección
        // colgada dejaría la píldora en un espacio que no es el activo.
        .finally(() =>
          setPendingKey((current) => (current === key ? null : current)),
        );
    }, 0);
    // Si falló, el menú sigue abierto para que se lea el aviso.
    schedule(() => {
      if (!failed) onClose();
    }, motion.spaceSelectionDuration);
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
              <SpaceSelectionPill layout={rowLayouts[selectedKey] ?? null} />
              {orderedSpaces.map((space) => {
                const label = getSpaceLabel(space);

                return (
                  <Fragment key={space.id}>
                    <SpaceMenuRow
                      accessibilityLabel={`Seleccionar espacio ${label}`}
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked: selectedKey === space.id,
                      }}
                      active={selectedKey === space.id}
                      iconName={
                        space.type === 'personal'
                          ? 'person'
                          : space.type === 'couple'
                            ? 'people'
                            : 'wallet'
                      }
                      iconTestID={`space-icon-${space.id}`}
                      label={label}
                      onLayout={(event) =>
                        storeRowLayout(space.id, event.nativeEvent.layout)
                      }
                      onPress={() =>
                        transitionTo(space.id, () => onSelectSpace(space.id))
                      }
                      subtitle={
                        isAwaitingPartnerSpace(space)
                          ? 'Esperando a que acepten'
                          : null
                      }
                    />

                    {space.type === 'personal' && !hasCoupleSpace ? (
                      <SpaceMenuRow
                        accessibilityHint="Invita a tu pareja a compartir un espacio"
                        accessibilityLabel="Seleccionar espacio Juntos"
                        accessibilityRole="button"
                        accessibilityState={{
                          selected: selectedKey === inviteSelectionKey,
                        }}
                        active={selectedKey === inviteSelectionKey}
                        iconName="people"
                        iconTestID="space-icon-invite-juntos"
                        label="Juntos"
                        onLayout={(event) =>
                          storeRowLayout(
                            inviteSelectionKey,
                            event.nativeEvent.layout,
                          )
                        }
                        onPress={() =>
                          transitionTo(inviteSelectionKey, onInvitePartner)
                        }
                        raised
                      />
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

            <SideMenuLinkRow
              accessibilityHint="Abre la pantalla de ajustes"
              iconName="settings-outline"
              iconTestID="settings-menu-icon"
              label="Ajustes"
              onPress={onOpenSettings}
            />
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

function createStyles(colors: ColorTokens) {
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
