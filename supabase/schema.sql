-- Sencillo Mobile App - Supabase/PostgreSQL schema
-- Generated from local domain models and repositories.

create extension if not exists pgcrypto;

-- Optional enums mirroring local TypeScript unions
create type transaction_type as enum ('income', 'expense');
create type transaction_segment as enum ('ingresos', 'ahorro', 'gastos_fijos', 'gastos_variables');
create type currency_code as enum ('VES', 'USD', 'EUR');

-- Profile data (UserProfile)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  phone_prefix text not null default '+58',
  phone_number text not null default '',
  email text not null default '',
  password text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Transactions (Transaction)
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type transaction_type not null,
  segment transaction_segment not null,
  amount numeric(18, 2) not null check (amount >= 0),
  currency currency_code not null,
  original_rate numeric(18, 6) not null default 0,
  amount_usd numeric(18, 2) not null default 0,
  category text not null,
  description text,
  date timestamptz not null,
  profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_transactions_user_date on public.transactions(user_id, date desc);
create index if not exists idx_transactions_user_segment on public.transactions(user_id, segment);
create index if not exists idx_transactions_user_category on public.transactions(user_id, category);

-- Exchange rates (Rates + rates timestamp)
create table if not exists public.rates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  bcv numeric(18, 6) not null default 0,
  parallel numeric(18, 6) not null default 0,
  eur numeric(18, 6) not null default 0,
  eur_cross numeric(18, 6) not null default 0,
  rates_timestamp timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- P&L category structure (PnlStructure)
create table if not exists public.pnl_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  segment transaction_segment not null,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, segment, name)
);

create index if not exists idx_pnl_categories_user_id on public.pnl_categories(user_id);

-- Budgets (Budgets map => category -> amount)
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  amount numeric(18, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category)
);

create index if not exists idx_budgets_user_id on public.budgets(user_id);

-- Savings goals (SavingsGoals map => category -> amount)
create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  amount numeric(18, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category)
);

create index if not exists idx_savings_goals_user_id on public.savings_goals(user_id);

-- Enable RLS on all app tables
alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.rates enable row level security;
alter table public.pnl_categories enable row level security;
alter table public.budgets enable row level security;
alter table public.savings_goals enable row level security;

-- Profiles policies
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (user_id = auth.uid());

create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (user_id = auth.uid());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy profiles_delete_own on public.profiles
  for delete to authenticated
  using (user_id = auth.uid());

-- Transactions policies
create policy transactions_select_own on public.transactions
  for select to authenticated
  using (user_id = auth.uid());

create policy transactions_insert_own on public.transactions
  for insert to authenticated
  with check (user_id = auth.uid());

create policy transactions_update_own on public.transactions
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy transactions_delete_own on public.transactions
  for delete to authenticated
  using (user_id = auth.uid());

-- Rates policies
create policy rates_select_own on public.rates
  for select to authenticated
  using (user_id = auth.uid());

create policy rates_insert_own on public.rates
  for insert to authenticated
  with check (user_id = auth.uid());

create policy rates_update_own on public.rates
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy rates_delete_own on public.rates
  for delete to authenticated
  using (user_id = auth.uid());

-- PnL categories policies
create policy pnl_categories_select_own on public.pnl_categories
  for select to authenticated
  using (user_id = auth.uid());

create policy pnl_categories_insert_own on public.pnl_categories
  for insert to authenticated
  with check (user_id = auth.uid());

create policy pnl_categories_update_own on public.pnl_categories
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy pnl_categories_delete_own on public.pnl_categories
  for delete to authenticated
  using (user_id = auth.uid());

-- Budgets policies
create policy budgets_select_own on public.budgets
  for select to authenticated
  using (user_id = auth.uid());

create policy budgets_insert_own on public.budgets
  for insert to authenticated
  with check (user_id = auth.uid());

create policy budgets_update_own on public.budgets
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy budgets_delete_own on public.budgets
  for delete to authenticated
  using (user_id = auth.uid());

-- Savings goals policies
create policy savings_goals_select_own on public.savings_goals
  for select to authenticated
  using (user_id = auth.uid());

create policy savings_goals_insert_own on public.savings_goals
  for insert to authenticated
  with check (user_id = auth.uid());

create policy savings_goals_update_own on public.savings_goals
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy savings_goals_delete_own on public.savings_goals
  for delete to authenticated
  using (user_id = auth.uid());

-- Workspaces
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create unique index if not exists idx_workspaces_one_default_per_user
  on public.workspaces(user_id)
  where is_default = true;

create index if not exists idx_workspaces_user_id on public.workspaces(user_id);

alter table public.transactions add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.pnl_categories add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.budgets add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.savings_goals add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

create or replace function public.ensure_personal_workspace(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
begin
  select id into v_workspace_id
  from public.workspaces
  where user_id = p_user_id and is_default = true
  limit 1;

  if v_workspace_id is null then
    insert into public.workspaces (user_id, name, is_default)
    values (p_user_id, 'Personal', true)
    returning id into v_workspace_id;
  end if;

  return v_workspace_id;
end;
$$;

create or replace function public.create_personal_workspace_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_personal_workspace(new.id);
  return new;
end;
$$;

drop trigger if exists trg_create_personal_workspace on auth.users;
create trigger trg_create_personal_workspace
after insert on auth.users
for each row
execute function public.create_personal_workspace_for_new_user();

update public.transactions t
set workspace_id = w.id
from public.workspaces w
where t.workspace_id is null
  and w.user_id = t.user_id
  and w.is_default = true;

update public.pnl_categories p
set workspace_id = w.id
from public.workspaces w
where p.workspace_id is null
  and w.user_id = p.user_id
  and w.is_default = true;

update public.budgets b
set workspace_id = w.id
from public.workspaces w
where b.workspace_id is null
  and w.user_id = b.user_id
  and w.is_default = true;

update public.savings_goals s
set workspace_id = w.id
from public.workspaces w
where s.workspace_id is null
  and w.user_id = s.user_id
  and w.is_default = true;

alter table public.transactions alter column workspace_id set not null;
alter table public.pnl_categories alter column workspace_id set not null;
alter table public.budgets alter column workspace_id set not null;
alter table public.savings_goals alter column workspace_id set not null;

drop index if exists idx_transactions_user_date;
create index if not exists idx_transactions_user_workspace_date on public.transactions(user_id, workspace_id, date desc);
drop index if exists idx_transactions_user_segment;
create index if not exists idx_transactions_user_workspace_segment on public.transactions(user_id, workspace_id, segment);
drop index if exists idx_transactions_user_category;
create index if not exists idx_transactions_user_workspace_category on public.transactions(user_id, workspace_id, category);

alter table public.pnl_categories drop constraint if exists pnl_categories_user_id_segment_name_key;
alter table public.pnl_categories add constraint pnl_categories_user_workspace_segment_name_key unique (user_id, workspace_id, segment, name);

alter table public.budgets drop constraint if exists budgets_user_id_category_key;
alter table public.budgets add constraint budgets_user_workspace_category_key unique (user_id, workspace_id, category);

alter table public.savings_goals drop constraint if exists savings_goals_user_id_category_key;
alter table public.savings_goals add constraint savings_goals_user_workspace_category_key unique (user_id, workspace_id, category);

alter table public.workspaces enable row level security;

create policy workspaces_select_own on public.workspaces
  for select to authenticated
  using (user_id = auth.uid());

create policy workspaces_insert_own on public.workspaces
  for insert to authenticated
  with check (user_id = auth.uid());

create policy workspaces_update_own on public.workspaces
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy workspaces_delete_own on public.workspaces
  for delete to authenticated
  using (user_id = auth.uid() and is_default = false);

-- Update RLS policies to include workspace ownership
drop policy if exists transactions_select_own on public.transactions;
drop policy if exists transactions_insert_own on public.transactions;
drop policy if exists transactions_update_own on public.transactions;
drop policy if exists transactions_delete_own on public.transactions;

create policy transactions_select_own on public.transactions
  for select to authenticated
  using (user_id = auth.uid() and exists (
    select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()
  ));

create policy transactions_insert_own on public.transactions
  for insert to authenticated
  with check (user_id = auth.uid() and exists (
    select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()
  ));

create policy transactions_update_own on public.transactions
  for update to authenticated
  using (user_id = auth.uid() and exists (
    select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()
  ))
  with check (user_id = auth.uid() and exists (
    select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()
  ));

create policy transactions_delete_own on public.transactions
  for delete to authenticated
  using (user_id = auth.uid() and exists (
    select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()
  ));

drop policy if exists pnl_categories_select_own on public.pnl_categories;
drop policy if exists pnl_categories_insert_own on public.pnl_categories;
drop policy if exists pnl_categories_update_own on public.pnl_categories;
drop policy if exists pnl_categories_delete_own on public.pnl_categories;

create policy pnl_categories_select_own on public.pnl_categories
  for select to authenticated
  using (user_id = auth.uid() and exists (
    select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()
  ));

create policy pnl_categories_insert_own on public.pnl_categories
  for insert to authenticated
  with check (user_id = auth.uid() and exists (
    select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()
  ));

create policy pnl_categories_update_own on public.pnl_categories
  for update to authenticated
  using (user_id = auth.uid() and exists (
    select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()
  ))
  with check (user_id = auth.uid() and exists (
    select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()
  ));

create policy pnl_categories_delete_own on public.pnl_categories
  for delete to authenticated
  using (user_id = auth.uid() and exists (
    select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()
  ));

drop policy if exists budgets_select_own on public.budgets;
drop policy if exists budgets_insert_own on public.budgets;
drop policy if exists budgets_update_own on public.budgets;
drop policy if exists budgets_delete_own on public.budgets;

create policy budgets_select_own on public.budgets
  for select to authenticated
  using (user_id = auth.uid() and exists (
    select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()
  ));

create policy budgets_insert_own on public.budgets
  for insert to authenticated
  with check (user_id = auth.uid() and exists (
    select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()
  ));

create policy budgets_update_own on public.budgets
  for update to authenticated
  using (user_id = auth.uid() and exists (
    select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()
  ))
  with check (user_id = auth.uid() and exists (
    select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()
  ));

create policy budgets_delete_own on public.budgets
  for delete to authenticated
  using (user_id = auth.uid() and exists (
    select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()
  ));

drop policy if exists savings_goals_select_own on public.savings_goals;
drop policy if exists savings_goals_insert_own on public.savings_goals;
drop policy if exists savings_goals_update_own on public.savings_goals;
drop policy if exists savings_goals_delete_own on public.savings_goals;

create policy savings_goals_select_own on public.savings_goals
  for select to authenticated
  using (user_id = auth.uid() and exists (
    select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()
  ));

create policy savings_goals_insert_own on public.savings_goals
  for insert to authenticated
  with check (user_id = auth.uid() and exists (
    select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()
  ));

create policy savings_goals_update_own on public.savings_goals
  for update to authenticated
  using (user_id = auth.uid() and exists (
    select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()
  ))
  with check (user_id = auth.uid() and exists (
    select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()
  ));

create policy savings_goals_delete_own on public.savings_goals
  for delete to authenticated
  using (user_id = auth.uid() and exists (
    select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()
  ));

insert into public.workspaces (user_id, name, is_default)
select u.id, 'Personal', true
from auth.users u
where not exists (
  select 1 from public.workspaces w where w.user_id = u.id and w.is_default = true
);
