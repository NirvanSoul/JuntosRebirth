import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ComponentType, ReactNode } from 'react';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text/Text';
import { CurrencyPreferencesModal } from '@/features/settings/components/CurrencyPreferencesModal/CurrencyPreferencesModal';
import { ProfileEditIcon } from '@/features/settings/components/ProfileEditIcon/ProfileEditIcon';
import { NotificationRulesModal } from '@/features/transactions/components/NotificationRulesModal/NotificationRulesModal';
import type { SaveLocalNotificationRuleInput } from '@/features/transactions/repositories/localTransactionNotificationRuleRepository';
import type { TransactionNotificationRule } from '@/features/transactions/types';
import { getCurrencyName } from '@/lib/currency/currencyCatalog';
import type { CurrencyPreferences } from '@/state/appPreferences/currencyPreferences';
import { categoryColors } from '@/theme/categoryColors';
import { colors } from '@/theme/colors';
import { iconSize, layout } from '@/theme/layout';
import { previewCardLayout } from '@/theme/previewCard';
import { radii } from '@/theme/radii';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';

type IconName = ComponentProps<typeof Ionicons>['name'];

type SettingsScreenProps = {
  activeSpaceId: string;
  currencyPreferences: CurrencyPreferences;
  notificationRules: readonly TransactionNotificationRule[];
  onBack: () => void;
  onSaveCurrencyPreferences: (preferences: CurrencyPreferences) => void;
  onSaveNotificationRule: (
    input: SaveLocalNotificationRuleInput,
  ) => boolean | Promise<boolean>;
  onToggleHomeComparisonIndicators: (enabled: boolean) => void;
  showHomeComparisonIndicators: boolean;
};

type SettingsSectionProps = {
  children: ReactNode;
  emphasizeIcon?: boolean;
  icon: IconName;
  title: string;
};

type CustomSettingsIcon = ComponentType<{
  color: string;
  size: number;
  testID?: string;
}>;

type SettingsRowBaseProps = {
  destructive?: boolean;
  iconBackgroundColor: string;
  label: string;
  onPress?: () => void;
  pending?: boolean;
  value?: string;
};

type SettingsRowProps = SettingsRowBaseProps &
  (
    | { icon: IconName; iconComponent?: never }
    | { icon?: never; iconComponent: CustomSettingsIcon }
  );

const profileIconSize = 56;
const profileGlyphSize = iconSize.lg;
const rowIconSize = previewCardLayout.iconSize;
const rowGlyphSize = iconSize.sm;

function showPendingNotice() {
  Alert.alert(
    'Función pendiente',
    'Este ajuste ya tiene su lugar preparado, pero todavía falta implementar su funcionamiento.',
  );
}

function SettingsSection({
  children,
  emphasizeIcon = true,
  icon,
  title,
}: SettingsSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitle}>
        <View style={styles.sectionTitleIcon} testID={`section-icon-${title}`}>
          <Ionicons
            color={colors.textMuted}
            name={icon}
            size={iconSize.md}
            style={emphasizeIcon ? styles.sectionGlyphEmphasized : undefined}
            testID={`section-glyph-${title}`}
          />
        </View>
        <Text accessibilityRole="header" variant="subheading">
          {title}
        </Text>
      </View>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function SettingsRow({
  destructive = false,
  icon,
  iconComponent: IconComponent,
  iconBackgroundColor,
  label,
  onPress,
  pending = false,
  value,
}: SettingsRowProps) {
  const content = (
    <>
      <View
        style={[styles.rowIcon, { backgroundColor: iconBackgroundColor }]}
        testID={`row-icon-${label}`}
      >
        {IconComponent ? (
          <IconComponent
            color={colors.onBrand}
            size={rowGlyphSize}
            testID={`row-glyph-${label}`}
          />
        ) : icon ? (
          <Ionicons
            color={colors.onBrand}
            name={icon}
            size={rowGlyphSize}
            style={styles.rowGlyphEmphasized}
            testID={`row-glyph-${label}`}
          />
        ) : null}
      </View>
      <View style={styles.rowText}>
        <Text
          tone={destructive ? 'expense' : 'primary'}
          variant="label"
          weight="semibold"
        >
          {label}
        </Text>
        {value ? (
          <Text numberOfLines={1} tone="secondary" variant="footnote">
            {value}
          </Text>
        ) : null}
      </View>
      {pending ? (
        <View
          accessibilityLabel="Pendiente de implementar"
          accessibilityRole="text"
          style={styles.pendingDot}
          testID={`pending-${label}`}
        />
      ) : null}
      {onPress ? (
        <Ionicons
          color={colors.textMuted}
          name="chevron-forward"
          size={iconSize.xs}
        />
      ) : null}
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityHint={
        pending ? 'Función pendiente de implementar' : 'Abre esta configuración'
      }
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
    >
      {content}
    </Pressable>
  );
}

type ComparisonToggleRowProps = {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
};

function ComparisonToggleRow({ enabled, onToggle }: ComparisonToggleRowProps) {
  return (
    <View style={styles.row}>
      <View
        style={[styles.rowIcon, { backgroundColor: categoryColors.green }]}
        testID="row-icon-Comparación en Inicio"
      >
        <Ionicons
          color={colors.onBrand}
          name="trending-up-outline"
          size={rowGlyphSize}
          style={styles.rowGlyphEmphasized}
          testID="row-glyph-Comparación en Inicio"
        />
      </View>
      <View style={styles.rowText}>
        <Text tone="primary" variant="label" weight="semibold">
          Comparación en Inicio
        </Text>
        <Text numberOfLines={1} tone="secondary" variant="footnote">
          Compara con el mes anterior
        </Text>
      </View>
      <Switch
        accessibilityLabel="Comparación en Inicio"
        onValueChange={onToggle}
        style={styles.comparisonSwitch}
        testID="home-comparison-toggle"
        thumbColor={colors.surface}
        trackColor={{ false: colors.border, true: colors.cta }}
        value={enabled}
      />
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

export function SettingsScreen({
  activeSpaceId,
  currencyPreferences,
  notificationRules,
  onBack,
  onSaveCurrencyPreferences,
  onSaveNotificationRule,
  onToggleHomeComparisonIndicators,
  showHomeComparisonIndicators,
}: SettingsScreenProps) {
  const [isCurrencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [isNotificationRulesModalVisible, setNotificationRulesModalVisible] =
    useState(false);
  const currencyValueLabel =
    currencyPreferences.currencies.length > 1
      ? currencyPreferences.currencies.join(' · ')
      : getCurrencyName(currencyPreferences.currencies[0]!);
  const notificationRulesValueLabel = notificationRules.some(
    (rule) => rule.isEnabled,
  )
    ? 'Activadas'
    : 'Desactivadas';

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
          <View style={styles.profileIcon}>
            <Ionicons
              color={colors.onBrand}
              name="person"
              size={profileGlyphSize}
            />
          </View>
          <View style={styles.profileText}>
            <Text variant="bodyStrong" weight="semibold">
              Tu perfil
            </Text>
            <Text tone="secondary" variant="footnote">
              Invitado · Datos solo en este dispositivo
            </Text>
          </View>
          <View style={styles.guestBadge}>
            <Text tone="cta" variant="caption" weight="semibold">
              Invitado
            </Text>
          </View>
        </View>

        <View style={styles.pendingLegend}>
          <View style={styles.pendingDot} />
          <Text tone="secondary" variant="footnote">
            El punto rojo indica una función pendiente de implementar.
          </Text>
        </View>

        <SettingsSection
          emphasizeIcon={false}
          icon="person-circle-outline"
          title="Cuenta"
        >
          <SettingsRow
            iconBackgroundColor={categoryColors.green}
            iconComponent={ProfileEditIcon}
            label="Editar perfil"
            onPress={showPendingNotice}
            pending
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
          <Divider />
          <ComparisonToggleRow
            enabled={showHomeComparisonIndicators}
            onToggle={onToggleHomeComparisonIndicators}
          />
          <Divider />
          <SettingsRow
            icon="language-outline"
            iconBackgroundColor={categoryColors.blue}
            label="Idioma"
            onPress={showPendingNotice}
            pending
            value="Español"
          />
          <Divider />
          <SettingsRow
            icon="sunny-outline"
            iconBackgroundColor={categoryColors.blue}
            label="Apariencia"
            onPress={showPendingNotice}
            pending
            value="Claro"
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
            value="Guardados en este dispositivo"
          />
        </SettingsSection>

        <SettingsSection icon="help-circle-outline" title="Ayuda">
          <SettingsRow
            icon="chatbubble-ellipses-outline"
            iconBackgroundColor={categoryColors.amber}
            label="Contactar con soporte"
            onPress={showPendingNotice}
            pending
          />
          <Divider />
          <SettingsRow
            icon="document-text-outline"
            iconBackgroundColor={categoryColors.violet}
            label="Política de privacidad"
            onPress={showPendingNotice}
            pending
          />
        </SettingsSection>

        <Text align="center" tone="muted" variant="caption">
          juntoss 0.1.0
        </Text>
      </ScrollView>

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
        rules={notificationRules}
        spaceId={activeSpaceId}
        visible={isNotificationRulesModalVisible}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  profileIcon: {
    width: profileIconSize,
    height: profileIconSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: categoryColors.violet,
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
  pendingLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  pendingDot: {
    width: spacing.sm,
    height: spacing.sm,
    flexShrink: 0,
    borderRadius: radii.round,
    backgroundColor: colors.expense,
  },
  section: {
    gap: spacing.md,
    marginTop: spacing.xxl,
  },
  sectionTitle: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sectionTitleIcon: {
    width: iconSize.md,
    height: iconSize.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionGlyphEmphasized: {
    textShadowColor: colors.textMuted,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0.45,
  },
  sectionCard: {
    ...shadows.subtle,
    overflow: 'hidden',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: previewCardLayout.borderRadius,
    backgroundColor: colors.surface,
  },
  row: {
    minHeight: previewCardLayout.minHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: previewCardLayout.paddingHorizontal,
    paddingVertical: previewCardLayout.paddingVertical,
  },
  rowPressed: {
    opacity: 0.68,
  },
  rowIcon: {
    width: rowIconSize,
    height: rowIconSize,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: previewCardLayout.iconRadius,
  },
  rowGlyphEmphasized: {
    textShadowColor: colors.onBrand,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0.45,
  },
  rowText: {
    minWidth: 0,
    flex: 1,
    gap: spacing.xxs,
  },
  comparisonSwitch: {
    marginTop: spacing.sm,
  },
  divider: {
    height: 1,
    marginLeft: previewCardLayout.paddingHorizontal + rowIconSize + spacing.md,
    backgroundColor: colors.categoryPreviewBorder,
  },
});
