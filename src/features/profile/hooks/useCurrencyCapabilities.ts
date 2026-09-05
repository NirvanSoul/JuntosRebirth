import { useProfileCountry } from '@/features/profile/hooks/useProfileCountry';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';

/**
 * Referencia estable para consumidores que sincronizan estado local a partir
 * de las capacidades. Declararla dentro del hook haría que cada render de un
 * perfil venezolano pareciese un cambio de capacidad.
 */
const venezuelaTransactionInputCurrencies: readonly CurrencyCode[] = [
  'USD',
  'VES',
];

export type CurrencyCapabilities = {
  accountingCurrency?: CurrencyCode;
  allowedTransactionInputCurrencies?: readonly CurrencyCode[];
  allowsMultipleAccountCurrencies?: boolean;
  countryCode: string | null;
  venezuelaCurrencyMode: boolean;
  customExchangeRate: boolean;
  multiRateMovementDisplay: boolean;
};

/**
 * Único punto del frontend que compara `countryCode === 'VE'`.
 *
 * Hoy calcula las capacidades en el dispositivo porque `GET /me/capabilities`
 * (contrato 0A.1 de `Bible/JUNTOSS_VENEZUELA_CURRENCY_PLAN.md`) todavía no
 * existe. Cuando ese
 * endpoint esté listo, este hook pasa a consultarlo (siguiendo el patrón de
 * `useCurrencyPreferences`); su forma pública no debería cambiar, así que
 * nadie que lo consuma necesita enterarse del cambio.
 */
export function useCurrencyCapabilities(): CurrencyCapabilities {
  const { countryCode } = useProfileCountry();
  const isVenezuela = countryCode === 'VE';

  return {
    accountingCurrency: isVenezuela ? 'USD' : undefined,
    allowedTransactionInputCurrencies: isVenezuela
      ? venezuelaTransactionInputCurrencies
      : undefined,
    allowsMultipleAccountCurrencies: !isVenezuela,
    countryCode,
    venezuelaCurrencyMode: isVenezuela,
    customExchangeRate: isVenezuela,
    multiRateMovementDisplay: isVenezuela,
  };
}
