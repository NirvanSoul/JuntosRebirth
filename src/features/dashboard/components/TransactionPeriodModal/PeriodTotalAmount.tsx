import { Text } from '@/components/ui/Text/Text';

type PeriodTotalAmountProps = {
  /** Nota bajo el importe, como el saldo que arrastra el balance. */
  caption?: string | null;
  type: string;
  value: string;
};

export function PeriodTotalAmount({
  caption,
  type,
  value,
}: PeriodTotalAmountProps) {
  return (
    <>
      <Text testID={`${type}-period-total`} variant="title" weight="medium">
        {value}
      </Text>
      {caption ? (
        <Text
          testID={`${type}-period-carry-over`}
          tone="secondary"
          variant="footnote"
        >
          {caption}
        </Text>
      ) : null}
    </>
  );
}
