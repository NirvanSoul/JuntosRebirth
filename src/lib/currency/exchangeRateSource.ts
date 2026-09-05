export type ExchangeRateSource = 'BCV' | 'EURO' | 'CUSTOM';

const exchangeRateSourceLabels: Record<ExchangeRateSource, string> = {
  BCV: 'BCV',
  EURO: 'Euro',
  CUSTOM: 'Personalizada',
};

export function getExchangeRateSourceLabel(source: ExchangeRateSource): string {
  return exchangeRateSourceLabels[source];
}
