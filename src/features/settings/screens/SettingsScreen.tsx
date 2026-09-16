import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { Alarm } from 'phosphor-react-native/src/icons/Alarm';
import { ChartLineUp } from 'phosphor-react-native/src/icons/ChartLineUp';
import { Coins } from 'phosphor-react-native/src/icons/Coins';
import { DeviceMobile } from 'phosphor-react-native/src/icons/DeviceMobile';
import { FileText } from 'phosphor-react-native/src/icons/FileText';
import { Key } from 'phosphor-react-native/src/icons/Key';
import { MapPin } from 'phosphor-react-native/src/icons/MapPin';
import { MoonStars } from 'phosphor-react-native/src/icons/MoonStars';
import { SlidersHorizontal } from 'phosphor-react-native/src/icons/SlidersHorizontal';
import { Trash } from 'phosphor-react-native/src/icons/Trash';
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
import { GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  SettingsDivider,
  SettingsRow,
  SettingsSection,
  SettingsToggleRow,
} from '@/components/layout/SettingsList/SettingsList';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import {
  NoticeToast,
  type ToastNotice,
} from '@/components/overlays/NoticeToast/NoticeToast';
import { Text } from '@/components/ui/Text/Text';
import { createJuntossAuthGateway } from '@/features/auth/gateways/juntossAuthGateway';
import { useAuthSession } from '@/features/auth/hooks/useAuthSession';
import { discardBackedLocalSessionCache } from '@/features/auth/services/discardBackedLocalSessionCache';
import { DataRightsScreen } from '@/features/legal/screens/DataRightsScreen';
import { LegalDocumentScreen } from '@/features/legal/screens/LegalDocumentScreen';
import { PermissionsScreen } from '@/features/legal/screens/PermissionsScreen';
import { PrivacyChoicesScreen } from '@/features/legal/screens/PrivacyChoicesScreen';
import { PrivacyLegalScreen } from '@/features/legal/screens/PrivacyLegalScreen';
import { useOnboardingRestart } from '@/features/onboarding/context/OnboardingRestartContext';
import { CountryPreferencesModal } from '@/features/settings/components/CountryPreferencesModal/CountryPreferencesModal';
import { CountryChangeBlockedModal } from '@/features/settings/components/CountryPreferencesModal/CountryChangeBlockedModal';
import { CountryChangeSharedSpaceWarningModal } from '@/features/settings/components/CountryPreferencesModal/CountryChangeSharedSpaceWarningModal';
import { SettingsHelpSection } from '@/features/settings/components/SettingsHelpSection/SettingsHelpSection';
import { saveCountryChangeNotice } from '@/features/spaces/repositories/countryChangeNoticeRepository';
import { ProfileHeader } from '@/features/settings/components/ProfileHeader/ProfileHeader';
import { CurrencyPreferencesModal } from '@/features/settings/components/CurrencyPreferencesModal/CurrencyPreferencesModal';
import { useSettingsBackSwipe } from '@/features/settings/hooks/useSettingsBackSwipe';
import { useProfileCountry } from '@/features/profile/hooks/useProfileCountry';
import type { Space } from '@/features/spaces/types';
import { NotificationRulesModal } from '@/features/transactions/components/NotificationRulesModal/NotificationRulesModal';
import type { SaveLocalNotificationRuleInput } from '@/features/transactions/repositories/localTransactionNotificationRuleRepository';
import type { TransactionNotificationRule } from '@/features/transactions/types';
import { getCurrencyName } from '@/lib/currency/currencyCatalog';
import { getCountryByIso2 } from '@/lib/geography/countryCatalog';
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
  hasSharedSpace?: boolean;
  currencyPreferences: CurrencyPreferences;
  notificationRules: readonly TransactionNotificationRule[];
  onBack: () => void;
  onCountryChanged?: () => Promise<void>;
  onLeaveCoupleSpace: () => Promise<void>;
  onSaveCurrencyPreferences: (preferences: CurrencyPreferences) => void;
  onSaveNotificationRule: (
    input: SaveLocalNotificationRuleInput,
  ) => boolean | Promise<boolean>;
  onToggleHomeComparisonIndicators: (enabled: boolean) => void;
  showHomeComparisonIndicators: boolean;
};

type CoupleSpaceExitState =
  | { step: 'idle' }
  | { step: 'confirming' }
  | { step: 'leaving' }
  | { step: 'error'; message: string };

/** Mismo retraso obligatorio que `DataRightsScreen` antes de habilitar la confirmación destructiva. */
const confirmLeaveCoupleSpaceDelayMs = 5000;
const confirmLeaveCoupleSpaceDelaySeconds =
  confirmLeaveCoupleSpaceDelayMs / 1000;

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
  hasSharedSpace = false,
  currencyPreferences,
  notificationRules,
  onBack,
  onCountryChanged,
  onLeaveCoupleSpace,
  onSaveCurrencyPreferences,
  onSaveNotificationRule,
  onToggleHomeComparisonIndicators,
  showHomeComparisonIndicators,
}: SettingsScreenProps) {
  const { colors, isDark, setAppearance, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const { session } = useAuthSession();
  const resetOnboarding = useOnboardingRestart();
  const {
    countryCode,
    error: countryError,
    isSaving: isSavingCountry,
    saveCountry,
  } = useProfileCountry();
  const [isSigningOut, setSigningOut] = useState(false);
  const [isCurrencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [isCountryModalVisible, setCountryModalVisible] = useState(false);
  const [isCountryChangeBlockedVisible, setCountryChangeBlockedVisible] =
    useState(false);
  const [pendingCountryChange, setPendingCountryChange] = useState<
    string | null
  >(null);
  const [isNotificationRulesModalVisible, setNotificationRulesModalVisible] =
    useState(false);
  const [isPrivacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [isDataUsageDocVisible, setDataUsageDocVisible] = useState(false);
  const [isPrivacyChoicesVisible, setPrivacyChoicesVisible] = useState(false);
  const [isPermissionsVisible, setPermissionsVisible] = useState(false);
  const [isDataRightsVisible, setDataRightsVisible] = useState(false);
  const [saveConfirmationNotice, setSaveConfirmationNotice] =
    useState<ToastNotice | null>(null);
  const [coupleSpaceExit, setCoupleSpaceExit] = useState<CoupleSpaceExitState>({
    step: 'idle',
  });
  const [coupleSpaceExitSecondsRemaining, setCoupleSpaceExitSecondsRemaining] =
    useState(confirmLeaveCoupleSpaceDelaySeconds);
  const coupleSpaceExitProgress = useSharedValue(0);
  const coupleSpaceExitProgressStyle = useAnimatedStyle(() => ({
    width: `${coupleSpaceExitProgress.value * 100}%`,
  }));
  const nextSaveConfirmationId = useRef(1);
  const isVenezuela = countryCode === 'VE';
  const currencyValueLabel = isVenezuela
    ? 'USD · VES'
    : currencyPreferences.currencies.length > 1
      ? currencyPreferences.currencies.join(' · ')
      : getCurrencyName(currencyPreferences.currencies[0]!);
  const countryValueLabel = countryCode
    ? (getCountryByIso2(countryCode)?.name ?? countryCode)
    : 'Sin elegir';
  const notificationRulesValueLabel = notificationRules.some(
    (rule) => rule.isEnabled,
  )
    ? 'Activadas'
    : 'Desactivadas';
  const backSwipeGesture = useSettingsBackSwipe(onBack);

  useEffect(() => {
    if (coupleSpaceExit.step !== 'confirming') {
      coupleSpaceExitProgress.value = 0;
      return;
    }

    // Este efecto arranca el `setInterval` y la animación de progreso; el
    // reinicio del contador va junto a eso, no es un derivado puro.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCoupleSpaceExitSecondsRemaining(confirmLeaveCoupleSpaceDelaySeconds);
    coupleSpaceExitProgress.value = 0;
    coupleSpaceExitProgress.value = withTiming(1, {
      duration: confirmLeaveCoupleSpaceDelayMs,
      easing: Easing.linear,
    });

    const intervalId = setInterval(() => {
      setCoupleSpaceExitSecondsRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [coupleSpaceExit.step, coupleSpaceExitProgress]);

  const showSaveConfirmation = (message: string) => {
    setSaveConfirmationNotice({
      id: nextSaveConfirmationId.current,
      message,
      tone: 'success',
    });
    nextSaveConfirmationId.current += 1;
  };

  const dismissSaveConfirmation = (noticeId: number) => {
    setSaveConfirmationNotice((current) =>
      current?.id === noticeId ? null : current,
    );
  };

  const saveSelectedCountry = async (next: string) => {
    const result = await saveCountry(next);
    if (result.success) {
      if (hasSharedSpace && next !== countryCode && session) {
        await saveCountryChangeNotice(session.user.id, {
          previousCountryName: countryCode
            ? countryValueLabel
            : 'tu país anterior',
        }).catch(() => undefined);
      }
      // El país ya cambió en el servidor: recargar el contexto financiero es
      // una puesta al día del dispositivo, no parte del guardado. El modal se
      // mantiene encima mientras tanto para no enseñar los datos del país
      // anterior, y se cierra pase lo que pase. Sin este `catch`, un fallo de
      // red dejaría el modal abierto sin explicación y escaparía como rechazo
      // sin capturar, porque los dos llamadores invocan esto con `void`.
      try {
        await onCountryChanged?.();
      } catch (error) {
        console.error(
          '[settings] No se pudo recargar el contexto financiero:',
          error,
        );
      } finally {
        setCountryModalVisible(false);
      }
    } else if (result.errorCode === 'country_change_blocked_by_shared_space') {
      setCountryModalVisible(false);
      setCountryChangeBlockedVisible(true);
    }
  };

  const handleAccountRowPress = () => {
    Alert.alert('Cerrar sesión', '¿Quieres cerrar la sesión de esta cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: () => void handleSignOut(),
      },
    ]);
  };

  const handleSignOut = async (afterSignOut?: () => Promise<void>) => {
    if (isSigningOut) return;
    setSigningOut(true);
    try {
      await createJuntossAuthGateway().signOut();
      await Promise.all([discardBackedLocalSessionCache()]).catch(
        (error: unknown) => {
          console.error(
            '[Settings] No se pudo limpiar la sesión local:',
            error,
          );
        },
      );
      await afterSignOut?.();
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

  const handleConfirmLeaveCoupleSpace = () => {
    if (coupleSpaceExitSecondsRemaining > 0) return;

    setCoupleSpaceExit({ step: 'leaving' });
    void onLeaveCoupleSpace().catch(() => {
      setCoupleSpaceExit({
        step: 'error',
        message: 'No pudimos salir del espacio de pareja. Inténtalo de nuevo.',
      });
    });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <GestureDetector gesture={backSwipeGesture}>
        <View style={styles.screenContent}>
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

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            testID="settings-screen"
          >
            <ProfileHeader />

            <SettingsSection
              emphasizeIcon={false}
              icon="person-circle-outline"
              title="Cuenta"
            >
              <SettingsRow
                icon="log-out-outline"
                iconBackgroundColor={categoryColors.blue}
                label="Cerrar sesión"
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
                iconComponent={Coins}
                iconBackgroundColor={categoryColors.green}
                label="Moneda"
                onPress={
                  isVenezuela ? undefined : () => setCurrencyModalVisible(true)
                }
                value={currencyValueLabel}
              />
              <SettingsDivider />
              <SettingsRow
                iconComponent={MapPin}
                iconBackgroundColor={categoryColors.blue}
                label="País"
                onPress={() => setCountryModalVisible(true)}
                value={countryValueLabel}
              />
              <SettingsDivider />
              <SettingsToggleRow
                description="Compara con el mes anterior"
                enabled={showHomeComparisonIndicators}
                iconComponent={ChartLineUp}
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
                iconComponent={MoonStars}
                iconBackgroundColor={categoryColors.blue}
                label="Modo oscuro"
                onToggle={(enabled) => {
                  void setAppearance(enabled ? 'dark' : 'light');
                }}
                testID="dark-mode-toggle"
              />
            </SettingsSection>

            <SettingsSection
              icon="notifications-outline"
              title="Notificaciones"
            >
              <SettingsRow
                iconComponent={Alarm}
                iconBackgroundColor={categoryColors.pink}
                label="Recordatorios y alertas"
                onPress={() => setNotificationRulesModalVisible(true)}
                value={notificationRulesValueLabel}
              />
            </SettingsSection>

            <SettingsSection
              icon="lock-closed-outline"
              title="Datos y privacidad"
            >
              <SettingsRow
                iconComponent={DeviceMobile}
                iconBackgroundColor={categoryColors.violet}
                label="Estado de los datos"
                onPress={() => setDataRightsVisible(true)}
                value="Guardados en este dispositivo"
              />
              <SettingsDivider />
              <SettingsRow
                iconComponent={FileText}
                iconBackgroundColor={categoryColors.violet}
                label="Cómo usamos tus datos"
                onPress={() => setDataUsageDocVisible(true)}
              />
              <SettingsDivider />
              <SettingsRow
                iconComponent={SlidersHorizontal}
                iconBackgroundColor={categoryColors.green}
                label="Preferencias de privacidad"
                onPress={() => setPrivacyChoicesVisible(true)}
              />
              <SettingsDivider />
              <SettingsRow
                iconComponent={Key}
                iconBackgroundColor={categoryColors.blue}
                label="Permisos de la aplicación"
                onPress={() => setPermissionsVisible(true)}
              />
            </SettingsSection>

            {activeSpaceType === 'couple' ? (
              <SettingsSection icon="people-outline" title="Espacio de pareja">
                <SettingsRow
                  destructive
                  iconComponent={Trash}
                  iconBackgroundColor={categoryColors.red}
                  label="Salir del espacio de pareja"
                  onPress={() => setCoupleSpaceExit({ step: 'confirming' })}
                />
              </SettingsSection>
            ) : null}

            {activeSpaceType === 'couple' &&
            coupleSpaceExit.step === 'confirming' ? (
              <View style={styles.warningCard}>
                <Text tone="expense" variant="bodyStrong" weight="semibold">
                  Saldrás de este espacio
                </Text>
                <Text tone="secondary" variant="label">
                  Dejarás de tener acceso a sus movimientos y categorías. Si
                  ambas personas salen, el espacio se eliminará automáticamente.
                </Text>
                <View style={styles.progressTrack}>
                  <Animated.View
                    style={[styles.progressFill, coupleSpaceExitProgressStyle]}
                  />
                </View>
                <View style={styles.actionsRow}>
                  <ModalPrimaryAction
                    accessibilityLabel="Cancelar salida del espacio de pareja"
                    label="Cancelar"
                    onPress={() => setCoupleSpaceExit({ step: 'idle' })}
                    style={styles.actionButton}
                    variant="surface"
                  />
                  <ModalPrimaryAction
                    accessibilityLabel={
                      coupleSpaceExitSecondsRemaining > 0
                        ? `Espera ${coupleSpaceExitSecondsRemaining} segundos para confirmar la salida`
                        : 'Confirmar salida del espacio de pareja'
                    }
                    disabled={coupleSpaceExitSecondsRemaining > 0}
                    label={
                      coupleSpaceExitSecondsRemaining > 0
                        ? `Espera (${coupleSpaceExitSecondsRemaining})`
                        : 'Sí, salir'
                    }
                    onPress={handleConfirmLeaveCoupleSpace}
                    style={[styles.actionButton, styles.destructiveButton]}
                    testID="confirm-couple-space-exit"
                    variant="cta"
                  />
                </View>
              </View>
            ) : null}

            {activeSpaceType === 'couple' &&
            coupleSpaceExit.step === 'error' ? (
              <Text tone="expense" variant="footnote">
                {coupleSpaceExit.message}
              </Text>
            ) : null}

            <SettingsHelpSection
              onContactDeveloper={handleContactDeveloper}
              onOpenPrivacy={() => setPrivacyModalVisible(true)}
              onRestartOnboarding={() => void handleSignOut(resetOnboarding)}
            />

            <Text align="center" tone="muted" variant="caption">
              juntoss 0.1.0
            </Text>
          </ScrollView>
        </View>
      </GestureDetector>

      <CurrencyPreferencesModal
        onClose={() => setCurrencyModalVisible(false)}
        onSave={(next) => {
          onSaveCurrencyPreferences(next);
          setCurrencyModalVisible(false);
        }}
        preferences={currencyPreferences}
        visible={isCurrencyModalVisible && !isVenezuela}
      />

      <CountryPreferencesModal
        countryCode={countryCode}
        error={countryError}
        isSaving={isSavingCountry}
        onClose={() => setCountryModalVisible(false)}
        onSave={async (next) => {
          if (hasSharedSpace && next !== countryCode) {
            setCountryModalVisible(false);
            setPendingCountryChange(next);
            return;
          }
          await saveSelectedCountry(next);
        }}
        visible={isCountryModalVisible}
      />

      <CountryChangeSharedSpaceWarningModal
        countryName={
          pendingCountryChange
            ? (getCountryByIso2(pendingCountryChange)?.name ??
              pendingCountryChange)
            : ''
        }
        onCancel={() => {
          setPendingCountryChange(null);
          setCountryModalVisible(true);
        }}
        onConfirm={() => {
          const next = pendingCountryChange;
          setPendingCountryChange(null);
          if (next) {
            setCountryModalVisible(true);
            void saveSelectedCountry(next);
          }
        }}
        visible={pendingCountryChange !== null}
      />

      <CountryChangeBlockedModal
        onClose={() => setCountryChangeBlockedVisible(false)}
        visible={isCountryChangeBlockedVisible}
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

      <NoticeToast
        notice={saveConfirmationNotice}
        onDismiss={dismissSaveConfirmation}
        testID="save-confirmation-toast"
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
    screenContent: {
      flex: 1,
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
      backgroundColor: colors.background,
      paddingHorizontal: spacing.xl,
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
