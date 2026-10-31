import type { CurrencyCode } from '@/lib/currency/currencyCatalog';

/**
 * Cómo traducir el guion demo, escrito en euros de una pareja trabajadora en
 * España, a cada moneda.
 *
 * El guion parte de una nómina de 1.400 € netos, algo por encima del SMI de
 * 2026 (1.221 € brutos en 14 pagas), para que quien la vea la reconozca como
 * un sueldo normal y no como el de un perfil directivo. `costScale` no es un
 * tipo de cambio: es la nómina neta equivalente de cada país (algo por encima
 * de su salario mínimo de 2026) dividida entre esos 1.400 €. Así la nómina, el
 * alquiler y la compra guardan la misma proporción que en España y caen en
 * cifras que alguien de ese país reconoce.
 *
 * `countryCode` fija el país del perfil demo.
 *
 * Venezuela es el caso especial: se elige con el bolívar, pero su moneda
 * contable es el dólar (`JUNTOSS_VENEZUELA_CURRENCY_PLAN.md` §0.1). Cuentas,
 * espacios y gastos fijos van en USD y la escala se aplica a dólares; las
 * compras pequeñas del día a día se registran en bolívares con las tasas
 * ficticias de `demoVenezuelaRates`. Su salario mínimo legal no refleja lo que
 * se cobra, así que conserva su perfil propio con `incomeScale`.
 */
export type DemoCurrencyProfile = {
  /** Moneda con la que se elige el perfil en el selector. */
  currency: CurrencyCode;
  countryCode: string;
  costScale: number;
  /** Escala de nóminas y aportes cuando no sigue a `costScale`. */
  incomeScale?: number;
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

// Nómina neta resultante entre paréntesis, junto al mínimo legal de 2026.
export const demoCurrencyProfiles: readonly DemoCurrencyProfile[] = [
  // 1.400 €; SMI de 1.221 € en 14 pagas, unos 1.330 € netos al mes.
  singleCurrency('EUR', 'ES', 1),
  // 2.170 $; sin mínimo federal útil, unos 15 $/hora como en muchos estados.
  singleCurrency('USD', 'US', 1.55),
  // 10.000 MXN; 315,04 MXN diarios, unos 9.580 MXN al mes.
  singleCurrency('MXN', 'MX', 7.15),
  // 2.000.000 COP; 1.746.882 COP más 253.118 COP de auxilio de transporte.
  singleCurrency('COP', 'CO', 1430),
  // 400.000 ARS; SMVM de 391.200 ARS brutos en octubre.
  singleCurrency('ARS', 'AR', 286),
  // 500.000 CLP; 539.000 CLP brutos, unos 440.000 CLP líquidos.
  singleCurrency('CLP', 'CL', 357),
  // 1.260 PEN; RMV de 1.230 PEN desde octubre.
  singleCurrency('PEN', 'PE', 0.9),
  // 1.850 GBP; National Living Wage de 12,71 GBP por hora.
  singleCurrency('GBP', 'GB', 1.32),
  // Clase media profesional en Caracas: nómina de unos 870 $ y precios de
  // calle en dólares baratos para el estándar europeo.
  {
    currency: 'VES',
    countryCode: 'VE',
    costScale: 0.38,
    incomeScale: 0.62,
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
