import type { CurrencyCode } from '@/lib/currency/currencyCatalog';

/**
 * Cómo traducir el guion demo, escrito en euros de una pareja de clase media
 * en España, a cada moneda.
 *
 * `costScale` no es un tipo de cambio: es cuántas unidades locales paga esa
 * misma pareja por lo que en España cuesta un euro, estimado a partir del
 * salario neto habitual de un perfil profesional en cada país (Numbeo,
 * Trading Economics e institutos de estadística nacionales, 2025). Así un
 * alquiler o un café caen en cifras que alguien de ese país reconoce, en vez
 * de una conversión exacta que en Bogotá o Ciudad de México quedaría irreal.
 *
 * `countryCode` fija el país del perfil demo.
 *
 * Venezuela es el caso especial: se elige con el bolívar, pero su moneda
 * contable es el dólar (`JUNTOSS_VENEZUELA_CURRENCY_PLAN.md` §0.1). Cuentas,
 * espacios y gastos fijos van en USD y la escala se aplica a dólares; las
 * compras pequeñas del día a día se registran en bolívares con las tasas
 * ficticias de `demoVenezuelaRates`.
 */
export type DemoCurrencyProfile = {
  /** Moneda con la que se elige el perfil en el selector. */
  currency: CurrencyCode;
  countryCode: string;
  costScale: number;
  /** Moneda de cuentas, espacios y movimientos fijos. */
  accountingCurrency: CurrencyCode;
  /** Monedas activas que quedan en Ajustes. */
  activeCurrencies: readonly CurrencyCode[];
};

function singleCurrency(
  currency: CurrencyCode,
  countryCode: string,
  costScale: number,
): DemoCurrencyProfile {
  return {
    currency,
    countryCode,
    costScale,
    accountingCurrency: currency,
    activeCurrencies: [currency],
  };
}

export const demoCurrencyProfiles: readonly DemoCurrencyProfile[] = [
  singleCurrency('EUR', 'ES', 1),
  singleCurrency('USD', 'US', 2.2),
  singleCurrency('MXN', 'MX', 11),
  singleCurrency('COP', 'CO', 2000),
  singleCurrency('ARS', 'AR', 800),
  singleCurrency('CLP', 'CL', 550),
  singleCurrency('PEN', 'PE', 1.8),
  singleCurrency('GBP', 'GB', 1.25),
  // Clase media profesional en Caracas: nómina de unos 870 $ y alquiler de
  // unos 360 $ por un apartamento pequeño.
  {
    currency: 'VES',
    countryCode: 'VE',
    costScale: 0.38,
    accountingCurrency: 'USD',
    activeCurrencies: ['USD', 'VES'],
  },
];

export const demoCurrencies: readonly CurrencyCode[] = demoCurrencyProfiles.map(
  (profile) => profile.currency,
);

export function getDemoCurrencyProfile(
  currency: CurrencyCode,
): DemoCurrencyProfile {
  const profile = demoCurrencyProfiles.find(
    (candidate) => candidate.currency === currency,
  );
  if (!profile) {
    throw new Error(`La moneda ${currency} no tiene perfil demo`);
  }
  return profile;
}
