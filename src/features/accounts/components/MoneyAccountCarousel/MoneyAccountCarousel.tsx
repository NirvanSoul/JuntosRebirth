import { ScrollView, StyleSheet } from 'react-native';

import { MoneyAccountCard } from '@/features/accounts/components/MoneyAccountCard/MoneyAccountCard';
import type { MoneyAccountSummary } from '@/features/accounts/utils/moneyAccountSummary';
import { spacing } from '@/theme/spacing';

type MoneyAccountCarouselProps = {
  accounts: readonly MoneyAccountSummary[];
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
  gutter = 0,
  onOpenMoneyAccountDetail,
  testID,
}: MoneyAccountCarouselProps) {
  return (
    <ScrollView
      contentContainerStyle={[styles.list, { paddingHorizontal: gutter }]}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -gutter }}
      testID={testID}
    >
      {accounts.map((account) => (
        <MoneyAccountCard
          account={account}
          key={account.id}
          onPress={() => onOpenMoneyAccountDetail?.(account.id)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
});
