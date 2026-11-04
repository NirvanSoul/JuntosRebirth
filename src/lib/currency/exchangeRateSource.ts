export type ExchangeRateSource = 'BCV' | 'EURO' | 'CUSTOM' | 'USDT';

const exchangeRateSourceLabels: Record<ExchangeRateSource, string> = {
  BCV: 'BCV',
  EURO: 'Tasa EUR',
  CUSTOM: 'Personalizada',
  USDT: 'USDT',
};

export function getExchangeRateSourceLabel(source: ExchangeRateSource): string {
  return exchangeRateSourceLabels[source];
}
