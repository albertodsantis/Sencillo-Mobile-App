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
