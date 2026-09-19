-- Public landing-page lead capture (see src/app/api/leads/route.ts).
--
-- Written ONLY by the server route using the service role, after server-side
-- validation. RLS is enabled with no policies and every grant is revoked from
-- anon/authenticated, so neither the anon key nor a signed-in user can read
-- or write these tables directly. Read them from the Supabase dashboard or a
-- service-role script.

create table if not exists landing_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  business_name text not null,
  -- Normalized (E.164, e.g. +919876543210). The form has a single
  -- "Phone / WhatsApp" field; whatsapp is stored separately so a future
  -- WhatsApp integration can diverge from the voice number without a migration.
  phone text not null,
  whatsapp text,
  what_they_sell text not null,
  monthly_leads text check (monthly_leads in ('under_50', '50_200', '200_1000', '1000_5000', '5000_plus', 'not_sure')),
  lead_sources text[] not null default '{}',
  -- custom_demo_requested: wants a custom AI call experience for their business.
  -- talk_to_team: wants the team to get in touch.
  intent text not null check (intent in ('custom_demo_requested', 'talk_to_team')),
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'closed', 'spam')),
  source_page text,
  utm jsonb not null default '{}'::jsonb,
  -- The form tells the visitor we may contact them by phone/WhatsApp; this
  -- records when they submitted with that notice shown.
  contact_consent_at timestamptz not null default now(),
  -- Reserved for the future AI qualifier's structured answers, and for the team.
  ai_qualification jsonb,
  notes text
);

create index if not exists landing_leads_created_at_idx on landing_leads (created_at desc);
create index if not exists landing_leads_phone_intent_idx on landing_leads (phone, intent, created_at desc);

alter table landing_leads enable row level security;
revoke all on landing_leads from anon, authenticated;

-- Abuse protection for the public form. Unlike api_rate_limits (0009), which
-- is keyed by signed-in user, visitors are anonymous, so this is keyed by an
-- opaque string the server derives (a salted hash of the client IP + route).
-- Same fixed-window, row-locked upsert as check_rate_limit().
create table if not exists public_rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  request_count integer not null default 0
);

alter table public_rate_limits enable row level security;
revoke all on public_rate_limits from anon, authenticated;

create or replace function check_public_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public_rate_limits (key, window_start, request_count)
  values (p_key, now(), 1)
  on conflict (key) do update
    set request_count = case
          when public_rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
            then 1
          else public_rate_limits.request_count + 1
        end,
        window_start = case
          when public_rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
            then now()
          else public_rate_limits.window_start
        end
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$$;

-- Server-only: the route calls this with the service role.
revoke execute on function check_public_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function check_public_rate_limit(text, integer, integer) to service_role;
