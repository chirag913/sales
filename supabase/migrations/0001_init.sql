-- Cold Call Trainer: initial schema for auth-backed persistence.
-- users_profile: one row per auth user, holds the future credits balance.
-- training_profiles: the SalesProfile/TrainingProfile/scenarios data that
--   today lives only in localStorage (src/lib/storage/local*.ts).
-- calls: one row per scored call.

create table if not exists users_profile (
  id uuid references auth.users on delete cascade primary key,
  credits_balance integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists training_profiles (
  user_id uuid references auth.users on delete cascade primary key,
  sales_profile jsonb,
  training_profile jsonb,
  scenarios jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  created_at timestamptz not null default now(),
  scenario jsonb not null,
  identity jsonb not null,
  duration_seconds integer not null,
  overall_score integer not null,
  categories jsonb not null,
  metrics jsonb not null,
  biggest_mistake text not null,
  best_moment text not null,
  better_responses jsonb not null,
  transcript jsonb not null,
  objection_tags text[] not null default '{}'
);

create index if not exists calls_user_id_created_at_idx on calls (user_id, created_at desc);

-- Auto-create a users_profile row whenever a new auth user signs up, so
-- credits_balance has somewhere to live from the start.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users_profile (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

alter table users_profile enable row level security;
alter table training_profiles enable row level security;
alter table calls enable row level security;

create policy "users_profile: select own" on users_profile
  for select using (auth.uid() = id);
create policy "users_profile: insert own" on users_profile
  for insert with check (auth.uid() = id);
create policy "users_profile: update own" on users_profile
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "training_profiles: select own" on training_profiles
  for select using (auth.uid() = user_id);
create policy "training_profiles: insert own" on training_profiles
  for insert with check (auth.uid() = user_id);
create policy "training_profiles: update own" on training_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "calls: select own" on calls
  for select using (auth.uid() = user_id);
create policy "calls: insert own" on calls
  for insert with check (auth.uid() = user_id);
create policy "calls: update own" on calls
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
