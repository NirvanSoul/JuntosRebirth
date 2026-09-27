import type { CurrentExchangeRates } from '@/features/exchangeRates/types';
import {
  canSubmitCurrencyExchange,
  createCurrencyExchangeFormState,
  deriveCurrencyExchangeSubmission,
  formatExchangeAmountInputForDisplay,
  formatExchangeRateInput,
  parseExchangeRateInput,
  reduceCurrencyExchangeForm,
  resolveExchangeRate,
  sanitizeExchangeAmountInput,
  sanitizeExchangeRateInput,
  type CurrencyExchangeFormAction,
  type CurrencyExchangeFormState,
} from '@/features/exchangeRates/utils/currencyExchangeForm';

const officialRates: CurrentExchangeRates['rates'] = {
  BCV: {
    source: 'BCV',
    baseCurrency: 'USD',
    quoteCurrency: 'VES',
    rate: '40.0000000000',
    observedAt: '2026-09-22T19:00:00.000Z',
    fetchedAt: '2026-09-22T19:05:00.000Z',
  },
  EURO: {
    source: 'EURO',
    baseCurrency: 'EUR',
    quoteCurrency: 'VES',
    rate: '50.0000000000',
    observedAt: '2026-09-22T19:00:00.000Z',
    fetchedAt: '2026-09-22T19:05:00.000Z',
  },
};

function run(
  actions: readonly CurrencyExchangeFormAction[],
  rates: CurrentExchangeRates['rates'] | null = officialRates,
  initial: CurrencyExchangeFormState = createCurrencyExchangeFormState(),
): CurrencyExchangeFormState {
  return actions.reduce(
    (state, action) => reduceCurrencyExchangeForm(state, action, rates),
    initial,
  );
}

describe('currencyExchangeForm', () => {
  describe('sanitizado y parseo', () => {
    it('acepta dígitos y una coma con dos decimales, y descarta los puntos de millar', () => {
      expect(sanitizeExchangeAmountInput('1.5')).toBe('15');
      expect(sanitizeExchangeAmountInput('1.0005')).toBe('10005');
      expect(sanitizeExchangeAmountInput('12,345')).toBe('12,34');
      expect(sanitizeExchangeAmountInput('-4a5,,1')).toBe('45,1');
      expect(sanitizeExchangeAmountInput('007')).toBe('7');
      expect(sanitizeExchangeAmountInput(',5')).toBe('0,5');
      expect(sanitizeExchangeAmountInput('')).toBe('');
    });

    it('permite cuatro decimales en la tasa y rechaza tasas no positivas', () => {
      expect(sanitizeExchangeRateInput('36,54321')).toBe('36,5432');
      expect(parseExchangeRateInput('36,5432')).toBe(36.5432);
      expect(parseExchangeRateInput('0')).toBeNull();
      expect(parseExchangeRateInput('')).toBeNull();
      expect(parseExchangeRateInput('abc')).toBeNull();
    });

    it('agrupa millares en pantalla sin tocar los decimales escritos', () => {
      expect(formatExchangeAmountInputForDisplay('')).toBe('');
      expect(formatExchangeAmountInputForDisplay('1000')).toBe('1.000');
      expect(formatExchangeAmountInputForDisplay('10,')).toBe('10,');
      expect(formatExchangeAmountInputForDisplay('1234567,5')).toBe(
        '1.234.567,5',
      );
    });

    it('formatea la tasa sin ceros sobrantes', () => {
      expect(formatExchangeRateInput(45)).toBe('45');
      expect(formatExchangeRateInput(36.5)).toBe('36,5');
      expect(formatExchangeRateInput(1 / 3)).toBe('0,3333');
    });
  });

  describe('resolveExchangeRate', () => {
    it('lee BCV y EURO del backend y la personalizada del formulario', () => {
      const base = createCurrencyExchangeFormState();
      expect(resolveExchangeRate(base, officialRates)).toBe(40);
      expect(
        resolveExchangeRate({ ...base, rateSource: 'EURO' }, officialRates),
      ).toBe(50);
      expect(
        resolveExchangeRate(
          { ...base, rateSource: 'CUSTOM', customRateInput: '45,5' },
          null,
        ),
      ).toBe(45.5);
      expect(resolveExchangeRate(base, null)).toBeNull();
    });
  });

  describe('importes ancla y derivado', () => {
    it('deriva los bolívares al escribir dólares con BCV', () => {
      const state = run([{ type: 'editAmount', currency: 'USD', value: '10' }]);

      expect(state).toMatchObject({
        usdInput: '10',
        vesInput: '400',
        anchor: 'USD',
        rateSource: 'BCV',
      });
    });

    it('deriva los dólares al escribir bolívares primero', () => {
      const state = run([
        { type: 'editAmount', currency: 'VES', value: '500' },
      ]);

      expect(state).toMatchObject({
        usdInput: '12,5',
        vesInput: '500',
        anchor: 'VES',
        rateSource: 'BCV',
      });
    });

    it('conserva la fuente elegida y ancla el importe que se escribe después', () => {
      const state = run([
        { type: 'editAmount', currency: 'USD', value: '10' },
        { type: 'selectRateSource', source: 'EURO' },
        { type: 'editAmount', currency: 'VES', value: '450' },
      ]);

      expect(state).toMatchObject({
        usdInput: '9',
        vesInput: '450',
        anchor: 'VES',
        rateSource: 'EURO',
      });
    });

    it('en personalizada conserva los dos importes y recalcula la tasa', () => {
      const state = run([
        { type: 'editAmount', currency: 'USD', value: '10' },
        { type: 'selectRateSource', source: 'CUSTOM' },
        { type: 'editAmount', currency: 'VES', value: '450' },
      ]);

      expect(state).toMatchObject({
        usdInput: '10',
        vesInput: '450',
        rateSource: 'CUSTOM',
        customRateInput: '45',
      });
    });

    it('en personalizada la tasa vuelve a cero al borrar los dos importes', () => {
      const state = run([
        { type: 'editAmount', currency: 'USD', value: '10' },
        { type: 'selectRateSource', source: 'CUSTOM' },
        { type: 'editAmount', currency: 'VES', value: '450' },
        { type: 'editAmount', currency: 'VES', value: '' },
        { type: 'editAmount', currency: 'USD', value: '' },
      ]);

      expect(state).toMatchObject({
        usdInput: '',
        vesInput: '',
        rateSource: 'CUSTOM',
        customRateInput: '',
      });
    });

    it('en personalizada borrar un importe no lo repone desde el otro', () => {
      const state = run([
        { type: 'editAmount', currency: 'USD', value: '10' },
        { type: 'selectRateSource', source: 'CUSTOM' },
        { type: 'editAmount', currency: 'VES', value: '450' },
        { type: 'editAmount', currency: 'VES', value: '' },
      ]);

      expect(state).toMatchObject({
        usdInput: '10',
        vesInput: '',
        customRateInput: '45',
      });
    });

    it('en personalizada deriva el importe que falta con la tasa escrita', () => {
      const state = run([
        { type: 'selectRateSource', source: 'CUSTOM' },
        { type: 'editAmount', currency: 'USD', value: '10' },
      ]);

      expect(state).toMatchObject({
        usdInput: '10',
        vesInput: '400',
        rateSource: 'CUSTOM',
        customRateInput: '40',
      });
    });

    it('sin ninguna tasa, los dos importes escritos definen la personalizada', () => {
      const state = run(
        [
          { type: 'editAmount', currency: 'USD', value: '10' },
          { type: 'editAmount', currency: 'VES', value: '450' },
        ],
        null,
      );

      expect(state).toMatchObject({
        usdInput: '10',
        vesInput: '450',
        rateSource: 'CUSTOM',
        customRateInput: '45',
      });
    });

    it('vacía el derivado al borrar el ancla', () => {
      const state = run([
        { type: 'editAmount', currency: 'USD', value: '10' },
        { type: 'editAmount', currency: 'USD', value: '' },
      ]);

      expect(state).toMatchObject({ usdInput: '', vesInput: '' });
    });

    it('redondea a la unidad menor más cercana', () => {
      const state = run([{ type: 'editAmount', currency: 'VES', value: '1' }]);

      // 100 céntimos de Bs / 40 = 2,5 centavos → 3 centavos.
      expect(state.usdInput).toBe('0,03');
    });
  });

  describe('fuentes de tasa', () => {
    it('recalcula el derivado al cambiar de BCV a EURO', () => {
      const state = run([
        { type: 'editAmount', currency: 'USD', value: '10' },
        { type: 'selectRateSource', source: 'EURO' },
      ]);

      expect(state).toMatchObject({ vesInput: '500', rateSource: 'EURO' });
    });

    it('precarga la tasa vigente al elegir personalizada y recalcula al editarla', () => {
      const chosen = run([
        { type: 'editAmount', currency: 'USD', value: '10' },
        { type: 'selectRateSource', source: 'CUSTOM' },
      ]);
      expect(chosen).toMatchObject({
        rateSource: 'CUSTOM',
        customRateInput: '40',
        vesInput: '400',
      });

      const edited = run(
        [{ type: 'editCustomRate', value: '55' }],
        null,
        chosen,
      );
      expect(edited).toMatchObject({ customRateInput: '55', vesInput: '550' });
    });

    it('vuelve a la oficial desde una personalizada', () => {
      const state = run([
        { type: 'editAmount', currency: 'USD', value: '10' },
        { type: 'editCustomRate', value: '45' },
        { type: 'selectRateSource', source: 'BCV' },
      ]);

      expect(state).toMatchObject({ rateSource: 'BCV', vesInput: '400' });
    });

    it('fuerza personalizada cuando no hay tasas disponibles', () => {
      expect(run([{ type: 'ratesUnavailable' }], null)).toMatchObject({
        rateSource: 'CUSTOM',
        customRateInput: '',
      });
    });
  });

  describe('operación, cuentas y envío', () => {
    it('conserva importes y cuentas al cambiar entre comprar y vender', () => {
      const bought = run([
        { type: 'editAmount', currency: 'USD', value: '10' },
        { type: 'setAccount', currency: 'USD', moneyAccountId: 'cash-usd' },
        { type: 'setAccount', currency: 'VES', moneyAccountId: 'bank-ves' },
      ]);
      expect(deriveCurrencyExchangeSubmission(bought)).toEqual({
        operation: 'BUY_USD',
        expense: {
          amountMinor: 40_000,
          currency: 'VES',
          moneyAccountId: 'bank-ves',
        },
        income: {
          amountMinor: 1_000,
          currency: 'USD',
          moneyAccountId: 'cash-usd',
        },
      });

      const sold = run(
        [{ type: 'setOperation', operation: 'SELL_USD' }],
        null,
        bought,
      );
      expect(sold).toMatchObject({ usdInput: '10', vesInput: '400' });
      expect(deriveCurrencyExchangeSubmission(sold)).toEqual({
        operation: 'SELL_USD',
        expense: {
          amountMinor: 1_000,
          currency: 'USD',
          moneyAccountId: 'cash-usd',
        },
        income: {
          amountMinor: 40_000,
          currency: 'VES',
          moneyAccountId: 'bank-ves',
        },
      });
    });

    it('no permite enviar sin ambos importes ni sin tasa válida', () => {
      const empty = createCurrencyExchangeFormState();
      expect(deriveCurrencyExchangeSubmission(empty)).toBeNull();
      expect(canSubmitCurrencyExchange(empty, officialRates)).toBe(false);

      const loading = run(
        [{ type: 'editAmount', currency: 'USD', value: '10' }],
        null,
      );
      expect(canSubmitCurrencyExchange(loading, null)).toBe(false);

      const ready = run([{ type: 'editAmount', currency: 'USD', value: '10' }]);
      expect(canSubmitCurrencyExchange(ready, officialRates)).toBe(true);

      const custom = run(
        [
          { type: 'editAmount', currency: 'USD', value: '10' },
          { type: 'editAmount', currency: 'VES', value: '450' },
        ],
        null,
      );
      expect(canSubmitCurrencyExchange(custom, null)).toBe(true);
    });

    it('reset vuelve al estado inicial', () => {
      const state = run([
        { type: 'editAmount', currency: 'USD', value: '10' },
        { type: 'reset' },
      ]);

      expect(state).toEqual(createCurrencyExchangeFormState());
    });
  });
});
