import type {
  CurrentExchangeRates,
  VenezuelaCurrencyCode,
} from '@/features/exchangeRates/types';
import {
  amountMinorToInput,
  parseAmountMinor,
} from '@/lib/currency/amountInput';
import type { ExchangeRateSource } from '@/lib/currency/exchangeRateSource';

/**
 * Estado y reglas de «Comprar / vender dólares» (Venezuela).
 *
 * La operación no es un tipo de movimiento nuevo: al confirmar se convierte
 * en un gasto y un ingreso normales, uno en VES y otro en USD. Este módulo
 * solo decide qué importes se escriben y cuál se deriva del otro con la tasa.
 *
 * El contravalor se calcula aquí únicamente como sugerencia para la persona;
 * los importes que se guardan son los que ella confirma, y el servidor sigue
 * congelando su propio snapshot de tasas al sincronizar cada movimiento.
 */

export type CurrencyExchangeOperation = 'BUY_USD' | 'SELL_USD';

export type OfficialExchangeRates = CurrentExchangeRates['rates'] | null;

export type CurrencyExchangeFormState = {
  operation: CurrencyExchangeOperation;
  usdInput: string;
  vesInput: string;
  /**
   * Último campo escrito por la persona. Con una fuente oficial el otro se
   * deriva de él; con la personalizada se conserva y la tasa pasa a ser la
   * implícita entre los dos.
   */
  anchor: VenezuelaCurrencyCode;
  rateSource: ExchangeRateSource;
  /** «1 USD = ___ Bs», con coma decimal y hasta cuatro decimales. */
  customRateInput: string;
  usdAccountId?: string;
  vesAccountId?: string;
};

export type CurrencyExchangeFormAction =
  | { type: 'editAmount'; currency: VenezuelaCurrencyCode; value: string }
  | { type: 'selectRateSource'; source: ExchangeRateSource }
  | { type: 'editCustomRate'; value: string }
  | { type: 'setOperation'; operation: CurrencyExchangeOperation }
  | {
      type: 'setAccount';
      currency: VenezuelaCurrencyCode;
      moneyAccountId: string | undefined;
    }
  | { type: 'ratesUnavailable' }
  | { type: 'reset' };

export type CurrencyExchangeLeg = {
  amountMinor: number;
  currency: VenezuelaCurrencyCode;
  moneyAccountId?: string;
};

export type CurrencyExchangeSubmission = {
  operation: CurrencyExchangeOperation;
  expense: CurrencyExchangeLeg;
  income: CurrencyExchangeLeg;
};

const maxRateDecimals = 4;

export function createCurrencyExchangeFormState(): CurrencyExchangeFormState {
  return {
    operation: 'BUY_USD',
    usdInput: '',
    vesInput: '',
    anchor: 'USD',
    rateSource: 'BCV',
    customRateInput: '',
    usdAccountId: undefined,
    vesAccountId: undefined,
  };
}

/**
 * Deja dígitos y una coma con dos decimales como máximo. El punto se descarta
 * (igual que el saldo inicial de cuentas): en pantalla agrupa los millares y
 * no puede confundirse con el separador decimal.
 */
export function sanitizeExchangeAmountInput(value: string): string {
  return sanitizeDecimalInput(value, 2);
}

/**
 * Presenta lo escrito con puntos de millar sin alterar los decimales, para
 * que «10,» siga siendo «10,» mientras la persona teclea.
 */
export function formatExchangeAmountInputForDisplay(value: string): string {
  const [whole = '', decimals] = value.split(',');
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return decimals === undefined ? groupedWhole : `${groupedWhole},${decimals}`;
}

export function sanitizeExchangeRateInput(value: string): string {
  return sanitizeDecimalInput(value, maxRateDecimals);
}

function sanitizeDecimalInput(value: string, maxDecimals: number): string {
  const normalized = value.replace(/[^0-9,]/g, '');
  const separatorIndex = normalized.indexOf(',');
  if (separatorIndex === -1) return stripLeadingZeros(normalized);

  const whole = stripLeadingZeros(normalized.slice(0, separatorIndex));
  const decimals = normalized
    .slice(separatorIndex + 1)
    .replace(/,/g, '')
    .slice(0, maxDecimals);

  return `${whole || '0'},${decimals}`;
}

function stripLeadingZeros(whole: string): string {
  return whole.replace(/^0+(?=\d)/, '');
}

export function parseExchangeRateInput(value: string): number | null {
  if (!value.trim()) return null;
  const rate = Number(value.replace(',', '.'));

  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

export function formatExchangeRateInput(rate: number): string {
  return rate
    .toFixed(maxRateDecimals)
    .replace(/0+$/, '')
    .replace(/\.$/, '')
    .replace('.', ',');
}

/** Bs por USD según la fuente elegida, o `null` si aún no hay tasa válida. */
export function resolveExchangeRate(
  state: Pick<CurrencyExchangeFormState, 'rateSource' | 'customRateInput'>,
  officialRates: OfficialExchangeRates,
): number | null {
  if (state.rateSource === 'CUSTOM') {
    return parseExchangeRateInput(state.customRateInput);
  }
  const rate = Number(officialRates?.[state.rateSource]?.rate);

  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

export function convertUsdToVesMinor(usdMinor: number, rate: number): number {
  return Math.round(usdMinor * rate);
}

export function convertVesToUsdMinor(vesMinor: number, rate: number): number {
  return Math.round(vesMinor / rate);
}

export function getImpliedExchangeRate(
  usdMinor: number,
  vesMinor: number,
): number | null {
  if (usdMinor <= 0 || vesMinor <= 0) return null;

  return vesMinor / usdMinor;
}

function readAmountMinor(value: string): number {
  return value ? parseAmountMinor(value) : 0;
}

function inputKey(currency: VenezuelaCurrencyCode): 'usdInput' | 'vesInput' {
  return currency === 'USD' ? 'usdInput' : 'vesInput';
}

function otherCurrency(currency: VenezuelaCurrencyCode): VenezuelaCurrencyCode {
  return currency === 'USD' ? 'VES' : 'USD';
}

function deriveOtherInput(
  currency: VenezuelaCurrencyCode,
  value: string,
  rate: number,
): string {
  const minor = readAmountMinor(value);
  if (minor <= 0) return '';
  const derivedMinor =
    currency === 'USD'
      ? convertUsdToVesMinor(minor, rate)
      : convertVesToUsdMinor(minor, rate);

  return derivedMinor > 0 ? amountMinorToInput(derivedMinor) : '';
}

/** Recalcula el campo derivado a partir del ancla cuando hay tasa válida. */
function deriveFromAnchor(
  state: CurrencyExchangeFormState,
  officialRates: OfficialExchangeRates,
): CurrencyExchangeFormState {
  const rate = resolveExchangeRate(state, officialRates);
  if (rate === null) return state;
  const anchorValue = state[inputKey(state.anchor)];
  if (readAmountMinor(anchorValue) <= 0) return state;

  return {
    ...state,
    [inputKey(otherCurrency(state.anchor))]: deriveOtherInput(
      state.anchor,
      anchorValue,
      rate,
    ),
  };
}

export function reduceCurrencyExchangeForm(
  state: CurrencyExchangeFormState,
  action: CurrencyExchangeFormAction,
  officialRates: OfficialExchangeRates,
): CurrencyExchangeFormState {
  switch (action.type) {
    case 'editAmount': {
      const value = sanitizeExchangeAmountInput(action.value);
      const next = {
        ...state,
        [inputKey(action.currency)]: value,
        anchor: action.currency,
      };
      const other = otherCurrency(action.currency);
      const rate = resolveExchangeRate(next, officialRates);

      // Con una fuente oficial manda la tasa: el importe que se escribe pasa a
      // ser el ancla y el otro se recalcula, aunque ya viniera derivado.
      if (state.rateSource !== 'CUSTOM' && rate !== null) {
        return {
          ...next,
          [inputKey(other)]: deriveOtherInput(action.currency, value, rate),
        };
      }

      // Con la personalizada mandan los importes: la persona decide cuántos
      // dólares entrega y cuántos bolívares recibe. La misma regla aplica sin
      // ninguna tasa utilizable, que es cuando los importes son el único dato.
      const usdMinor = readAmountMinor(next.usdInput);
      const vesMinor = readAmountMinor(next.vesInput);

      // Sin ningún importe no hay nada que sugerir: la tasa vuelve a cero para
      // no dejar a la vista la implícita de lo que se acaba de borrar.
      if (usdMinor <= 0 && vesMinor <= 0) {
        return state.rateSource === 'CUSTOM'
          ? { ...next, customRateInput: '' }
          : next;
      }

      const impliedRate = getImpliedExchangeRate(usdMinor, vesMinor);
      if (impliedRate !== null) {
        return {
          ...next,
          rateSource: 'CUSTOM',
          customRateInput: formatExchangeRateInput(impliedRate),
        };
      }

      // Queda un solo importe: se completa el otro con la tasa escrita. Borrar
      // un importe no vuelve a rellenarlo desde el que sigue en pantalla.
      if (rate === null || readAmountMinor(value) <= 0) return next;

      return {
        ...next,
        [inputKey(other)]: deriveOtherInput(action.currency, value, rate),
      };
    }
    case 'selectRateSource': {
      let next: CurrencyExchangeFormState = {
        ...state,
        rateSource: action.source,
      };
      if (
        action.source === 'CUSTOM' &&
        parseExchangeRateInput(state.customRateInput) === null
      ) {
        const currentRate = resolveExchangeRate(state, officialRates);
        next = {
          ...next,
          customRateInput:
            currentRate === null ? '' : formatExchangeRateInput(currentRate),
        };
      }

      return deriveFromAnchor(next, officialRates);
    }
    case 'editCustomRate':
      return deriveFromAnchor(
        {
          ...state,
          rateSource: 'CUSTOM',
          customRateInput: sanitizeExchangeRateInput(action.value),
        },
        officialRates,
      );
    case 'setOperation':
      return { ...state, operation: action.operation };
    case 'setAccount':
      return action.currency === 'USD'
        ? { ...state, usdAccountId: action.moneyAccountId }
        : { ...state, vesAccountId: action.moneyAccountId };
    case 'ratesUnavailable':
      return state.rateSource === 'CUSTOM'
        ? state
        : { ...state, rateSource: 'CUSTOM' };
    case 'reset':
      return createCurrencyExchangeFormState();
  }
}

/** Gasto e ingreso resultantes, o `null` mientras falte algún importe. */
export function deriveCurrencyExchangeSubmission(
  state: CurrencyExchangeFormState,
): CurrencyExchangeSubmission | null {
  const usdMinor = readAmountMinor(state.usdInput);
  const vesMinor = readAmountMinor(state.vesInput);
  if (usdMinor <= 0 || vesMinor <= 0) return null;

  const usdLeg: CurrencyExchangeLeg = {
    amountMinor: usdMinor,
    currency: 'USD',
    moneyAccountId: state.usdAccountId,
  };
  const vesLeg: CurrencyExchangeLeg = {
    amountMinor: vesMinor,
    currency: 'VES',
    moneyAccountId: state.vesAccountId,
  };

  return state.operation === 'BUY_USD'
    ? { operation: state.operation, expense: vesLeg, income: usdLeg }
    : { operation: state.operation, expense: usdLeg, income: vesLeg };
}

export function canSubmitCurrencyExchange(
  state: CurrencyExchangeFormState,
  officialRates: OfficialExchangeRates,
): boolean {
  return (
    deriveCurrencyExchangeSubmission(state) !== null &&
    resolveExchangeRate(state, officialRates) !== null
  );
}
