import type { MoneyAccount } from '@/features/accounts/types';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';

/**
 * Monedas que un espacio muestra, en orden de preferencia.
 *
 * Las monedas activas de la persona mandan: al quitar una en Ajustes, sus
 * movimientos y saldos dejan de verse, pero no se borran, y vuelven al
 * reactivarla. Ni la moneda con la que nació el espacio ni la presencia de
 * datos en una divisa la mantienen visible.
 *
 * Un espacio compartido añade las monedas de los demás miembros: si Ana
 * trabaja en VES y Beto en EUR, el espacio juntos debe ofrecer ambas a los
 * dos, o cada uno perdería de vista los gastos comunes que registra el otro.
 *
 * El orden importa porque quien consume esto toma la primera como valor por
 * defecto cuando la persona no ha elegido ninguna:
 *
 * 1. Las propias, en el orden en que las eligió.
 * 2. Las de los demás miembros, para poder ver y clasificar lo que registren.
 *
 * No se toca `maxActiveCurrencies`: ese tope limita cuántas monedas gestiona
 * una persona, no cuántas puede tener un espacio compartido entre dos.
 */
export function listSpaceCurrencies(
  ownCurrencies: readonly CurrencyCode[],
  memberCurrencies: readonly (CurrencyCode | null | undefined)[] = [],
): readonly CurrencyCode[] {
  const ordered: CurrencyCode[] = [];
  const seen = new Set<CurrencyCode>();

  for (const currency of [...ownCurrencies, ...memberCurrencies]) {
    if (!currency || seen.has(currency)) continue;
    seen.add(currency);
    ordered.push(currency);
  }

  return ordered;
}

/** Deja en cada lista solo los elementos de una moneda visible. */
export function filterByVisibleCurrencies<T extends { currency: string }>(
  items: readonly T[],
  visibleCurrencies: ReadonlySet<string>,
): readonly T[] {
  return items.filter((item) => visibleCurrencies.has(item.currency));
}

/**
 * Oculta los saldos de monedas desactivadas y las cuentas que se quedan sin
 * ninguno. Solo para mostrar: los saldos guardados no cambian.
 */
export function filterMoneyAccountsByVisibleCurrencies(
  accounts: readonly MoneyAccount[],
  visibleCurrencies: ReadonlySet<string>,
): readonly MoneyAccount[] {
  return accounts.flatMap((account) => {
    const balances = filterByVisibleCurrencies(
      account.balances,
      visibleCurrencies,
    );
    if (balances.length === 0) return [];
    return balances.length === account.balances.length
      ? [account]
      : [{ ...account, balances }];
  });
}
