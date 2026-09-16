import { ScrollView, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { CreatePreviewBadge } from '@/components/ui/CreatePreviewBadge/CreatePreviewBadge';
import { MoneyAccountCard } from '@/features/accounts/components/MoneyAccountCard/MoneyAccountCard';
import type { MoneyAccountSummary } from '@/features/accounts/utils/moneyAccountSummary';
import { spacing } from '@/theme/spacing';
import { getStartupEntering } from '@/theme/transitions';

type MoneyAccountCarouselProps = {
  animateEntrance?: boolean;
  accounts: readonly MoneyAccountSummary[];
  bordered?: boolean;
  /**
   * Compensa el margen lateral de la pantalla para que el carrusel sangre
   * hasta el borde sin que la primera tarjeta pierda su gutter.
   */
  gutter?: number;
  onCreateMoneyAccount?: () => void;
  onOpenMoneyAccountDetail?: (moneyAccountId: string) => void;
  testID?: string;
};

export function MoneyAccountCarousel({
  animateEntrance = false,
  accounts,
  bordered = false,
  gutter = 0,
  onCreateMoneyAccount,
  onOpenMoneyAccountDetail,
  testID,
}: MoneyAccountCarouselProps) {
  return (
    <ScrollView
      contentContainerStyle={[styles.list, { paddingHorizontal: gutter }]}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.carousel, { marginHorizontal: -gutter }]}
      testID={testID}
    >
      {accounts.map((account, index) => (
        <Animated.View
          key={account.id}
          entering={animateEntrance ? getStartupEntering(index + 4) : undefined}
        >
          <MoneyAccountCard
            account={account}
            bordered={bordered}
            onPress={() => onOpenMoneyAccountDetail?.(account.id)}
          />
        </Animated.View>
      ))}
      {onCreateMoneyAccount ? (
        <CreatePreviewBadge
          accessibilityLabel="Crear cuenta"
          label="Crear cuenta"
          onPress={onCreateMoneyAccount}
          testID="money-account-create-card"
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  carousel: { overflow: 'visible' },
  list: {
    gap: spacing.md,
    overflow: 'visible',
    paddingVertical: spacing.md,
  },
});
