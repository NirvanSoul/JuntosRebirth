-- Reduce los tipos de cuenta a tres: efectivo, cuenta bancaria y tarjeta.
--
-- La migración 28 admitía cinco (`cash`, `bank`, `debit`, `credit`,
-- `savings`). Distinguir débito de crédito y de ahorro no aporta nada mientras
-- el saldo se calcule igual en todos y no existan límite de crédito ni
-- transferencias entre cuentas; sí obliga al usuario a elegir entre opciones
-- que para él son la misma cosa.
--
-- La restricción anterior no se edita en su migración: se sustituye aquí. Las
-- filas existentes se reasignan antes de aplicar la nueva, para que ninguna
-- quede fuera del CHECK.

update public.money_accounts
   set kind = case kind
         when 'debit' then 'card'
         when 'credit' then 'card'
         when 'savings' then 'bank'
         else kind
       end,
       updated_at = now()
 where kind in ('debit', 'credit', 'savings');

alter table public.money_accounts
  drop constraint money_accounts_kind_check;
alter table public.money_accounts
  add constraint money_accounts_kind_check
  check (kind in ('cash', 'bank', 'card'));
