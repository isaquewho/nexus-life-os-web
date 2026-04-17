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
  add column if not exists last_generated date; -- data da última geração

-- ──────────────────────────────────────────────────
-- 4. Onboarding em profiles
-- ──────────────────────────────────────────────────
alter table profiles
  add column if not exists onboarding_complete boolean default false;

-- ──────────────────────────────────────────────────
-- 5. Enable RLS
-- ──────────────────────────────────────────────────
alter table financial_config enable row level security;
alter table fixed_expenses   enable row level security;

-- ──────────────────────────────────────────────────
-- 6. RLS Policies
-- ──────────────────────────────────────────────────
create policy if not exists "users own financial_config" on financial_config
  for all using (auth.uid() = uid);

create policy if not exists "users own fixed_expenses" on fixed_expenses
  for all using (auth.uid() = uid);

-- ──────────────────────────────────────────────────
-- 7. Indexes for performance
-- ──────────────────────────────────────────────────
create index if not exists idx_fixed_expenses_uid    on fixed_expenses(uid);
create index if not exists idx_fixed_expenses_active on fixed_expenses(uid, is_active);
create index if not exists idx_transactions_layer    on transactions(uid, transaction_layer);
create index if not exists idx_transactions_recurring on transactions(uid, is_recurring)
  where is_recurring = true;
