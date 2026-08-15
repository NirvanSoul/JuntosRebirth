import Ionicons from '@expo/vector-icons/Ionicons';
import { Fragment, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text/Text';
import { isAwaitingPartnerSpace, type Space } from '@/features/spaces/types';
import { fontFamily } from '@/theme/fonts';
import { iconSize, minTouchTarget } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { typography } from '@/theme/typography';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type SpaceSideMenuProps = {
  activeSpaceId: string;
  onClose: () => void;
  onCreateSpace: (name: string) => Promise<Space>;
  onInvitePartner: () => void;
  onOpenSettings: () => void;
  onSelectSpace: (spaceId: string) => Promise<void>;
  spaces: readonly Space[];
  storageError?: string | null;
};

const spaceRowHeight = 64;
const spaceIconSize = 36;

export function SpaceSideMenu({
  activeSpaceId,
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
  const [isSaving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const hasCoupleSpace = spaces.some((space) => space.type === 'couple');

  const cancelCreation = () => {
    setCreating(false);
    setName('');
    setError(null);
  };

  const submitSpace = async () => {
    if (isSaving) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onCreateSpace(name);
      cancelCreation();
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No pudimos crear el espacio.',
      );
    } finally {
      setSaving(false);
    }
  };

  const selectSpace = async (spaceId: string) => {
    setError(null);
    try {
      await onSelectSpace(spaceId);
      onClose();
    } catch {
      setError('No pudimos cambiar de espacio. Inténtalo de nuevo.');
    }
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
        <View style={styles.createContent}>
          <Text tone="secondary" variant="body">
            Ponle un nombre que te ayude a reconocer este espacio.
          </Text>
          <View style={styles.field}>
            <Text variant="label" weight="semibold">
              Nombre
            </Text>
            <TextInput
              accessibilityLabel="Nombre del nuevo espacio"
              autoCapitalize="sentences"
              autoCorrect={false}
              maxLength={40}
              onChangeText={setName}
              placeholder="Por ejemplo, Casa"
              placeholderTextColor={colors.textMuted}
              returnKeyType="done"
              style={styles.input}
              value={name}
            />
            {error ? (
              <Text tone="expense" variant="footnote">
                {error}
              </Text>
            ) : null}
          </View>
          <View style={styles.createActions}>
            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={cancelCreation}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text variant="label" weight="semibold">
                Cancelar
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isSaving }}
              disabled={isSaving}
              onPress={() => void submitSpace()}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed ? styles.primaryPressed : null,
              ]}
            >
              {isSaving ? (
                <ActivityIndicator color={colors.onBrand} />
              ) : (
                <Text tone="onBrand" variant="label" weight="semibold">
                  Crear espacio
                </Text>
              )}
            </Pressable>
          </View>
        </View>
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
            {spaces.map((space) => {
              const isActive = space.id === activeSpaceId;

              return (
                <Fragment key={space.id}>
                  <Pressable
                    accessibilityLabel={`Seleccionar espacio ${space.name}`}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isActive }}
                    onPress={() => void selectSpace(space.id)}
                    style={({ pressed }) => [
                      styles.spaceRow,
                      isActive ? styles.spaceRowActive : null,
                      pressed ? styles.pressed : null,
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
                      onPress={onInvitePartner}
                      style={({ pressed }) => [
                        styles.coupleSpaceButton,
                        pressed ? styles.pressed : null,
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
                pressed ? styles.pressed : null,
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
    createContent: {
      flex: 1,
      gap: spacing.xl,
    },
    field: {
      gap: spacing.sm,
    },
    input: {
      minHeight: minTouchTarget,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      fontFamily: fontFamily.light,
      fontSize: typography.body.fontSize,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    createActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: 'auto',
      paddingBottom: spacing.lg,
    },
    secondaryButton: {
      minHeight: minTouchTarget,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.round,
    },
    primaryButton: {
      minHeight: minTouchTarget,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
      backgroundColor: colors.cta,
    },
    primaryPressed: {
      backgroundColor: colors.ctaPressed,
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
