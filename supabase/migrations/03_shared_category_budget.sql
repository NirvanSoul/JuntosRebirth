-- categories_update_author (01_initial_finance_schema.sql) restricts direct UPDATEs on
-- public.categories to the category's creator. In a shared space both
-- members should be able to set or clear a category's budget without
-- gaining rights over its name, icon, color or archived state, so budget
-- changes go through this narrower function instead of loosening the
-- table-level policy.
create or replace function public.update_category_budget(
  p_category_id uuid,
  p_budget_amount_minor bigint
)
returns public.categories
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  updated_category public.categories;
begin
  if current_user_id is null then raise exception 'authentication required'; end if;
  if p_budget_amount_minor is not null and p_budget_amount_minor <= 0 then
    raise exception 'budget must be greater than zero';
  end if;

  update public.categories
     set budget_amount_minor = p_budget_amount_minor,
         updated_at = now()
   where id = p_category_id
     and is_archived = false
     and public.is_active_space_member(space_id)
   returning * into updated_category;

  if updated_category.id is null then
    raise exception 'category not found or access denied';
  end if;

  return updated_category;
end;
$$;

revoke all on function public.update_category_budget(uuid, bigint) from public, anon;
grant execute on function public.update_category_budget(uuid, bigint) to authenticated;
