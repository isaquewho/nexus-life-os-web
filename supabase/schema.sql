-- =====================================================
-- NEXUS LIFE OS — Database Schema
-- Run this in Supabase SQL Editor
-- (Tabelas base: transactions, habits, habit_logs, 
--  goals, goal_contributions, profiles, allowed_emails
--  já existem no Supabase)
-- =====================================================

-- ──────────────────────────────────────────────────
-- 1. financial_config
-- ──────────────────────────────────────────────────
create table if not exists financial_config (
  id         uuid default gen_random_uuid() primary key,
  uid        uuid references auth.users not null unique,
  salary     numeric default 0,
  updated_at timestamp default now()
);

-- ──────────────────────────────────────────────────
-- 2. fixed_expenses
-- ──────────────────────────────────────────────────
create table if not exists fixed_expenses (
  id         uuid default gen_random_uuid() primary key,
  uid        uuid references auth.users not null,
  name       text not null,
  amount     numeric not null,
  category   text not null default 'outros',
  is_active  boolean default true,
  created_at timestamp default now()
);

-- ──────────────────────────────────────────────────
-- 3. Colunas adicionais em transactions
-- ──────────────────────────────────────────────────
-- Camada da transação (fixed | extra | variable)
alter table transactions 
  add column if not exists transaction_layer text default 'variable';

-- Recorrência
alter table transactions
  add column if not exists is_recurring boolean default false;

alter table transactions
  add column if not exists recurring_day int; -- dia do mês (1-28)

alter table transactions
  add column if not exists recurring_source_id uuid references transactions(id) on delete set null;

alter table transactions
  add column if not exists last_generated date; -- data da última geração

-- ──────────────────────────────────────────────────
-- 4. Onboarding em profiles
-- ──────────────────────────────────────────────────
alter table profiles
  add column if not exists onboarding_complete boolean default false;

-- ──────────────────────────────────────────────────
-- 5. Invite codes (usado no registro com código)
-- ──────────────────────────────────────────────────
create table if not exists invite_codes (
  id        uuid default gen_random_uuid() primary key,
  code      text unique not null,
  is_active boolean default true,
  max_uses  int default 1,
  use_count int default 0,
  created_at timestamp default now()
);

alter table invite_codes enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = current_schema()
      and tablename = 'invite_codes'
      and policyname = 'public can validate invite codes'
  ) then
    execute 'create policy "public can validate invite codes"
      on invite_codes for select using (true)';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = current_schema()
      and tablename = 'invite_codes'
      and policyname = 'auth users can create invite codes'
  ) then
    execute 'create policy "auth users can create invite codes"
      on invite_codes for insert with check (auth.role() = ''authenticated'')';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = current_schema()
      and tablename = 'invite_codes'
      and policyname = 'auth users can use invite codes'
  ) then
    execute 'create policy "auth users can use invite codes"
      on invite_codes for update using (auth.role() = ''authenticated'')';
  end if;
end $$;

-- ──────────────────────────────────────────────────
-- 5. Enable RLS
-- ──────────────────────────────────────────────────
alter table financial_config enable row level security;
alter table fixed_expenses   enable row level security;

-- ──────────────────────────────────────────────────
-- 6. RLS Policies
-- ──────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = current_schema()
      and tablename = 'financial_config'
      and policyname = 'users own financial_config'
  ) then
    execute 'create policy "users own financial_config" on financial_config
      for all using (auth.uid() = uid)';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = current_schema()
      and tablename = 'fixed_expenses'
      and policyname = 'users own fixed_expenses'
  ) then
    execute 'create policy "users own fixed_expenses" on fixed_expenses
      for all using (auth.uid() = uid)';
  end if;
end $$;

-- ──────────────────────────────────────────────────
-- 7. Indexes for performance
-- ──────────────────────────────────────────────────
create index if not exists idx_fixed_expenses_uid    on fixed_expenses(uid);
create index if not exists idx_fixed_expenses_active on fixed_expenses(uid, is_active);
create index if not exists idx_transactions_layer    on transactions(uid, transaction_layer);
create index if not exists idx_transactions_recurring on transactions(uid, is_recurring)
  where is_recurring = true;
create index if not exists idx_transactions_recurring_source on transactions(uid, recurring_source_id);
