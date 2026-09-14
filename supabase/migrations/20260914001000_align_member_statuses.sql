-- Keep database constraints aligned with the existing admin status endpoints.

alter table public.spouses
  drop constraint spouses_status_check,
  add constraint spouses_status_check
    check (status in ('active', 'pending_add', 'pending_remove', 'removed'));

alter table public.children
  drop constraint children_status_check,
  add constraint children_status_check
    check (status in ('active', 'pending_add', 'pending_remove', 'removed'));
