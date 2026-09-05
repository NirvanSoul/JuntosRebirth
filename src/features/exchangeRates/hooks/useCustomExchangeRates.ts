import { useCallback, useEffect, useState } from 'react';

import {
  createCustomExchangeRate,
  deleteCustomExchangeRate,
  listCustomExchangeRates,
  type CustomExchangeRate,
  updateCustomExchangeRate,
} from '@/features/exchangeRates/gateways/juntossCustomExchangeRateGateway';

type CustomExchangeRatesState = {
  rates: readonly CustomExchangeRate[];
  status: 'loading' | 'ready' | 'error';
  refresh: () => Promise<void>;
  create: (input: {
    name: string;
    rate: string;
    isDefault?: boolean;
  }) => Promise<CustomExchangeRate>;
  update: (
    id: string,
    input: { name?: string; rate?: string; isDefault?: boolean },
  ) => Promise<CustomExchangeRate>;
  remove: (id: string) => Promise<void>;
};

export function useCustomExchangeRates(): CustomExchangeRatesState {
  const [rates, setRates] = useState<readonly CustomExchangeRate[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );

  const refresh = useCallback(async () => {
    try {
      setStatus('loading');
      setRates(await listCustomExchangeRates());
      setStatus('ready');
    } catch (error) {
      console.error(
        '[exchangeRates] No se pudieron leer las tasas personalizadas',
        error,
      );
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    let active = true;

    void listCustomExchangeRates()
      .then((nextRates) => {
        if (!active) return;
        setRates(nextRates);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error(
          '[exchangeRates] No se pudieron leer las tasas personalizadas',
          error,
        );
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, []);

  const create = useCallback(
    async (input: { name: string; rate: string; isDefault?: boolean }) => {
      const rate = await createCustomExchangeRate(input);
      await refresh();
      return rate;
    },
    [refresh],
  );

  const update = useCallback(
    async (
      id: string,
      input: { name?: string; rate?: string; isDefault?: boolean },
    ) => {
      const rate = await updateCustomExchangeRate(id, input);
      await refresh();
      return rate;
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteCustomExchangeRate(id);
      await refresh();
    },
    [refresh],
  );

  return { rates, status, refresh, create, update, remove };
}
