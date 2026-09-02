-- Incremental migration for a TransitGo Supabase project that already ran
-- the original schema.sql (before the sign-up form collected full_name /
-- account_type / phone / age / address). Run this once in the SQL Editor.
-- Safe to re-run — everything is IF NOT EXISTS / OR REPLACE.
--
-- Brand-new project that hasn't run anything yet? Just run schema.sql
-- instead — it already includes everything below.

alter table public.profiles
  add column if not exists full_name text,
  add column if not exists email text,
  add column if not exists account_type text,
  add column if not exists phone_number text,
  add column if not exists age integer,
  add column if not exists address_street text,
  add column if not exists address_barangay text,
  add column if not exists address_city text,
  add column if not exists address_province text,
  add column if not exists address_postal_code text,
  add column if not exists created_at timestamptz not null default now();

-- Left nullable at the table level (unlike a fresh install) so this ALTER
-- never fails against any row already present — the sign-up form and the
-- trigger below are what actually guarantee every new row is complete.
alter table public.profiles drop constraint if exists profiles_account_type_check;
alter table public.profiles add constraint profiles_account_type_check
  check (account_type is null or account_type in ('student', 'regular'));

alter table public.profiles drop constraint if exists profiles_age_check;
alter table public.profiles add constraint profiles_age_check
  check (age is null or (age > 0 and age <= 120));

-- Replaces handle_new_user() so future sign-ups populate all the new
-- columns straight from auth.users.raw_user_meta_data.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id, full_name, email, account_type, phone_number, age,
    address_street, address_barangay, address_city, address_province, address_postal_code
  ) values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.email,
    new.raw_user_meta_data ->> 'account_type',
    new.raw_user_meta_data ->> 'phone_number',
    nullif(new.raw_user_meta_data ->> 'age', '')::integer,
    new.raw_user_meta_data ->> 'address_street',
    nullif(new.raw_user_meta_data ->> 'address_barangay', ''),
    new.raw_user_meta_data ->> 'address_city',
    new.raw_user_meta_data ->> 'address_province',
    nullif(new.raw_user_meta_data ->> 'address_postal_code', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
