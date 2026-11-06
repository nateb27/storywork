-- Storywork: purchases and progress.
-- Run once in the Supabase SQL editor (or `supabase db push`).

-- Purchases are written by the Stripe webhook with the service role.
-- One checkout can buy both products, so a purchase is unique per
-- (Stripe session, product); a retried webhook hits that constraint.
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email)),
  product text not null check (product in ('challenge', 'addon')),
  stripe_session_id text not null,
  amount_cents integer,
  created_at timestamptz not null default now(),
  unique (stripe_session_id, product)
);
create index if not exists purchases_email_idx on public.purchases (email);

-- Members can't read purchases directly; the server reads them with the
-- service role. RLS on with no policies means "service role only".
alter table public.purchases enable row level security;

-- Progress: one row per finished day, readable and writable only by
-- its owner.
create table if not exists public.progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  day integer not null check (day between 1 and 15),
  completed_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.progress enable row level security;

drop policy if exists "read own progress" on public.progress;
create policy "read own progress" on public.progress
  for select using (auth.uid() = user_id);

drop policy if exists "insert own progress" on public.progress;
create policy "insert own progress" on public.progress
  for insert with check (auth.uid() = user_id);

drop policy if exists "delete own progress" on public.progress;
create policy "delete own progress" on public.progress
  for delete using (auth.uid() = user_id);
