import type { CurrencyCode } from '@/lib/currency/currencyCatalog';

/**
 * Moneda elegida para el resumen superior de Inicio (balance disponible,
 * ingresos y gastos del mes) cuando el usuario tiene más de una moneda
 * activa. `null` significa que todavía no se ha elegido explícitamente y
 * debe recurrirse a la primera moneda activa del usuario.
 */
export type HomeCurrencySelection = {
  currency: CurrencyCode | null;
};

export const defaultHomeCurrencySelection: HomeCurrencySelection = {
  currency: null,
};
