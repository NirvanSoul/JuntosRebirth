import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { List } from 'phosphor-react-native/src/icons/List';
import { SquaresFour } from 'phosphor-react-native/src/icons/SquaresFour';
import Animated, {
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { EmptyState } from '@/components/feedback/EmptyState/EmptyState';
import { CreatePreviewBadge } from '@/components/ui/CreatePreviewBadge/CreatePreviewBadge';
import { Text } from '@/components/ui/Text/Text';
import { MoneyAccountCarousel } from '@/features/accounts/components/MoneyAccountCarousel/MoneyAccountCarousel';
import { MoneyAccountRow } from '@/features/accounts/components/MoneyAccountRow/MoneyAccountRow';
import type { MoneyAccountSummary } from '@/features/accounts/utils/moneyAccountSummary';
import { AccountDonutChart } from '@/features/activity/components/AccountDonutChart';
import {
  ActivityCollapsibleSection,
  getActivityLayoutTransition,
} from '@/features/activity/components/ActivityCollapsibleSection';
import type { SessionTransaction } from '@/features/transactions/types';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { iconSize, layout } from '@/theme/layout';
import { motion } from '@/theme/motion';
import { previewCardLayout } from '@/theme/previewCard';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type ActivityAccountsSectionProps = {
  accounts: readonly MoneyAccountSummary[];
  /** Moneda del reparto: la gráfica nunca suma importes de divisas distintas. */
  currency: CurrencyCode;
  expanded: boolean;
  onCreateMoneyAccount?: () => void;
  onOpenMoneyAccountDetail?: (moneyAccountId: string) => void;
  onToggle: () => void;
  resetKey?: number;
  transactions: readonly SessionTransaction[];
};

type AccountView = 'cards' | 'list';

const accountViewTiming = {
  duration: motion.categoryViewTransitionDuration,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
};

/**
 * Sección «Cuentas» de Actividad: el reparto por cuenta en el donut compartido,
 * las tarjetas en un carrusel y, debajo, la misma información como lista
 * compacta con icono, nombre y saldo.
 */
export function ActivityAccountsSection({
  accounts,
  currency,
  expanded,
  onCreateMoneyAccount,
  onOpenMoneyAccountDetail,
  onToggle,
  resetKey,
  transactions,
}: ActivityAccountsSectionProps) {
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const [accountView, setAccountView] = useState<AccountView>('list');
  const [displayedAccountView, setDisplayedAccountView] =
    useState<AccountView>('list');
  const entryOffset = useRef<number | null>(null);
  const isTransitioning = useRef(false);
  const opacity = useSharedValue(1);
  const translateX = useSharedValue(0);
  const isCardsVisible = accountView === 'cards';
  const displayedCardsView = displayedAccountView === 'cards';

  const accountViewAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  const finishTransition = useCallback(() => {
    isTransitioning.current = false;
  }, []);

  const showNextAccountView = useCallback(
    (nextView: AccountView, incomingOffset: number) => {
      entryOffset.current = incomingOffset;
      setDisplayedAccountView(nextView);
    },
    [],
  );

  useEffect(() => {
    const incomingOffset = entryOffset.current;
    if (incomingOffset === null) return;

    entryOffset.current = null;
    opacity.value = 0;
    translateX.value = incomingOffset;
    opacity.value = withTiming(1, accountViewTiming);
    translateX.value = withTiming(0, accountViewTiming, (finished) => {
      if (finished) runOnJS(finishTransition)();
    });
  }, [displayedAccountView, finishTransition, opacity, translateX]);

  const toggleAccountView = () => {
    if (isTransitioning.current) return;

    const nextView: AccountView = isCardsVisible ? 'list' : 'cards';
    const outgoingOffset = motion.categoryViewTransitionTravel;
    isTransitioning.current = true;
    setAccountView(nextView);
    opacity.value = withTiming(0, accountViewTiming);
    translateX.value = withTiming(
      outgoingOffset,
      accountViewTiming,
      (finished) => {
        if (finished) {
          runOnJS(showNextAccountView)(nextView, -outgoingOffset);
        }
      },
    );
  };

  return (
    <ActivityCollapsibleSection
      expanded={expanded}
      onToggle={onToggle}
      testID="accounts-section"
      title="Cuentas"
    >
      {accounts.length > 0 ? (
        <>
          <AccountDonutChart
            accounts={accounts}
            currency={currency}
            onOpenMoneyAccountDetail={onOpenMoneyAccountDetail}
            resetKey={resetKey}
            transactions={transactions}
          />

          <View style={styles.detailHeader}>
            <Text accessibilityRole="header" variant="label">
              Detalles por cuenta
            </Text>
            <Pressable
              accessibilityHint="Cambia cómo se muestran las cuentas"
              accessibilityLabel={
                isCardsVisible
                  ? 'Cambiar a vista de lista'
                  : 'Cambiar a vista de tarjetas'
              }
              accessibilityRole="button"
              hitSlop={spacing.sm}
              onPress={toggleAccountView}
              style={({ pressed }) => [
                styles.viewToggle,
                pressed ? styles.viewTogglePressed : null,
              ]}
              testID="activity-account-view-toggle"
            >
              {isCardsVisible ? (
                <List color={colors.textSecondary} size={iconSize.sm} />
              ) : (
                <SquaresFour color={colors.textSecondary} size={iconSize.sm} />
              )}
            </Pressable>
          </View>

          <Animated.View
            layout={getActivityLayoutTransition()}
            style={accountViewAnimatedStyle}
            testID="activity-account-preview-group"
          >
            {displayedCardsView ? (
              <View style={styles.carousel}>
                <MoneyAccountCarousel
                  accounts={accounts}
                  bordered
                  onOpenMoneyAccountDetail={onOpenMoneyAccountDetail}
                  testID="activity-account-scroller"
                />
              </View>
            ) : (
              <View
                style={styles.groupShadow}
                testID="activity-account-list-group"
              >
                <View style={styles.group}>
                  {accounts.map((account, index) => (
                    <View key={account.id}>
                      <MoneyAccountRow
                        account={account}
                        onPress={() => onOpenMoneyAccountDetail?.(account.id)}
                      />
                      {index < accounts.length - 1 ? (
                        <View
                          accessibilityElementsHidden
                          importantForAccessibility="no"
                          style={styles.separator}
                          testID="activity-account-separator"
                        />
                      ) : null}
                    </View>
                  ))}
                </View>
              </View>
            )}
          </Animated.View>

          <View style={styles.createAccountBadge}>
            <CreatePreviewBadge
              accessibilityLabel="Crear cuenta"
              bordered
              label="Crear cuenta"
              onPress={onCreateMoneyAccount}
              testID="activity-add-money-account"
            />
          </View>
        </>
      ) : (
        <EmptyState
          accessibilityLabel="Crear primera cuenta"
          description="Crea una cuenta para saber cuánto te queda en cada sitio."
          icon="wallet-outline"
          iconBackgroundColor={colors.cta}
          onPress={onCreateMoneyAccount}
          testID="activity-empty-accounts"
          title="Aún no hay cuentas"
        />
      )}
    </ActivityCollapsibleSection>
  );
}

function createStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    carousel: {
      marginTop: spacing.md,
    },
    createAccountBadge: { marginTop: spacing.md },
    detailHeader: {
      minHeight: layout.minTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.xl,
    },
    groupShadow: {
      ...shadows.subtle,
      borderRadius: previewCardLayout.borderRadius,
      marginTop: spacing.md,
    },
    group: {
      overflow: 'hidden',
      backgroundColor: colors.surface,
      borderColor: colors.categoryPreviewBorder,
      borderRadius: previewCardLayout.borderRadius,
      borderWidth: 1,
    },
    separator: {
      height: 1,
      backgroundColor: colors.categoryPreviewBorder,
    },
    viewToggle: {
      width: layout.minTouchTarget,
      height: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
    },
    viewTogglePressed: { backgroundColor: colors.background },
  });
}
