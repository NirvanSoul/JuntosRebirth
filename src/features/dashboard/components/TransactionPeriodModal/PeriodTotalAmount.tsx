import { Text } from '@/components/ui/Text/Text';

type PeriodTotalAmountProps = {
  type: string;
  value: string;
};

export function PeriodTotalAmount({ type, value }: PeriodTotalAmountProps) {
  return (
    <Text testID={`${type}-period-total`} variant="title" weight="medium">
      {value}
    </Text>
  );
}
