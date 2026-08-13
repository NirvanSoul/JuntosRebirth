import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import type { ImportSummaryCounts } from '@/features/import/types';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { ColorTokens } from '@/theme/types';

type ImportSummaryProps = {
  counts: ImportSummaryCounts;
};

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'primary' | 'secondary' | 'expense';
}) {
  return (
    <View style={styles.stat}>
      <Text tone={tone} variant="heading" weight="semibold">
        {value}
      </Text>
      <Text tone="secondary" variant="footnote">
        {label}
      </Text>
    </View>
  );
}

/** Cabecera de la revisión: "N encontrados · listos · a revisar · ya existen" (Bible §51). */
export function ImportSummary({ counts }: ImportSummaryProps) {
  const themedStyles = useThemedStyles(createStyles);

  return (
    <View style={themedStyles.container} testID="import-summary">
      <SummaryStat label="Encontrados" tone="primary" value={counts.detected} />
      <SummaryStat label="Listos" tone="primary" value={counts.ready} />
      <SummaryStat
        label="Para revisar"
        tone={counts.needsReview > 0 ? 'expense' : 'secondary'}
        value={counts.needsReview}
      />
      <SummaryStat
        label="Ya existen"
        tone="secondary"
        value={counts.duplicates}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stat: { alignItems: 'center', gap: spacing.xxs, flex: 1 },
});

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.md,
      paddingVertical: spacing.md,
    },
  });
}
