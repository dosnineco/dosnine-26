-- Migration: page_clicks table + indexes + daily_analytics view
CREATE TABLE IF NOT EXISTS public.page_clicks (
  id uuid not null default gen_random_uuid (),
  path text not null,
  source text null,
  referrer text null,
  user_agent text null,
  ip_address text null,
  session_id text null,
  property_id uuid null,
  created_at timestamp with time zone null default now(),
  constraint page_clicks_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists page_clicks_source_idx on public.page_clicks using btree (source) TABLESPACE pg_default;

create index IF not exists page_clicks_created_at_idx on public.page_clicks using btree (created_at desc) TABLESPACE pg_default;

create index IF not exists page_clicks_path_idx on public.page_clicks using btree (path) TABLESPACE pg_default;

-- daily_analytics view
create or replace view public.daily_analytics as
select
  date (created_at) as date,
  path,
  source,
  count(*) as click_count,
  count(distinct session_id) as unique_sessions
from
  page_clicks
group by
  (date (created_at)),
  path,
  source
order by
  (date (created_at)) desc,
  (count(*)) desc;

-- Notes:
-- Apply this migration in your Supabase SQL editor (or via your migration tooling).
-- If you enable RLS, ensure you create a safe INSERT policy for anonymous tracking or insert via a secure server-side key.
