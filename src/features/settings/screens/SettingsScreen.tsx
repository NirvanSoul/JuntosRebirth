import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  SettingsDivider,
  SettingsRow,
  SettingsSection,
  SettingsToggleRow,
} from '@/components/layout/SettingsList/SettingsList';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import {
  SaveConfirmationToast,
  type SaveConfirmationNotice,
} from '@/components/overlays/SaveConfirmationToast/SaveConfirmationToast';
import { Avatar } from '@/components/ui/Avatar/Avatar';
import { Text } from '@/components/ui/Text/Text';
import { createSupabaseAuthGateway } from '@/features/auth/gateways/supabaseAuthGateway';
import { useAuthSession } from '@/features/auth/hooks/useAuthSession';
import { DataRightsScreen } from '@/features/legal/screens/DataRightsScreen';
import { LegalDocumentScreen } from '@/features/legal/screens/LegalDocumentScreen';
import { PermissionsScreen } from '@/features/legal/screens/PermissionsScreen';
import { PrivacyChoicesScreen } from '@/features/legal/screens/PrivacyChoicesScreen';
import { PrivacyLegalScreen } from '@/features/legal/screens/PrivacyLegalScreen';
import { getLocalProfile } from '@/features/profile/repositories/localProfileRepository';
import { updateProfileAvatar } from '@/features/profile/services/updateProfileAvatar';
import type { AvatarPickSource } from '@/features/profile/types';
import { AuthModal } from '@/features/settings/components/AuthModal';
import { CurrencyPreferencesModal } from '@/features/settings/components/CurrencyPreferencesModal/CurrencyPreferencesModal';
import type { Space } from '@/features/spaces/types';
import { NotificationRulesModal } from '@/features/transactions/components/NotificationRulesModal/NotificationRulesModal';
import type { SaveLocalNotificationRuleInput } from '@/features/transactions/repositories/localTransactionNotificationRuleRepository';
import type { TransactionNotificationRule } from '@/features/transactions/types';
import { getCurrencyName } from '@/lib/currency/currencyCatalog';
import { useOnboardingStatus } from '@/state/onboarding/useOnboardingStatus';
import type { CurrencyPreferences } from '@/state/appPreferences/currencyPreferences';
import { categoryColors } from '@/theme/categoryColors';
import { iconSize, layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type SettingsScreenProps = {
  activeSpaceId: string;
  activeSpaceType: Space['type'];
  currencyPreferences: CurrencyPreferences;
  notificationRules: readonly TransactionNotificationRule[];
  onBack: () => void;
  onDissolveCoupleSpace: () => Promise<void>;
  onSaveCurrencyPreferences: (preferences: CurrencyPreferences) => void;
  onSaveNotificationRule: (
    input: SaveLocalNotificationRuleInput,
  ) => boolean | Promise<boolean>;
  onToggleHomeComparisonIndicators: (enabled: boolean) => void;
  showHomeComparisonIndicators: boolean;
};

type CoupleSpaceDissolutionState =
  | { step: 'idle' }
  | { step: 'confirming' }
  | { step: 'dissolving' }
  | { step: 'error'; message: string };

/** Mismo retraso obligatorio que `DataRightsScreen` antes de habilitar la confirmación destructiva. */
const confirmDissolveCoupleSpaceDelayMs = 5000;
const confirmDissolveCoupleSpaceDelaySeconds =
  confirmDissolveCoupleSpaceDelayMs / 1000;

const profileIconSize = 56;
const developerContactEmail = 'aora.estudio.o@gmail.com';

function showPendingNotice() {
  Alert.alert(
    'Función pendiente',
    'Este ajuste ya tiene su lugar preparado, pero todavía falta implementar su funcionamiento.',
  );
}

export function SettingsScreen({
  activeSpaceId,
  activeSpaceType,
  currencyPreferences,
  notificationRules,
  onBack,
  onDissolveCoupleSpace,
  onSaveCurrencyPreferences,
  onSaveNotificationRule,
  onToggleHomeComparisonIndicators,
  showHomeComparisonIndicators,
}: SettingsScreenProps) {
  const { colors, isDark, setAppearance, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const { session } = useAuthSession();
  const { restartOnboarding } = useOnboardingStatus();
  const [isAuthModalVisible, setAuthModalVisible] = useState(false);
  const [isSigningOut, setSigningOut] = useState(false);
  const [isCurrencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [isNotificationRulesModalVisible, setNotificationRulesModalVisible] =
    useState(false);
  const [isPrivacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [isDataUsageDocVisible, setDataUsageDocVisible] = useState(false);
  const [isPrivacyChoicesVisible, setPrivacyChoicesVisible] = useState(false);
  const [isPermissionsVisible, setPermissionsVisible] = useState(false);
  const [isDataRightsVisible, setDataRightsVisible] = useState(false);
  const [saveConfirmationNotice, setSaveConfirmationNotice] =
    useState<SaveConfirmationNotice | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [coupleDissolution, setCoupleDissolution] =
    useState<CoupleSpaceDissolutionState>({ step: 'idle' });
  const [
    coupleDissolutionSecondsRemaining,
    setCoupleDissolutionSecondsRemaining,
  ] = useState(confirmDissolveCoupleSpaceDelaySeconds);
  const coupleDissolutionProgress = useSharedValue(0);
  const coupleDissolutionProgressStyle = useAnimatedStyle(() => ({
    width: `${coupleDissolutionProgress.value * 100}%`,
  }));
  const nextSaveConfirmationId = useRef(1);
  const currencyValueLabel =
    currencyPreferences.currencies.length > 1
      ? currencyPreferences.currencies.join(' · ')
      : getCurrencyName(currencyPreferences.currencies[0]!);
  const notificationRulesValueLabel = notificationRules.some(
    (rule) => rule.isEnabled,
  )
    ? 'Activadas'
    : 'Desactivadas';

  useEffect(() => {
    let isMounted = true;
    void getLocalProfile().then((profile) => {
      if (isMounted) setAvatarUri(profile.avatarUri);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (coupleDissolution.step !== 'confirming') {
      coupleDissolutionProgress.value = 0;
      return;
    }

    setCoupleDissolutionSecondsRemaining(
      confirmDissolveCoupleSpaceDelaySeconds,
    );
    coupleDissolutionProgress.value = 0;
    coupleDissolutionProgress.value = withTiming(1, {
      duration: confirmDissolveCoupleSpaceDelayMs,
      easing: Easing.linear,
    });

    const intervalId = setInterval(() => {
      setCoupleDissolutionSecondsRemaining((current) =>
        Math.max(0, current - 1),
      );
    }, 1000);

    return () => clearInterval(intervalId);
  }, [coupleDissolution.step, coupleDissolutionProgress]);

  const handlePickAvatar = async (source: AvatarPickSource) => {
    try {
      const profile = await updateProfileAvatar(source);
      if (profile) setAvatarUri(profile.avatarUri);
    } catch {
      Alert.alert(
        'No se pudo actualizar tu foto',
        'Revisa los permisos de cámara o galería en los ajustes del sistema e inténtalo de nuevo.',
      );
    }
  };

  const handleChangeAvatar = () => {
    Alert.alert(
      'Foto de perfil',
      'Para elegir una imagen, Juntoss necesita acceder a tus fotos o a la cámara. Se usará solo como tu foto de perfil.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Tomar foto', onPress: () => void handlePickAvatar('camera') },
        {
          text: 'Elegir de la galería',
          onPress: () => void handlePickAvatar('library'),
        },
      ],
    );
  };

  const showSaveConfirmation = (message: string) => {
    setSaveConfirmationNotice({ id: nextSaveConfirmationId.current, message });
    nextSaveConfirmationId.current += 1;
  };

  const dismissSaveConfirmation = (noticeId: number) => {
    setSaveConfirmationNotice((current) =>
      current?.id === noticeId ? null : current,
    );
  };

  const handleAccountRowPress = () => {
    if (session) {
      Alert.alert(
        'Cerrar sesión',
        '¿Quieres cerrar la sesión de esta cuenta?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Cerrar sesión',
            style: 'destructive',
            onPress: () => void handleSignOut(),
          },
        ],
      );
      return;
    }
    setAuthModalVisible(true);
  };

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setSigningOut(true);
    try {
      await createSupabaseAuthGateway().signOut();
    } catch {
      Alert.alert(
        'No pudimos cerrar sesión',
        'Inténtalo de nuevo en unos momentos.',
      );
    } finally {
      setSigningOut(false);
    }
  };

  const handleContactDeveloper = () => {
    void Clipboard.setStringAsync(developerContactEmail);
    showSaveConfirmation(`Correo copiado: ${developerContactEmail}`);
    void Linking.openURL(`mailto:${developerContactEmail}`);
  };

  const handleReplayOnboarding = () => {
    void restartOnboarding().catch(() => {
      Alert.alert(
        'No pudimos abrir el onboarding',
        'Inténtalo de nuevo en unos momentos.',
      );
    });
  };

  const handleConfirmDissolveCoupleSpace = () => {
    if (coupleDissolutionSecondsRemaining > 0) return;

    setCoupleDissolution({ step: 'dissolving' });
    void onDissolveCoupleSpace().catch(() => {
      setCoupleDissolution({
        step: 'error',
        message: 'No pudimos eliminar el espacio juntos. Inténtalo de nuevo.',
      });
    });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        testID="settings-screen"
      >
        <View style={styles.header} testID="settings-header">
          <Pressable
            accessibilityLabel="Volver"
            accessibilityRole="button"
            hitSlop={spacing.sm}
            onPress={onBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed ? styles.rowPressed : null,
            ]}
          >
            <Ionicons
              color={colors.textPrimary}
              name="arrow-back"
              size={iconSize.md}
              style={styles.backGlyphEmphasized}
              testID="settings-back-icon"
            />
          </Pressable>
          <Text
            accessibilityRole="header"
            testID="settings-title"
            variant="heading"
          >
            Ajustes
          </Text>
        </View>

        <View style={styles.profileCard}>
          <Pressable
            accessibilityLabel="Cambiar foto de perfil"
            accessibilityRole="button"
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
              uri={avatarUri}
            />
            <View style={styles.avatarEditBadge}>
              <Ionicons color={colors.onBrand} name="camera" size={14} />
            </View>
          </Pressable>
          <View style={styles.profileText}>
            <Text variant="bodyStrong" weight="semibold">
              Tu perfil
            </Text>
            <Text tone="secondary" variant="footnote">
              Toca tu foto para cambiarla
            </Text>
          </View>
          {session ? null : (
            <View style={styles.guestBadge}>
              <Text tone="cta" variant="caption" weight="semibold">
                Invitado
              </Text>
            </View>
          )}
        </View>

        <SettingsSection
          emphasizeIcon={false}
          icon="person-circle-outline"
          title="Cuenta"
        >
          <SettingsRow
            icon={session ? 'log-out-outline' : 'log-in-outline'}
            iconBackgroundColor={categoryColors.blue}
            label={session ? 'Cerrar sesión' : 'Iniciar sesión o crear cuenta'}
            onPress={handleAccountRowPress}
            value={session?.user.email ?? undefined}
          />
        </SettingsSection>

        <SettingsSection
          emphasizeIcon={false}
          icon="options-outline"
          title="Preferencias"
        >
          <SettingsRow
            icon="cash-outline"
            iconBackgroundColor={categoryColors.green}
            label="Moneda"
            onPress={() => setCurrencyModalVisible(true)}
            value={currencyValueLabel}
          />
          <SettingsDivider />
          <SettingsToggleRow
            description="Compara con el mes anterior"
            enabled={showHomeComparisonIndicators}
            icon="trending-up-outline"
            iconBackgroundColor={categoryColors.green}
            label="Comparación en Inicio"
            onToggle={onToggleHomeComparisonIndicators}
            testID="home-comparison-toggle"
          />
          <SettingsDivider />
          <SettingsRow
            icon="language-outline"
            iconBackgroundColor={categoryColors.blue}
            label="Idioma"
            onPress={showPendingNotice}
            pending
            value="Español"
          />
          <SettingsDivider />
          <SettingsToggleRow
            description="Usa una interfaz oscura"
            enabled={isDark}
            icon="moon-outline"
            iconBackgroundColor={categoryColors.blue}
            label="Modo oscuro"
            onToggle={(enabled) => {
              void setAppearance(enabled ? 'dark' : 'light');
            }}
            testID="dark-mode-toggle"
          />
        </SettingsSection>

        <SettingsSection icon="notifications-outline" title="Notificaciones">
          <SettingsRow
            icon="alarm-outline"
            iconBackgroundColor={categoryColors.pink}
            label="Recordatorios y alertas"
            onPress={() => setNotificationRulesModalVisible(true)}
            value={notificationRulesValueLabel}
          />
        </SettingsSection>

        <SettingsSection icon="lock-closed-outline" title="Datos y privacidad">
          <SettingsRow
            icon="phone-portrait-outline"
            iconBackgroundColor={categoryColors.violet}
            label="Estado de los datos"
            onPress={() => setDataRightsVisible(true)}
            value="Guardados en este dispositivo"
          />
          <SettingsDivider />
          <SettingsRow
            icon="document-text-outline"
            iconBackgroundColor={categoryColors.violet}
            label="Cómo usamos tus datos"
            onPress={() => setDataUsageDocVisible(true)}
          />
          <SettingsDivider />
          <SettingsRow
            icon="options-outline"
            iconBackgroundColor={categoryColors.green}
            label="Preferencias de privacidad"
            onPress={() => setPrivacyChoicesVisible(true)}
          />
          <SettingsDivider />
          <SettingsRow
            icon="key-outline"
            iconBackgroundColor={categoryColors.blue}
            label="Permisos de la aplicación"
            onPress={() => setPermissionsVisible(true)}
          />
        </SettingsSection>

        {activeSpaceType === 'couple' ? (
          <SettingsSection icon="people-outline" title="Espacio de pareja">
            <SettingsRow
              destructive
              icon="trash-outline"
              iconBackgroundColor={categoryColors.red}
              label="Eliminar espacio juntos"
              onPress={() => setCoupleDissolution({ step: 'confirming' })}
            />
          </SettingsSection>
        ) : null}

        {activeSpaceType === 'couple' &&
        coupleDissolution.step === 'confirming' ? (
          <View style={styles.warningCard}>
            <Text tone="expense" variant="bodyStrong" weight="semibold">
              Esta acción no se puede deshacer
            </Text>
            <Text tone="secondary" variant="label">
              El espacio juntos se eliminará para ambas personas. Los
              movimientos y categorías compartidos se conservan, pero dejarán de
              estar disponibles desde este espacio.
            </Text>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[styles.progressFill, coupleDissolutionProgressStyle]}
              />
            </View>
            <View style={styles.actionsRow}>
              <ModalPrimaryAction
                accessibilityLabel="Cancelar eliminación del espacio juntos"
                label="Cancelar"
                onPress={() => setCoupleDissolution({ step: 'idle' })}
                style={styles.actionButton}
                variant="surface"
              />
              <ModalPrimaryAction
                accessibilityLabel={
                  coupleDissolutionSecondsRemaining > 0
                    ? `Espera ${coupleDissolutionSecondsRemaining} segundos para confirmar la eliminación`
                    : 'Confirmar eliminación del espacio juntos'
                }
                disabled={coupleDissolutionSecondsRemaining > 0}
                label={
                  coupleDissolutionSecondsRemaining > 0
                    ? `Espera (${coupleDissolutionSecondsRemaining})`
                    : 'Sí, eliminar'
                }
                onPress={handleConfirmDissolveCoupleSpace}
                style={[styles.actionButton, styles.destructiveButton]}
                testID="confirm-couple-space-dissolution"
                variant="cta"
              />
            </View>
          </View>
        ) : null}

        {activeSpaceType === 'couple' && coupleDissolution.step === 'error' ? (
          <Text tone="expense" variant="footnote">
            {coupleDissolution.message}
          </Text>
        ) : null}

        <SettingsSection icon="help-circle-outline" title="Ayuda">
          <SettingsRow
            icon="play-outline"
            iconBackgroundColor={categoryColors.green}
            label="Ver onboarding"
            onPress={handleReplayOnboarding}
          />
          <SettingsDivider />
          <SettingsRow
            icon="mail-outline"
            iconBackgroundColor={categoryColors.amber}
            label="Contactar con el desarrollador"
            onPress={handleContactDeveloper}
          />
          <SettingsDivider />
          <SettingsRow
            icon="document-text-outline"
            iconBackgroundColor={categoryColors.violet}
            label="Política de privacidad"
            onPress={() => setPrivacyModalVisible(true)}
          />
        </SettingsSection>

        <Text align="center" tone="muted" variant="caption">
          juntoss 0.1.0
        </Text>
      </ScrollView>

      <AuthModal
        onClose={() => setAuthModalVisible(false)}
        visible={isAuthModalVisible}
      />

      <CurrencyPreferencesModal
        onClose={() => setCurrencyModalVisible(false)}
        onSave={(next) => {
          onSaveCurrencyPreferences(next);
          setCurrencyModalVisible(false);
        }}
        preferences={currencyPreferences}
        visible={isCurrencyModalVisible}
      />

      <NotificationRulesModal
        onClose={() => setNotificationRulesModalVisible(false)}
        onSave={onSaveNotificationRule}
        onSaved={() =>
          showSaveConfirmation('Recordatorios y alertas actualizados.')
        }
        rules={notificationRules}
        spaceId={activeSpaceId}
        visible={isNotificationRulesModalVisible}
      />

      <SaveConfirmationToast
        notice={saveConfirmationNotice}
        onDismiss={dismissSaveConfirmation}
      />

      <PrivacyLegalScreen
        onClose={() => setPrivacyModalVisible(false)}
        visible={isPrivacyModalVisible}
      />

      <LegalDocumentScreen
        documentId="privacy-policy"
        onClose={() => setDataUsageDocVisible(false)}
        visible={isDataUsageDocVisible}
      />

      <PrivacyChoicesScreen
        onClose={() => setPrivacyChoicesVisible(false)}
        visible={isPrivacyChoicesVisible}
      />

      <PermissionsScreen
        onClose={() => setPermissionsVisible(false)}
        visible={isPermissionsVisible}
      />

      <DataRightsScreen
        onClose={() => setDataRightsVisible(false)}
        visible={isDataRightsVisible}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.huge,
    },
    header: {
      minHeight: layout.minTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: spacing.sm,
      marginBottom: spacing.xl,
      marginTop: spacing.sm,
    },
    backButton: {
      width: layout.minTouchTarget,
      height: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backGlyphEmphasized: {
      textShadowColor: colors.textPrimary,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 0.45,
    },
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
    warningCard: {
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    progressTrack: {
      height: 4,
      borderRadius: radii.round,
      backgroundColor: colors.border,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: radii.round,
      backgroundColor: categoryColors.red,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    actionButton: { flex: 1 },
    destructiveButton: { backgroundColor: categoryColors.red },
  });
}
