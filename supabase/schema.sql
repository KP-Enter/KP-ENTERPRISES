-- K.P. ENTERPRISES billing — database schema (already applied to the live Supabase project).
-- Kept here for reference / to rebuild the database in a new project.

create table public.allowed_users (
  email text primary key,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

create or replace function public.is_allowed()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.allowed_users where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

create table public.company_settings (
  id int primary key default 1 check (id = 1),
  name text not null default 'K.P. ENTERPRISES',
  address text default 'Begamganj sandila hardoi uttar pradesh 241204',
  phone text default '8787068927',
  email text default '12shivasinghh@gmail.com',
  gstin text default '09QFAPS9524E1ZU',
  state text default '09-Uttar Pradesh',
  bill_prefix text default 'KPE/',
  bank_details text default '',
  terms text default 'Thanks for doing business with us!',
  signature text,
  stamp text,
  doc_title text default 'Bill',
  party_label text default 'Bill To',
  accent_color text default '#9893e6',
  round_off boolean default true,
  show_sign boolean default true,
  show_stamp boolean default true,
  updated_at timestamptz not null default now()
);
insert into public.company_settings (id) values (1);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  gstin text,
  state text default '09-Uttar Pradesh',
  created_at timestamptz not null default now()
);
create unique index customers_name_phone_idx on public.customers (lower(name), coalesce(phone,''));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  hsn text,
  unit text default 'Pcs',
  price numeric(14,2) default 0,
  gst_rate numeric(5,2) default 0,
  price_incl_tax boolean default true,
  created_at timestamptz not null default now()
);

create sequence public.bill_no_seq start 1;
create table public.bills (
  id uuid primary key default gen_random_uuid(),
  bill_no text not null unique,
  bill_date date not null default current_date,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  customer_address text,
  customer_phone text,
  customer_gstin text,
  place_of_supply text default '09-Uttar Pradesh',
  items jsonb not null default '[]',
  total_qty numeric(14,2) default 0,
  sub_total numeric(14,2) default 0,
  total_tax numeric(14,2) default 0,
  tax_breakup jsonb default '[]',
  round_off numeric(14,2) default 0,
  grand_total numeric(14,2) default 0,
  paid numeric(14,2) default 0,
  balance numeric(14,2) default 0,
  notes text,
  created_by text default (auth.jwt() ->> 'email'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bills_date_idx on public.bills (bill_date desc);
create index bills_customer_idx on public.bills (lower(customer_name));

create or replace function public.next_bill_no()
returns text language plpgsql security definer set search_path = public as $$
declare p text; n bigint;
begin
  if not public.is_allowed() then raise exception 'not allowed'; end if;
  select coalesce(bill_prefix,'') into p from public.company_settings where id = 1;
  n := nextval('public.bill_no_seq');
  return p || lpad(n::text, 4, '0');
end $$;

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
create trigger bills_touch before update on public.bills for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.company_settings for each row execute function public.touch_updated_at();

alter table public.allowed_users enable row level security;
alter table public.company_settings enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.bills enable row level security;

create policy "allowed read self" on public.allowed_users for select to authenticated using (public.is_allowed());
create policy "allowed all" on public.company_settings for all to authenticated using (public.is_allowed()) with check (public.is_allowed());
create policy "allowed all" on public.customers for all to authenticated using (public.is_allowed()) with check (public.is_allowed());
create policy "allowed all" on public.products for all to authenticated using (public.is_allowed()) with check (public.is_allowed());
create policy "allowed all" on public.bills for all to authenticated using (public.is_allowed()) with check (public.is_allowed());

revoke execute on function public.is_allowed() from public, anon;
revoke execute on function public.next_bill_no() from public, anon;
grant execute on function public.is_allowed() to authenticated;
grant execute on function public.next_bill_no() to authenticated;

-- To give another staff member access:
--   1. Supabase dashboard → Authentication → Users → Add user (email + password)
--   2. insert into public.allowed_users (email) values ('their@email.com');

-- ===================== Roles (admin / staff) — applied as migration kpe_roles =====================
alter table public.allowed_users add column if not exists full_name text;
alter table public.allowed_users add constraint allowed_users_role_chk check (role in ('admin','staff'));

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.allowed_users where lower(email) = lower(auth.jwt() ->> 'email') and role = 'admin');
$$;
create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.allowed_users where lower(email) = lower(auth.jwt() ->> 'email');
$$;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.my_role() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.my_role() to authenticated;

drop policy if exists "allowed read self" on public.allowed_users;
create policy "team read" on public.allowed_users for select to authenticated
  using (public.is_admin() or lower(email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "allowed all" on public.company_settings;
create policy "settings read" on public.company_settings for select to authenticated using (public.is_allowed());
create policy "settings write" on public.company_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "allowed all" on public.bills;
create policy "bills read" on public.bills for select to authenticated using (public.is_allowed());
create policy "bills insert" on public.bills for insert to authenticated with check (public.is_allowed());
create policy "bills update" on public.bills for update to authenticated using (public.is_allowed()) with check (public.is_allowed());
create policy "bills delete" on public.bills for delete to authenticated using (public.is_admin());

-- Team logins are created from the app (Team page) through the edge function
-- supabase/functions/manage-users, which is deployed to the project.
