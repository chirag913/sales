-- Server-brokered realtime calls (see src/app/api/realtime/session/route.ts).
--
-- The server now performs the WebRTC handshake with OpenAI itself, so it
-- knows the provider's call id and can hang the call up when the per-call
-- time cap is exceeded, instead of trusting the browser's own countdown.
-- provider_call_id is that id; provider_hung_up_at records that the server
-- has already ended it (so the backstop reaper never repeats the request).
alter table call_sessions add column if not exists provider_call_id text;
alter table call_sessions add column if not exists provider_hung_up_at timestamptz;

-- Owner-checked, same pattern as mark_call_started(): a user can only attach
-- an id to their own reserved/started session, and only once.
create or replace function attach_provider_call(p_call_id uuid, p_provider_call_id text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update call_sessions
  set provider_call_id = p_provider_call_id
  where id = p_call_id
    and user_id = auth.uid()
    and status in ('reserved', 'started')
    and provider_call_id is null;
end;
$$;

grant execute on function attach_provider_call(uuid, text) to authenticated;

-- Extra per-call result data that did not exist when `calls` was created:
-- the objective outcome, the "work on this next" list and how the call
-- ended. jsonb so the result shape can grow without further migrations.
alter table calls add column if not exists extra jsonb;
