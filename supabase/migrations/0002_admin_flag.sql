-- Marks an account as exempt from future credit/trial-limit checks.
-- No enforcement logic reads this yet (credits/trial limiting is a separate,
-- not-yet-built feature) — this just makes the flag exist ahead of that work.
alter table users_profile add column if not exists is_admin boolean not null default false;
