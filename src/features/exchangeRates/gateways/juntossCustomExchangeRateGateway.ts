import { apiClient } from '@/services/api/juntossApiClient';

export type CustomExchangeRate = {
  id: string;
  name: string;
  baseCurrency: 'USD';
  quoteCurrency: 'VES';
  rate: string;
  isDefault: boolean;
  createdAt: string;
};

type RawCustomExchangeRate = Omit<
  CustomExchangeRate,
  'baseCurrency' | 'quoteCurrency' | 'createdAt'
> & {
  baseCurrency: string;
  quoteCurrency: string;
  createdAt: string;
};

function mapRate(raw: RawCustomExchangeRate): CustomExchangeRate {
  if (raw.baseCurrency !== 'USD' || raw.quoteCurrency !== 'VES') {
    throw new Error(
      '[exchangeRates] La API devolvió una tasa personalizada inválida',
    );
  }
  return {
    ...raw,
    baseCurrency: 'USD',
    quoteCurrency: 'VES',
  };
}

export async function listCustomExchangeRates(): Promise<
  readonly CustomExchangeRate[]
> {
  const response = await apiClient.get<{
    data: { rates: RawCustomExchangeRate[] };
  }>('/v1/exchange/custom-rates');
  return response.data.rates.map(mapRate);
}

export async function createCustomExchangeRate(input: {
  name: string;
  rate: string;
  isDefault?: boolean;
}): Promise<CustomExchangeRate> {
  const response = await apiClient.post<{
    data: { rate: RawCustomExchangeRate };
  }>('/v1/exchange/custom-rates', input);
  return mapRate(response.data.rate);
}

export async function updateCustomExchangeRate(
  id: string,
  input: { name?: string; rate?: string; isDefault?: boolean },
): Promise<CustomExchangeRate> {
  const response = await apiClient.patch<{
    data: { rate: RawCustomExchangeRate };
  }>(`/v1/exchange/custom-rates/${encodeURIComponent(id)}`, input);
  return mapRate(response.data.rate);
}

export function deleteCustomExchangeRate(id: string): Promise<void> {
  return apiClient.delete(
    `/v1/exchange/custom-rates/${encodeURIComponent(id)}`,
  );
}
