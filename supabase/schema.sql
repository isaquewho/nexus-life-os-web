-- =====================================================
-- NEXUS LIFE OS — New Tables SQL
-- Run this in Supabase SQL Editor
-- (Existing tables like transactions, habits, 
--  habit_logs, goals, etc. are already created)
-- =====================================================

-- 1. financial_config
create table if not exists financial_config (
  id uuid default gen_random_uuid() primary key,
  uid uuid references auth.users not null unique,
  salary numeric default 0,
  updated_at timestamp default now()
);

-- 2. fixed_expenses
create table if not exists fixed_expenses (
  id uuid default gen_random_uuid() primary key,
  uid uuid references auth.users not null,
  name text not null,
  amount numeric not null,
  category text not null default 'outros',
  is_active boolean default true,
  created_at timestamp default now()
);

-- 3. Add transaction_layer column to transactions
alter table transactions 
  add column if not exists transaction_layer text default 'variable';

-- 4. Add pluggy_id for bank transaction deduplication (webhook sync)
alter table transactions
  add column if not exists pluggy_id text unique;

-- Index for fast pluggy_id lookups
create index if not exists idx_transactions_pluggy_id on transactions(pluggy_id)
  where pluggy_id is not null;

-- 4. Enable RLS
alter table financial_config enable row level security;
alter table fixed_expenses enable row level security;

-- 5. RLS Policies
create policy "users own financial_config" on financial_config
  for all using (auth.uid() = uid);

create policy "users own fixed_expenses" on fixed_expenses
  for all using (auth.uid() = uid);

-- 6. Indexes for performance
create index if not exists idx_fixed_expenses_uid on fixed_expenses(uid);
create index if not exists idx_fixed_expenses_active on fixed_expenses(uid, is_active);
create index if not exists idx_transactions_layer on transactions(uid, transaction_layer);
