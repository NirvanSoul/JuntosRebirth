begin;

-- La migración 08 convirtió los presupuestos históricos, que no guardaban
-- moneda, en EUR. Esa inferencia era incorrecta: antes de que existieran
-- presupuestos por moneda, la única referencia fiable era la moneda del
-- espacio al que pertenece la categoría.
--
-- Solo se tocan filas que el backfill de 08 pudo haber creado: conservan
-- exactamente el importe y las dos fechas técnicas de la categoría original.
-- Un presupuesto creado o editado posteriormente no cumple esas condiciones.
-- Si ya existe un presupuesto moderno en la moneda correcta, ese valor gana y
-- se descarta la copia histórica mal etiquetada.
delete from public.category_budgets as legacy_budget
using public.categories as category, public.spaces as space,
      public.category_budgets as current_budget
where legacy_budget.category_id = category.id
  and category.space_id = space.id
  and legacy_budget.currency = 'EUR'
  and space.currency <> 'EUR'
  and legacy_budget.budget_amount_minor = category.budget_amount_minor
  and legacy_budget.created_at = category.created_at
  and legacy_budget.updated_at = category.updated_at
  and current_budget.category_id = legacy_budget.category_id
  and current_budget.currency = space.currency;

update public.category_budgets as legacy_budget
   set currency = space.currency
  from public.categories as category
  join public.spaces as space on space.id = category.space_id
 where legacy_budget.category_id = category.id
   and legacy_budget.currency = 'EUR'
   and space.currency <> 'EUR'
   and legacy_budget.budget_amount_minor = category.budget_amount_minor
   and legacy_budget.created_at = category.created_at
   and legacy_budget.updated_at = category.updated_at;

commit;
