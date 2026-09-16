import Ionicons from '@expo/vector-icons/Ionicons';
import { Fragment, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text/Text';
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
  spaces: readonly Space[];
  storageError?: string | null;
};

const spaceRowHeight = 64,
  spaceIconSize = 36;

export function SpaceSideMenu({
  activeSpaceId,
  isInvitePartnerActive = false,
  onClose,
  onCreateSpace,
  onInvitePartner,
  onOpenSettings,
  onSelectSpace,
  spaces,
  storageError = null,
}: SpaceSideMenuProps) {
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const [isCreating, setCreating] = useState(false);
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
            color={colors.textPrimary}
            name="close"
            size={iconSize.md}
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
            contentContainerStyle={styles.spaceList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.spaceScroll}
          >
            <Text tone="secondary" variant="footnote">
              Elige dónde quieres organizar tus movimientos.
            </Text>
            {orderedSpaces.map((space) => {
              const isActive =
                !isInvitePartnerActive && space.id === activeSpaceId;

              return (
                <Fragment key={space.id}>
                  <Pressable
                    accessibilityLabel={`Seleccionar espacio ${space.name}`}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isActive }}
                    onPress={() => void selectSpace(space.id)}
                    style={({ pressed }) => [
                      styles.spaceRow,
                      isActive && styles.spaceRowActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.spaceIcon}>
                      <Ionicons
                        color={colors.cta}
                        name={
                          space.type === 'personal'
                            ? 'person'
                            : space.type === 'couple'
                              ? 'people'
                              : 'wallet'
                        }
                        size={iconSize.sm}
                      />
                    </View>
                    <View style={styles.spaceName}>
                      <Text numberOfLines={1} variant="label" weight="semibold">
                        {space.name}
                      </Text>
                      {isAwaitingPartnerSpace(space) ? (
                        <Text tone="secondary" variant="footnote">
                          Esperando a que acepten
                        </Text>
                      ) : null}
                    </View>
                    {isActive ? (
                      <Ionicons
                        color={colors.cta}
                        name="checkmark-circle"
                        size={iconSize.md}
                      />
                    ) : null}
                  </Pressable>

                  {space.type === 'personal' && !hasCoupleSpace ? (
                    <Pressable
                      accessibilityHint="Invita a tu pareja a compartir un espacio"
                      accessibilityLabel="Espacio de pareja"
                      accessibilityRole="button"
                      accessibilityState={{ selected: isInvitePartnerActive }}
                      onPress={onInvitePartner}
                      style={({ pressed }) => [
                        styles.coupleSpaceButton,
                        isInvitePartnerActive && styles.spaceRowActive,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={styles.spaceIcon}>
                        <Ionicons
                          color={colors.cta}
                          name="people"
                          size={iconSize.sm}
                        />
                      </View>
                      <Text
                        numberOfLines={1}
                        style={styles.spaceName}
                        variant="label"
                        weight="semibold"
                      >
                        Espacio de pareja
                      </Text>
                      {isInvitePartnerActive ? (
                        <Ionicons
                          color={colors.cta}
                          name="checkmark-circle"
                          size={iconSize.md}
                        />
                      ) : null}
                    </Pressable>
                  ) : null}
                </Fragment>
              );
            })}
            {error ? (
              <Text tone="expense" variant="footnote">
                {error}
              </Text>
            ) : storageError ? (
              <Text tone="expense" variant="footnote">
                {storageError}
              </Text>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              accessibilityHint="Abre la pantalla de ajustes"
              accessibilityRole="button"
              onPress={onOpenSettings}
              style={({ pressed }) => [
                styles.settingsButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                color={colors.textPrimary}
                name="settings-outline"
                size={iconSize.sm}
                testID="settings-menu-icon"
              />
              <Text variant="label" weight="semibold">
                Ajustes
              </Text>
            </Pressable>
          </View>
        </>
      )}
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
      marginBottom: spacing.xl,
      marginTop: spacing.sm,
    },
    iconButton: {
      width: minTouchTarget,
      height: minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
      backgroundColor: colors.surfaceMuted,
    },
    pressed: {
      opacity: 0.68,
    },
    spaceList: {
      gap: spacing.sm,
      paddingBottom: spacing.xl,
    },
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
      backgroundColor: colors.surface,
      borderColor: colors.cta,
    },
    spaceIcon: {
      width: spaceIconSize,
      height: spaceIconSize,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
      backgroundColor: colors.surface,
    },
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
    addSpaceButton: {
      ...shadows.subtle,
      minHeight: minTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.round,
      backgroundColor: colors.surface,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    addSpaceButtonDisabled: {
      opacity: 0.5,
    },
    footer: {
      borderColor: colors.border,
      borderTopWidth: 1,
      paddingTop: spacing.md,
    },
    settingsButton: {
      minHeight: minTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
    },
  });
}
