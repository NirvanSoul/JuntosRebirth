import { ScrollView, StyleSheet } from 'react-native';

import { MoneyAccountCard } from '@/features/accounts/components/MoneyAccountCard/MoneyAccountCard';
import type { MoneyAccountSummary } from '@/features/accounts/utils/moneyAccountSummary';
import { spacing } from '@/theme/spacing';

type MoneyAccountCarouselProps = {
  accounts: readonly MoneyAccountSummary[];
  bordered?: boolean;
  /**
   * Compensa el margen lateral de la pantalla para que el carrusel sangre
   * hasta el borde sin que la primera tarjeta pierda su gutter.
   */
  gutter?: number;
  onOpenMoneyAccountDetail?: (moneyAccountId: string) => void;
  testID?: string;
};

export function MoneyAccountCarousel({
  accounts,
  bordered = false,
  gutter = 0,
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
      {accounts.map((account) => (
        <MoneyAccountCard
          account={account}
          bordered={bordered}
          key={account.id}
          onPress={() => onOpenMoneyAccountDetail?.(account.id)}
        />
      ))}
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
