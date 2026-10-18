create table if not exists public.verification_sessions (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  short_code text not null check (short_code ~ '^[0-9]{6}$'),
  user_clerk_id text not null,
  verification_type text not null check (verification_type = 'identity'),
  context_id text,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'mobile_opened', 'completed', 'cancelled')),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  opened_at timestamptz,
  completed_at timestamptz,
  ip_desktop text,
  ip_mobile text,
  user_agent_mobile text,
  email_sent_at timestamptz,
  email_sent_to text,
  email_send_count integer not null default 0 check (email_send_count >= 0),
  created_at timestamptz not null default now()
);

create unique index if not exists verification_sessions_active_code_idx
  on public.verification_sessions (short_code)
  where status in ('pending', 'mobile_opened');

create index if not exists verification_sessions_user_created_idx
  on public.verification_sessions (user_clerk_id, created_at desc);

alter table public.verification_sessions enable row level security;