-- Execute este esquema em um NOVO projeto Supabase do Abo Launch.
-- Tokens não são expostos ao cliente; somente rotas de servidor usam a service role.

create table public.tiktok_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  app_id text not null,
  access_token_ciphertext text not null,
  refresh_token_ciphertext text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  authorized_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tiktok_business_centers (
  user_id uuid not null references auth.users(id) on delete cascade,
  bc_id text not null,
  bc_name text not null,
  is_selected boolean not null default false,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, bc_id)
);

create table public.launch_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  advertiser_id text not null,
  account_currency text not null check (char_length(account_currency) = 3),
  input_currency text not null check (char_length(input_currency) = 3),
  conversion_rate numeric(18, 8) not null check (conversion_rate > 0),
  budget_per_adgroup numeric(18, 2) not null check (budget_per_adgroup > 0),
  campaign_count integer not null check (campaign_count > 0),
  adgroups_per_campaign integer not null check (adgroups_per_campaign > 0),
  ads_per_adgroup integer not null check (ads_per_adgroup > 0),
  payload jsonb not null,
  status text not null check (status in ('draft', 'queued', 'running', 'completed', 'failed', 'partial')),
  confirmation_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.launch_logs (
  id bigint generated always as identity primary key,
  launch_job_id uuid not null references public.launch_jobs(id) on delete cascade,
  level text not null check (level in ('info', 'warning', 'success', 'error')),
  stage text not null check (stage in ('preflight', 'campaign', 'adgroup', 'ad', 'monitoring')),
  message text not null,
  tiktok_entity_id text,
  data jsonb,
  created_at timestamptz not null default now()
);

alter table public.tiktok_connections enable row level security;
alter table public.tiktok_business_centers enable row level security;
alter table public.launch_jobs enable row level security;
alter table public.launch_logs enable row level security;

-- A connection nunca sai pelo Data API; rotas de servidor usam a service role.
revoke all on table public.tiktok_connections from anon, authenticated;
revoke all on table public.tiktok_business_centers from anon, authenticated;
create policy "Connections stay server-only" on public.tiktok_connections for select to authenticated using (false);

create index launch_jobs_user_id_idx on public.launch_jobs (user_id);
create index launch_logs_launch_job_id_idx on public.launch_logs (launch_job_id);
create index tiktok_business_centers_user_selection_idx on public.tiktok_business_centers (user_id, is_selected);

create policy "Users can read their launch jobs" on public.launch_jobs for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their launch drafts" on public.launch_jobs for insert to authenticated with check ((select auth.uid()) = user_id and status = 'draft');
create policy "Users can update their launch drafts" on public.launch_jobs for update to authenticated using ((select auth.uid()) = user_id and status = 'draft') with check ((select auth.uid()) = user_id and status = 'draft');
create policy "Users can read logs from their launches" on public.launch_logs for select to authenticated using (exists (select 1 from public.launch_jobs j where j.id = launch_job_id and j.user_id = (select auth.uid())));
