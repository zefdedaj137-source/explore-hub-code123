-- Admin users
create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table admin_users enable row level security;

DROP POLICY IF EXISTS "admin can view own admin row" ON admin_users;
DROP POLICY IF EXISTS "admin can view own admin row" ON admin_users;
create policy "admin can view own admin row"
  on admin_users for select
  using (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin can insert own admin row" ON admin_users;
DROP POLICY IF EXISTS "admin can insert own admin row" ON admin_users;
create policy "admin can insert own admin row"
  on admin_users for insert
  with check (auth.uid() = user_id);

-- Reports status fields
alter table reports add column if not exists status text not null default 'pending' check (status in ('pending','reviewed','closed'));
alter table reports add column if not exists resolved_at timestamptz;

DROP POLICY IF EXISTS "admin can view all reports" ON reports;
DROP POLICY IF EXISTS "admin can view all reports" ON reports;
create policy "admin can view all reports"
  on reports for select
  using (exists (select 1 from admin_users where user_id = auth.uid()));

DROP POLICY IF EXISTS "admin can update reports" ON reports;
DROP POLICY IF EXISTS "admin can update reports" ON reports;
create policy "admin can update reports"
  on reports for update
  using (exists (select 1 from admin_users where user_id = auth.uid()));

-- Data requests admin policies
DROP POLICY IF EXISTS "admin can view all data requests" ON data_requests;
DROP POLICY IF EXISTS "admin can view all data requests" ON data_requests;
create policy "admin can view all data requests"
  on data_requests for select
  using (exists (select 1 from admin_users where user_id = auth.uid()));

DROP POLICY IF EXISTS "admin can update data requests" ON data_requests;
DROP POLICY IF EXISTS "admin can update data requests" ON data_requests;
create policy "admin can update data requests"
  on data_requests for update
  using (exists (select 1 from admin_users where user_id = auth.uid()));

-- Push subscriptions
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

DROP POLICY IF EXISTS "user can manage own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "user can manage own push subscriptions" ON push_subscriptions;
create policy "user can manage own push subscriptions"
  on push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Wallets
create table if not exists wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles(id) on delete cascade,
  balance integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table wallets enable row level security;

DROP POLICY IF EXISTS "user can view own wallet" ON wallets;
DROP POLICY IF EXISTS "user can view own wallet" ON wallets;
create policy "user can view own wallet"
  on wallets for select
  using (auth.uid() = user_id);

DROP POLICY IF EXISTS "user can update own wallet" ON wallets;
DROP POLICY IF EXISTS "user can update own wallet" ON wallets;
create policy "user can update own wallet"
  on wallets for update
  using (auth.uid() = user_id);

DROP POLICY IF EXISTS "user can insert own wallet" ON wallets;
DROP POLICY IF EXISTS "user can insert own wallet" ON wallets;
create policy "user can insert own wallet"
  on wallets for insert
  with check (auth.uid() = user_id);

-- Wallet transactions
create table if not exists wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  amount integer not null,
  type text not null check (type in ('purchase','spend','grant')),
  item text,
  created_at timestamptz not null default now()
);

alter table wallet_transactions enable row level security;

DROP POLICY IF EXISTS "user can view own wallet transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "user can view own wallet transactions" ON wallet_transactions;
create policy "user can view own wallet transactions"
  on wallet_transactions for select
  using (auth.uid() = user_id);

DROP POLICY IF EXISTS "user can insert own wallet transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "user can insert own wallet transactions" ON wallet_transactions;
create policy "user can insert own wallet transactions"
  on wallet_transactions for insert
  with check (auth.uid() = user_id);

-- Experiments
create table if not exists experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  key text not null,
  variant text not null,
  created_at timestamptz not null default now()
);

alter table experiments enable row level security;

DROP POLICY IF EXISTS "user can manage own experiments" ON experiments;
DROP POLICY IF EXISTS "user can manage own experiments" ON experiments;
create policy "user can manage own experiments"
  on experiments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
