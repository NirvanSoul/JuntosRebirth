import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { Alarm } from 'phosphor-react-native/src/icons/Alarm';
import { ChartLineUp } from 'phosphor-react-native/src/icons/ChartLineUp';
import { Coins } from 'phosphor-react-native/src/icons/Coins';
import { DeviceMobile } from 'phosphor-react-native/src/icons/DeviceMobile';
import { FileText } from 'phosphor-react-native/src/icons/FileText';
import { Key } from 'phosphor-react-native/src/icons/Key';
import { MapPin } from 'phosphor-react-native/src/icons/MapPin';
import { SlidersHorizontal } from 'phosphor-react-native/src/icons/SlidersHorizontal';
import { Trash } from 'phosphor-react-native/src/icons/Trash';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { DemoUserSettingsSection } from '@/features/demo/components/DemoUserSettingsSection';
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
import { LanguagePreferenceModal } from '@/features/settings/components/LanguagePreferenceModal/LanguagePreferenceModal';
import { SettingsHelpSection } from '@/features/settings/components/SettingsHelpSection/SettingsHelpSection';
import { saveCountryChangeNotice } from '@/features/spaces/repositories/countryChangeNoticeRepository';
import { ProfileHeader } from '@/features/settings/components/ProfileHeader/ProfileHeader';
import { CurrencyPreferencesModal } from '@/features/settings/components/CurrencyPreferencesModal/CurrencyPreferencesModal';
import { CurrencySymbolsToggleRow } from '@/features/settings/components/CurrencySymbolsToggleRow/CurrencySymbolsToggleRow';
import { useSettingsBackSwipe } from '@/features/settings/hooks/useSettingsBackSwipe';
import { useProfileCountry } from '@/features/profile/hooks/useProfileCountry';
import type { Space } from '@/features/spaces/types';
import { NotificationRulesModal } from '@/features/transactions/components/NotificationRulesModal/NotificationRulesModal';
import type { SaveLocalNotificationRuleInput } from '@/features/transactions/repositories/localTransactionNotificationRuleRepository';
import type { TransactionNotificationRule } from '@/features/transactions/types';
import { getCurrencyName } from '@/lib/currency/currencyCatalog';
import { getCountryByIso2 } from '@/lib/geography/countryCatalog';
import { appLanguageLabels } from '@/lib/i18n/languages';
import { useAppLanguage } from '@/lib/i18n/useAppLanguage';
import type { CurrencyPreferences } from '@/state/appPreferences/currencyPreferences';
import { useDemoSession } from '@/state/demoSession/demoSessionStore';
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
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const { session } = useAuthSession();
  const { demoSession } = useDemoSession();
  const resetOnboarding = useOnboardingRestart();
  const { t } = useTranslation();
  const { language } = useAppLanguage();
  const {
    countryCode,
    error: countryError,
    isSaving: isSavingCountry,
    saveCountry,
  } = useProfileCountry();
  const [isSigningOut, setSigningOut] = useState(false);
  const [isCurrencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [isCountryModalVisible, setCountryModalVisible] = useState(false);
  const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);
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
    : t('settings.rows.countryNotSelected');
  const notificationRulesValueLabel = notificationRules.some(
    (rule) => rule.isEnabled,
  )
    ? t('settings.rows.remindersOn')
    : t('settings.rows.remindersOff');
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
            : t('settings.previousCountryFallback'),
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
    Alert.alert(t('settings.signOut.title'), t('settings.signOut.message'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.signOut.confirm'),
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
        t('settings.signOut.errorTitle'),
        t('settings.signOut.errorMessage'),
      );
    } finally {
      setSigningOut(false);
    }
  };

  const handleContactDeveloper = () => {
    void Clipboard.setStringAsync(developerContactEmail);
    showSaveConfirmation(
      t('settings.contactCopied', { email: developerContactEmail }),
    );
    void Linking.openURL(`mailto:${developerContactEmail}`);
  };

  const handleConfirmLeaveCoupleSpace = () => {
    if (coupleSpaceExitSecondsRemaining > 0) return;

    setCoupleSpaceExit({ step: 'leaving' });
    void onLeaveCoupleSpace().catch(() => {
      setCoupleSpaceExit({
        step: 'error',
        message: t('settings.leaveCoupleSpace.error'),
      });
    });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <GestureDetector gesture={backSwipeGesture}>
        <View style={styles.screenContent}>
          <View style={styles.header} testID="settings-header">
            <Pressable
              accessibilityLabel={t('common.back')}
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
              {t('settings.title')}
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
              icon="options-outline"
              title={t('settings.sections.preferences')}
            >
              <SettingsRow
                iconComponent={Coins}
                iconBackgroundColor={categoryColors.green}
                label={t('settings.rows.currency')}
                onPress={
                  isVenezuela ? undefined : () => setCurrencyModalVisible(true)
                }
                value={currencyValueLabel}
              />
              <SettingsDivider />
              <SettingsRow
                iconComponent={MapPin}
                iconBackgroundColor={categoryColors.blue}
                label={t('settings.rows.country')}
                onPress={() => setCountryModalVisible(true)}
                value={countryValueLabel}
              />
              <SettingsDivider />
              <SettingsToggleRow
                description={t('settings.rows.homeComparisonDescription')}
                enabled={showHomeComparisonIndicators}
                iconComponent={ChartLineUp}
                iconBackgroundColor={categoryColors.green}
                label={t('settings.rows.homeComparison')}
                onToggle={onToggleHomeComparisonIndicators}
                testID="home-comparison-toggle"
              />
              <SettingsDivider />
              <CurrencySymbolsToggleRow />
              <SettingsRow
                icon="language-outline"
                iconBackgroundColor={categoryColors.blue}
                label={t('language.settingsLabel')}
                onPress={() => setLanguageModalVisible(true)}
                value={appLanguageLabels[language]}
              />
            </SettingsSection>

            <SettingsSection
              icon="notifications-outline"
              title={t('settings.sections.notifications')}
            >
              <SettingsRow
                iconComponent={Alarm}
                iconBackgroundColor={categoryColors.pink}
                label={t('settings.rows.reminders')}
                onPress={() => setNotificationRulesModalVisible(true)}
                value={notificationRulesValueLabel}
              />
            </SettingsSection>

            <SettingsSection
              icon="lock-closed-outline"
              title={t('settings.sections.dataPrivacy')}
            >
              <SettingsRow
                iconComponent={DeviceMobile}
                iconBackgroundColor={categoryColors.violet}
                label={t('settings.rows.dataStatus')}
                onPress={() => setDataRightsVisible(true)}
                value={t('settings.rows.dataStatusValue')}
              />
              <SettingsDivider />
              <SettingsRow
                iconComponent={FileText}
                iconBackgroundColor={categoryColors.violet}
                label={t('settings.rows.dataUsage')}
                onPress={() => setDataUsageDocVisible(true)}
              />
              <SettingsDivider />
              <SettingsRow
                iconComponent={SlidersHorizontal}
                iconBackgroundColor={categoryColors.green}
                label={t('settings.rows.privacyChoices')}
                onPress={() => setPrivacyChoicesVisible(true)}
              />
              <SettingsDivider />
              <SettingsRow
                iconComponent={Key}
                iconBackgroundColor={categoryColors.blue}
                label={t('settings.rows.permissions')}
                onPress={() => setPermissionsVisible(true)}
              />
            </SettingsSection>

            {activeSpaceType === 'couple' ? (
              <SettingsSection
                icon="people-outline"
                title={t('settings.sections.coupleSpace')}
              >
                <SettingsRow
                  destructive
                  iconComponent={Trash}
                  iconBackgroundColor={categoryColors.red}
                  label={t('settings.rows.leaveCoupleSpace')}
                  onPress={() => setCoupleSpaceExit({ step: 'confirming' })}
                />
              </SettingsSection>
            ) : null}

            {activeSpaceType === 'couple' &&
            coupleSpaceExit.step === 'confirming' ? (
              <View style={styles.warningCard}>
                <Text tone="expense" variant="bodyStrong" weight="semibold">
                  {t('settings.leaveCoupleSpace.warningTitle')}
                </Text>
                <Text tone="secondary" variant="label">
                  {t('settings.leaveCoupleSpace.warningMessage')}
                </Text>
                <View style={styles.progressTrack}>
                  <Animated.View
                    style={[styles.progressFill, coupleSpaceExitProgressStyle]}
                  />
                </View>
                <View style={styles.actionsRow}>
                  <ModalPrimaryAction
                    accessibilityLabel={t(
                      'settings.leaveCoupleSpace.cancelLabel',
                    )}
                    label={t('common.cancel')}
                    onPress={() => setCoupleSpaceExit({ step: 'idle' })}
                    style={styles.actionButton}
                    variant="surface"
                  />
                  <ModalPrimaryAction
                    accessibilityLabel={
                      coupleSpaceExitSecondsRemaining > 0
                        ? t('settings.leaveCoupleSpace.waitLabel', {
                            seconds: coupleSpaceExitSecondsRemaining,
                          })
                        : t('settings.leaveCoupleSpace.confirmLabel')
                    }
                    disabled={coupleSpaceExitSecondsRemaining > 0}
                    label={
                      coupleSpaceExitSecondsRemaining > 0
                        ? t('settings.leaveCoupleSpace.wait', {
                            seconds: coupleSpaceExitSecondsRemaining,
                          })
                        : t('settings.leaveCoupleSpace.confirm')
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

            {demoSession ? (
              <DemoUserSettingsSection demoSession={demoSession} />
            ) : (
              <SettingsSection
                emphasizeIcon={false}
                icon="person-circle-outline"
                title={t('settings.sections.account')}
              >
                <SettingsRow
                  icon="log-out-outline"
                  iconBackgroundColor={categoryColors.blue}
                  label={t('settings.rows.signOut')}
                  onPress={handleAccountRowPress}
                  value={session?.user.email ?? undefined}
                />
              </SettingsSection>
            )}

            <Text align="center" tone="muted" variant="caption">
              Juntos 0.1.0
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

      <LanguagePreferenceModal
        onClose={() => setLanguageModalVisible(false)}
        visible={isLanguageModalVisible}
      />

      <NotificationRulesModal
        onClose={() => setNotificationRulesModalVisible(false)}
        onSave={onSaveNotificationRule}
        onSaved={() => showSaveConfirmation(t('settings.remindersSaved'))}
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
